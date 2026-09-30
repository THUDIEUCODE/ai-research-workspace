export class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function publicError(error) {
  if (error instanceof AppError)
    return { code: error.code, message: error.message, status: error.status };
  if (error?.name === "MulterError")
    return {
      code: "FILE_LIMIT",
      message:
        "Chỉ tải một tệp mỗi yêu cầu, tối đa 5 MB. Mỗi phiên có tối đa 3 tệp.",
      status: 413,
    };
  if (error?.type === "entity.too.large")
    return {
      code: "CONTEXT_LIMIT",
      message: "Yêu cầu quá lớn. Giảm tài liệu hoặc bắt đầu hội thoại mới.",
      status: 413,
    };
  // ApiError của Gemini có thể chứa JSON đầy đủ trong message. Chỉ dùng để phân loại,
  // không chuyển message gốc (có thể chứa dữ liệu nhạy cảm) ra UI/log.
  let details = error?.error || {};
  if (typeof error?.message === "string") {
    try {
      details = JSON.parse(error.message).error || details;
    } catch {
      /* Message văn bản thuần. */
    }
  }
  const status = Number(error?.status || details.code);
  const description = typeof error?.message === "string" ? error.message : "";
  const invalidKey =
    details.details?.some?.((item) =>
      [
        "API_KEY_INVALID",
        "API_KEY_EXPIRED",
        "API_KEY_SERVICE_BLOCKED",
      ].includes(item.reason),
    ) ||
    /API key (not valid|expired|invalid)|API_KEY_INVALID/i.test(description);
  if (status === 401 || invalidKey)
    return {
      code: "AI_AUTH",
      message:
        "Gemini API key không hợp lệ hoặc đã hết hạn. Kiểm tra GEMINI_API_KEY trong .env rồi khởi động lại backend.",
      status: 502,
    };
  if (status === 403)
    return {
      code: "AI_PERMISSION",
      message:
        "Gemini từ chối quyền truy cập key/project hoặc model. Kiểm tra quyền và giới hạn key trong Google AI Studio; ứng dụng không tự bật thanh toán.",
      status: 502,
    };
  if (status === 429)
    return {
      code: "AI_LIMIT",
      message:
        "Gemini đã hết hạn mức Free Tier hoặc bị giới hạn tốc độ. Đợi ít nhất 60 giây, kiểm tra quota trong Google AI Studio; nếu hết quota ngày, đợi quota được cấp lại. Không tự thử liên tục hoặc chuyển sang trả phí.",
      status: 429,
    };
  if (status === 404)
    return {
      code: "AI_MODEL",
      message:
        "Không tìm thấy model Gemini hoặc project chưa được truy cập. Kiểm tra GEMINI_MODEL trong .env và model khả dụng trong Google AI Studio.",
      status: 502,
    };
  if (
    status === 400 &&
    /input token|context length|token count.*exceed/i.test(description)
  )
    return {
      code: "CONTEXT_LIMIT",
      message:
        "Context vượt giới hạn model. Giảm tài liệu hoặc bắt đầu hội thoại mới.",
      status: 413,
    };
  if (status === 408 || status === 504 || error?.name === "TimeoutError")
    return {
      code: "TIMEOUT",
      message: "Yêu cầu quá thời gian chờ. Hãy thử lại với ít tài liệu hơn.",
      status: 504,
    };
  if (error?.name === "ZodError" || error instanceof SyntaxError)
    return {
      code: "INVALID_ANSWER",
      message:
        "AI chưa trả đủ kết quả đúng cấu trúc. Hãy thử lại hoặc hỏi ngắn hơn.",
      status: 502,
    };
  if (
    status === 400 &&
    (details.status === "FAILED_PRECONDITION" ||
      /free tier|billing|location.*support/i.test(description))
  )
    return {
      code: "AI_FREE_TIER_UNAVAILABLE",
      message:
        "Free Tier chưa khả dụng cho project/khu vực này. Kiểm tra điều kiện sử dụng trong Google AI Studio. Ứng dụng sẽ dừng, không bật thanh toán.",
      status: 502,
    };
  if (status === 400)
    return {
      code: "AI_REQUEST",
      message:
        "Gemini từ chối cấu hình yêu cầu. Kiểm tra model có hỗ trợ streaming và structured output; đây không phải thông báo hết quota.",
      status: 502,
    };
  if (status >= 500)
    return {
      code: "AI_UNAVAILABLE",
      message:
        "Dịch vụ Gemini tạm thời không khả dụng. Đợi một lúc rồi thử lại; không có đáp án mẫu thay thế.",
      status: 502,
    };
  if (
    error?.name === "TypeError" ||
    /fetch failed|network|ECONNRESET|ENOTFOUND/i.test(description)
  )
    return {
      code: "AI_NETWORK",
      message:
        "Backend mất kết nối tới Gemini. Kiểm tra mạng rồi thử lại; phần đã nhận chưa hoàn tất.",
      status: 502,
    };
  return {
    code: "REQUEST_FAILED",
    message:
      "Không thể xử lý yêu cầu. Kiểm tra kết nối backend/API rồi thử lại.",
    status: 502,
  };
}
