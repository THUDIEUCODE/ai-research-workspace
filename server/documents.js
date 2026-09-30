import { fork } from "node:child_process";
import { AppError } from "./errors.js";

export async function extractText(file, signal) {
  if (!file || !file.size)
    throw new AppError("FILE_EMPTY", "Tệp rỗng. Chọn tệp có văn bản.");
  if (file.size > 5 * 1024 * 1024)
    throw new AppError("FILE_LIMIT", "Tệp vượt giới hạn 5 MB.", 413);
  if (/\.txt$/i.test(file.originalname)) {
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
    } catch {
      throw new AppError(
        "TXT_ENCODING",
        "TXT không đọc được bằng UTF-8. Hãy lưu lại với mã hóa UTF-8.",
      );
    }
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text) || text.startsWith("%PDF-"))
      throw new AppError(
        "TXT_INVALID",
        "Tệp có dữ liệu nhị phân hoặc sai nội dung TXT. Hãy dùng văn bản thuần UTF-8.",
      );
    if (!text.trim())
      throw new AppError(
        "FILE_EMPTY",
        "Tệp không có văn bản. Chọn tệp có nội dung.",
      );
    return text.trim();
  }
  if (
    !/\.pdf$/i.test(file.originalname) ||
    !file.buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))
  )
    throw new AppError(
      "FILE_FORMAT",
      "Nội dung tệp không đúng định dạng PDF/TXT. Không chỉ đổi phần mở rộng của tệp.",
    );
  return new Promise((resolve, reject) => {
    // Process riêng cô lập cả lỗi native của thư viện PDF trên Windows.
    const worker = fork(new URL("./pdfWorker.js", import.meta.url), [], {
      serialization: "advanced",
      execArgv: ["--max-old-space-size=128"],
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      windowsHide: true,
    });
    let settled = false;
    const finish = (error, text) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      worker.kill();
      if (error) reject(error);
      else resolve(text);
    };
    const cancel = () =>
      finish(new AppError("CANCELLED", "Đã dừng đọc tài liệu.", 499));
    const timer = setTimeout(
      () =>
        finish(
          new AppError(
            "PDF_TIMEOUT",
            "PDF đọc quá lâu. Thử tệp nhỏ hơn hoặc xuất lại thành TXT.",
            408,
          ),
        ),
      15000,
    );
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) cancel();
    worker.on("message", (result) => {
      // Node --watch cũng gửi IPC watch:import; chỉ nhận kết quả của worker PDF.
      if (result?.type !== "pdf-result") return;
      const messages = {
        PDF_PASSWORD: "PDF có mật khẩu. Hãy mở khóa rồi tải lại.",
        PDF_PAGES: "PDF vượt 100 trang. Chọn một phần tài liệu ngắn hơn.",
        PDF_INVALID:
          "PDF bị hỏng hoặc không đọc được. Hãy xuất lại PDF hoặc dùng TXT.",
      };
      if (result.code)
        finish(
          new AppError(
            result.code,
            messages[result.code] || messages.PDF_INVALID,
          ),
        );
      else if (typeof result.text !== "string")
        finish(
          new AppError(
            "PDF_INVALID",
            "Tiến trình đọc PDF trả kết quả không hợp lệ. Hãy thử lại hoặc xuất lại PDF.",
          ),
        );
      else if (!result.text.trim())
        finish(
          new AppError(
            "PDF_NO_TEXT",
            "Đã đọc PDF nhưng không trích xuất được văn bản. Tệp có thể là bản scan hoặc dùng cách mã hóa chữ không được hỗ trợ; chưa hỗ trợ OCR. Hãy thử xuất lại PDF hoặc dùng TXT.",
          ),
        );
      else finish(null, result.text);
    });
    worker.on("error", () =>
      finish(
        new AppError(
          "PDF_INVALID",
          "Không đọc được PDF trong giới hạn tài nguyên. Hãy dùng PDF nhỏ hơn hoặc TXT.",
        ),
      ),
    );
    worker.on("exit", () => {
      if (!settled)
        finish(
          new AppError(
            "PDF_INVALID",
            "Tiến trình đọc PDF đã dừng. Hãy xuất lại tệp.",
          ),
        );
    });
    if (!settled) worker.send(file.buffer);
  });
}
