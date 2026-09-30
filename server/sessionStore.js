import { randomBytes } from "node:crypto";
import { AppError } from "./errors.js";

export function createSessionStore({
  ttlMs = 60 * 60 * 1000,
  maxSessions = 50,
  maxBytes = 32 * 1024 * 1024,
  now = Date.now,
} = {}) {
  const sessions = new Map();
  function sweep() {
    for (const [id, session] of sessions)
      if (session.expiresAt <= now()) {
        session.controller?.abort();
        sessions.delete(id);
      }
  }
  function get(id) {
    sweep();
    const session = sessions.get(id);
    if (!session)
      throw new AppError(
        "SESSION_EXPIRED",
        "Phiên đã hết hạn hoặc máy chủ đã khởi động lại. Lịch sử vẫn xem được; tạo phiên mới và tải lại tài liệu để tiếp tục.",
        401,
      );
    return session;
  }
  function create() {
    sweep();
    if (sessions.size >= maxSessions)
      throw new AppError(
        "SERVER_BUSY",
        "Máy chủ đã đủ số phiên. Vui lòng thử lại sau.",
        503,
      );
    const id = randomBytes(32).toString("hex");
    const session = {
      id,
      expiresAt: now() + ttlMs,
      documents: new Map(),
      busy: false,
      controller: null,
      requests: [],
    };
    sessions.set(id, session);
    return session;
  }
  function add(session, document) {
    get(session.id);
    if (session.documents.size >= 3)
      throw new AppError(
        "FILE_LIMIT",
        "Phiên chỉ được có tối đa 3 tệp. Xóa bớt tệp trước khi tải thêm.",
      );
    const sessionBytes = [...session.documents.values()].reduce(
      (sum, doc) => sum + Buffer.byteLength(doc.text),
      0,
    );
    if (sessionBytes + Buffer.byteLength(document.text) > 48000)
      throw new AppError(
        "CONTEXT_LIMIT",
        "Tổng văn bản tài liệu vượt 48.000 byte UTF-8. Hãy dùng tài liệu ngắn hơn hoặc xóa bớt tệp; nội dung không bị cắt ngầm.",
        413,
      );
    const total = [...sessions.values()].reduce(
      (sum, item) =>
        sum +
        [...item.documents.values()].reduce(
          (n, doc) => n + Buffer.byteLength(doc.text),
          0,
        ),
      0,
    );
    if (total + Buffer.byteLength(document.text) > maxBytes)
      throw new AppError(
        "SERVER_BUSY",
        "Bộ nhớ tài liệu của máy chủ đã đầy. Vui lòng thử lại sau.",
        503,
      );
    session.documents.set(document.id, document);
  }
  function document(session, id) {
    const value = session.documents.get(id);
    if (!value)
      throw new AppError(
        "DOCUMENT_MISSING",
        "Tài liệu không thuộc phiên này hoặc đã bị xóa. Tải lại tài liệu trong phiên của bạn.",
        404,
      );
    return value;
  }
  return { create, get, add, document, sweep };
}

export function documentInfo({ text, ...metadata }) {
  return metadata;
}
