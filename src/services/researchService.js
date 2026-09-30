import { isAnswer } from "../../shared/answer.js";
export { answerToText } from "../../shared/answer.js";

export class ApiError extends Error {
  constructor(message, code = "NETWORK") {
    super(message);
    this.code = code;
  }
}

export async function checkResponse(response) {
  if (response.ok) return;
  let data;
  try {
    data = await response.json();
  } catch {
    /* Proxy có thể trả HTML khi backend tắt. */
  }
  throw new ApiError(
    data?.message ||
      "Không kết nối được backend. Hãy kiểm tra server và mạng rồi thử lại.",
    data?.code,
  );
}

// Ghép network chunks thành dòng hoàn chỉnh, rồi mới JSON.parse.
export async function readEvents(response, onEvent) {
  await checkResponse(response);
  if (
    !response.body ||
    !response.headers.get("content-type")?.includes("application/x-ndjson")
  )
    throw new ApiError(
      "Backend không trả luồng dữ liệu hợp lệ.",
      "INVALID_STREAM",
    );
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let complete = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          throw new ApiError(
            "Stream có dữ liệu không hợp lệ. Hãy thử lại.",
            "INVALID_STREAM",
          );
        }
        if (event.type === "error")
          throw new ApiError(
            event.message || "Stream bị lỗi. Hãy thử lại.",
            event.code,
          );
        if (!["status", "data", "complete"].includes(event.type) || complete)
          throw new ApiError(
            "Thứ tự sự kiện stream không hợp lệ.",
            "INVALID_STREAM",
          );
        onEvent(event);
        if (event.type === "complete") complete = true;
      }
      if (buffer.length > 256000)
        throw new ApiError("Sự kiện stream vượt giới hạn.", "INVALID_STREAM");
      if (done) break;
    }
    if (buffer.trim() || !complete)
      throw new ApiError(
        "Kết nối bị ngắt trước khi hoàn tất. Nội dung đã nhận được giữ lại; hãy thử lại.",
        "STREAM_INTERRUPTED",
      );
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function errorMessage(error) {
  if (error.name === "AbortError")
    return "Đã dừng tạo câu trả lời. Nội dung này chưa hoàn tất.";
  if (error.name === "TimeoutError")
    return "Quá thời gian chờ. Kiểm tra mạng/backend rồi thử lại.";
  return error instanceof ApiError
    ? error.message
    : "Mất kết nối hoặc backend chưa chạy. Kiểm tra mạng và khởi động backend rồi thử lại.";
}

export async function apiJSON(path, { token, signal, ...options } = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(35000)])
      : AbortSignal.timeout(35000),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  await checkResponse(response);
  return response.status === 204 ? null : response.json();
}

export async function uploadDocument(file, { token, signal, onProcessing }) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/documents", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.any([signal, AbortSignal.timeout(35000)]),
  });
  let document;
  await readEvents(response, (event) => {
    if (event.type === "status") onProcessing();
    if (event.type === "complete") document = event.document;
  });
  if (!document?.id)
    throw new ApiError(
      "Backend chưa xác nhận tài liệu sẵn sàng.",
      "INVALID_STREAM",
    );
  return document;
}

export async function getResearchAnswer({
  token,
  question,
  documentIds,
  history,
  signal,
  onData,
  onStatus,
}) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question, documentIds, history }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(100000)]),
  });
  let answer;
  await readEvents(response, (event) => {
    if (event.type === "status") onStatus?.(event.status);
    if (event.type === "data") {
      if (!isAnswer(event.answer))
        throw new ApiError("Dữ liệu streaming sai cấu trúc.", "INVALID_ANSWER");
      onData(event.answer);
    }
    if (event.type === "complete") {
      if (!isAnswer(event.answer))
        throw new ApiError(
          "Kết quả cuối sai cấu trúc. Hãy thử lại.",
          "INVALID_ANSWER",
        );
      answer = event.answer;
    }
  });
  if (!answer)
    throw new ApiError(
      "Chưa nhận được kết quả hoàn chỉnh.",
      "STREAM_INTERRUPTED",
    );
  return answer;
}
