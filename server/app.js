import express from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createSessionStore, documentInfo } from "./sessionStore.js";
import { extractText } from "./documents.js";
import { createResearchAI, buildMessages, AnswerSchema } from "./ai.js";
import { AppError, publicError } from "./errors.js";

const ChatRequest = z
  .object({
    documentIds: z.array(z.string().uuid()).min(1).max(3),
    question: z.string().trim().min(1).max(4000),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().min(1).max(24000),
          })
          .strict(),
      )
      .max(40),
  })
  .strict();

function startStream(res) {
  res.status(200).set({
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
}

function sendEvent(res, event, controller) {
  if (res.destroyed || res.writableEnded) return;
  if (res.writableLength > 1024 * 1024) {
    controller?.abort();
    res.destroy();
    return;
  }
  res.write(`${JSON.stringify(event)}\n`);
}

export function createApp({
  store = createSessionStore(),
  generate = createResearchAI(),
  aiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim()),
  timeoutMs = 90000,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 100,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        code: "RATE_LIMIT",
        message: "Quá nhiều yêu cầu. Vui lòng đợi một phút rồi thử lại.",
      },
    }),
  );
  app.use(express.json({ limit: "256kb" }));
  app.get("/api/health", (_req, res) => res.json({ ok: true, aiConfigured }));
  app.post("/api/sessions", (_req, res) => {
    const session = store.create();
    res.status(201).json({ token: session.id, expiresAt: session.expiresAt });
  });
  app.use("/api", (req, _res, next) => {
    req.session = store.get(req.get("Authorization")?.replace(/^Bearer /, ""));
    next();
  });
  app.get("/api/documents", (req, res) =>
    res.json({
      documents: [...req.session.documents.values()].map(documentInfo),
      expiresAt: req.session.expiresAt,
    }),
  );

  let uploads = 0;
  let aiRequests = 0;
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
  }).single("file");
  app.post("/api/documents", async (req, res, next) => {
    const session = req.session;
    if (session.busy || uploads >= 2)
      return next(
        new AppError(
          "SERVER_BUSY",
          "Đang xử lý yêu cầu khác. Vui lòng đợi rồi thử tải lại.",
          429,
        ),
      );
    if (session.documents.size >= 3)
      return next(
        new AppError(
          "FILE_LIMIT",
          "Phiên chỉ có tối đa 3 tệp. Xóa bớt tệp trước khi tải thêm.",
        ),
      );
    session.busy = true;
    uploads++;
    const controller = new AbortController();
    session.controller = controller;
    const close = () => controller.abort();
    res.on("close", close);
    try {
      await new Promise((resolve, reject) => {
        const cancelUpload = () =>
          reject(new AppError("CANCELLED", "Kết nối tải tệp đã đóng.", 499));
        controller.signal.addEventListener("abort", cancelUpload, {
          once: true,
        });
        upload(req, res, (error) => {
          controller.signal.removeEventListener("abort", cancelUpload);
          if (error) reject(error);
          else resolve();
        });
      });
      if (controller.signal.aborted) return;
      startStream(res);
      sendEvent(res, { type: "status", status: "processing" });
      const text = await extractText(req.file, controller.signal);
      if (controller.signal.aborted) return;
      const document = {
        id: randomUUID(),
        name: Buffer.from(req.file.originalname, "latin1").toString("utf8"),
        size: req.file.size,
        status: "ready",
        text,
      };
      store.add(session, document);
      sendEvent(res, { type: "complete", document: documentInfo(document) });
      res.end();
    } catch (error) {
      if (!res.headersSent) next(error);
      else if (!res.destroyed) {
        sendEvent(res, { type: "error", ...publicError(error) });
        res.end();
      }
    } finally {
      // Multer chỉ giữ trong RAM, không tạo tệp tạm trên đĩa.
      if (req.file) req.file.buffer = null;
      session.busy = false;
      session.controller = null;
      uploads--;
      res.off("close", close);
    }
  });
  app.delete("/api/documents/:id", (req, res) => {
    if (req.session.busy)
      throw new AppError(
        "SERVER_BUSY",
        "Đợi yêu cầu hiện tại hoàn tất trước khi xóa tài liệu.",
        409,
      );
    store.document(req.session, req.params.id);
    req.session.documents.delete(req.params.id);
    res.status(204).end();
  });

  app.post("/api/chat", async (req, res, next) => {
    const parsed = ChatRequest.safeParse(req.body);
    if (!parsed.success)
      return next(
        new AppError(
          "INVALID_REQUEST",
          "Câu hỏi hoặc lịch sử không hợp lệ/quá dài. Câu hỏi tối đa 4.000 ký tự, tối đa 20 lượt hội thoại. Hãy bắt đầu hội thoại mới.",
        ),
      );
    const { documentIds, question, history } = parsed.data;
    const session = req.session;
    if (new Set(documentIds).size !== documentIds.length)
      return next(
        new AppError(
          "INVALID_REQUEST",
          "Danh sách tài liệu bị trùng. Hãy tải lại trang.",
        ),
      );
    let messages;
    try {
      messages = buildMessages(
        documentIds.map((id) => store.document(session, id)),
        question,
        history,
      );
    } catch (error) {
      return next(error);
    }
    session.requests = session.requests.filter(
      (time) => time > Date.now() - 60000,
    );
    if (session.cooldownUntil > Date.now())
      return next(
        new AppError(
          "AI_LIMIT",
          "Gemini vừa báo giới hạn quota. Hãy đợi ít nhất 60 giây rồi thử lại; ứng dụng không gửi thêm yêu cầu trong thời gian này.",
          429,
        ),
      );
    if (session.busy || aiRequests >= 3)
      return next(
        new AppError(
          "SERVER_BUSY",
          "Đang có yêu cầu xử lý. Đợi hoàn tất hoặc dừng yêu cầu cũ trước khi thử lại.",
          429,
        ),
      );
    if (session.requests.length >= 6)
      return next(
        new AppError(
          "RATE_LIMIT",
          "Mỗi phiên tối đa 6 yêu cầu AI/phút. Vui lòng đợi một phút.",
          429,
        ),
      );
    session.requests.push(Date.now());
    session.busy = true;
    aiRequests++;
    const controller = new AbortController();
    session.controller = controller;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const close = () => controller.abort();
    res.on("close", close);
    startStream(res);
    sendEvent(res, { type: "status", status: "connecting" });
    try {
      const answer = await generate({
        messages,
        signal: controller.signal,
        onData: (data) => {
          if (!controller.signal.aborted)
            sendEvent(res, { type: "data", answer: data }, controller);
        },
      });
      if (controller.signal.aborted)
        throw new AppError(
          "CANCELLED",
          "Yêu cầu đã dừng. Bạn có thể thử lại.",
          499,
        );
      store.get(session.id);
      sendEvent(
        res,
        { type: "complete", answer: AnswerSchema.parse(answer) },
        controller,
      );
    } catch (error) {
      const safeError =
        session.expiresAt <= Date.now()
          ? new AppError(
              "SESSION_EXPIRED",
              "Phiên đã hết hạn trong lúc trả lời. Nội dung chưa hoàn tất; tạo phiên mới và tải lại tài liệu.",
              401,
            )
          : timedOut
            ? new AppError(
                "TIMEOUT",
                "AI phản hồi quá thời gian chờ. Nội dung đã nhận chưa hoàn tất; hãy thử lại với câu hỏi ngắn hơn.",
                504,
              )
            : error;
      const safe = publicError(safeError);
      if (safe.code === "AI_LIMIT") session.cooldownUntil = Date.now() + 60000;
      sendEvent(res, { type: "error", ...safe });
    } finally {
      clearTimeout(timer);
      res.off("close", close);
      session.busy = false;
      session.controller = null;
      aiRequests--;
      res.end();
    }
  });
  app.use("/api", (_req, _res, next) =>
    next(new AppError("NOT_FOUND", "Không tìm thấy API này.", 404)),
  );
  const dist = fileURLToPath(new URL("../dist", import.meta.url));
  app.use(express.static(dist));
  app.get("/", (_req, res) => res.sendFile(`${dist}/index.html`));
  app.use((error, _req, res, _next) => {
    const safe = publicError(error);
    if (!res.headersSent) res.status(safe.status).json(safe);
    else res.end();
  });
  return { app, store };
}
