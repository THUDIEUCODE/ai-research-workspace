import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createApp } from "../server/app.js";
import { createSessionStore } from "../server/sessionStore.js";
import { extractText } from "../server/documents.js";
import { buildMessages, createResearchAI } from "../server/ai.js";
import { publicError } from "../server/errors.js";
import { readEvents } from "../src/services/researchService.js";
import { makePDF, sampleAnswer } from "./support/fixtures.js";

async function setup(t, options = {}) {
  const { app, store } = createApp(options);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = (path, token, options = {}) =>
    fetch(base + path, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  const session = async () =>
    (await (await request("/sessions", null, { method: "POST" })).json()).token;
  const upload = async (
    token,
    name = "notes.txt",
    content = "Ngân sách: 120 triệu đồng. Thời gian: 6 tuần.",
  ) => {
    const body = new FormData();
    body.append("file", new Blob([content]), name);
    const events = [];
    await readEvents(
      await request("/documents", token, { method: "POST", body }),
      (event) => events.push(event),
    );
    return events.at(-1).document;
  };
  const chat = (
    token,
    documentIds,
    question = "Ngân sách?",
    history = [],
    signal,
  ) =>
    request("/chat", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds, question, history }),
      signal,
    });
  return { request, session, upload, chat, store };
}

test("PDF ngày hội đổi sách: upload đúng tệp, giữ đủ sáu phần tiếng Việt", async (t) => {
  // Node --watch bật biến này, khiến child process gửi thêm IPC watch:import.
  const previous = process.env.WATCH_REPORT_DEPENDENCIES;
  process.env.WATCH_REPORT_DEPENDENCIES = "1";
  t.after(() => {
    if (previous === undefined) delete process.env.WATCH_REPORT_DEPENDENCIES;
    else process.env.WATCH_REPORT_DEPENDENCIES = previous;
  });
  const api = await setup(t);
  const token = await api.session();
  const buffer = await readFile(
    new URL("../samples/ke_hoach_ngay_hoi_doi_sach.pdf", import.meta.url),
  );
  const pdf = await api.upload(token, "ke_hoach_ngay_hoi_doi_sach.pdf", buffer);
  assert.equal(pdf?.status, "ready");
  const text = api.store.get(token).documents.get(pdf.id).text;
  for (const phrase of [
    "KẾ HOẠCH NGÀY HỘI ĐỔI SÁCH",
    "1. Mục tiêu và quy mô",
    "2. Quy định tham gia",
    "3. Lịch trình",
    "4. Ngân sách dự kiến",
    "5. Phân công và xử lý rủi ro",
    "6. Đánh giá sau sự kiện",
    "1.200.000 đồng",
    "85%",
    "tên nhà tài trợ hoặc doanh thu.",
  ]) {
    assert.ok(text.includes(phrase), `Thiếu nội dung: ${phrase}`);
  }
  assert.ok(!text.includes("\uFFFD"), "Không có ký tự thay thế do lỗi Unicode");
});

test("Upload TXT/PDF thật; tách phiên và kiểm tra quyền đọc/xóa/chat", async (t) => {
  const api = await setup(t, { generate: async () => sampleAnswer });
  const a = await api.session();
  const b = await api.session();
  const txt = await api.upload(a);
  const pdf = await api.upload(a, "text.pdf", makePDF());
  assert.equal(txt.status, "ready");
  assert.equal(pdf.status, "ready");
  assert.match(api.store.get(a).documents.get(pdf.id).text, /120 million/);
  assert.equal(
    (await (await api.request("/documents", b)).json()).documents.length,
    0,
  );
  assert.equal(
    (await api.request(`/documents/${txt.id}`, b, { method: "DELETE" })).status,
    404,
  );
  assert.equal((await api.chat(b, [txt.id])).status, 404);
  assert.equal(
    (await api.request(`/documents/${txt.id}`, a, { method: "DELETE" })).status,
    204,
  );
});

test("Backend từ chối sai định dạng, rỗng, binary TXT, UTF-8 hỏng, PDF hỏng/không có chữ", async (t) => {
  const api = await setup(t);
  const token = await api.session();
  for (const [name, content, code] of [
    ["bad.exe", "hello", "FILE_FORMAT"],
    ["empty.txt", "", "FILE_EMPTY"],
    ["binary.txt", Buffer.from([0, 1, 2]), "TXT_INVALID"],
    ["encoding.txt", Buffer.from([255, 254, 255]), "TXT_ENCODING"],
    ["fake.pdf", "not PDF", "FILE_FORMAT"],
    ["broken.pdf", "%PDF-1.4\ncorrupt", "PDF_INVALID"],
    ["scan.pdf", makePDF(""), "PDF_NO_TEXT"],
  ])
    await assert.rejects(
      api.upload(token, name, content),
      (error) => error.code === code,
      name,
    );
});

test("Backend giới hạn 3 tệp, 5 MB và tổng context tài liệu", async (t) => {
  const api = await setup(t);
  const token = await api.session();
  await assert.rejects(
    api.upload(token, "large.txt", "x".repeat(5 * 1024 * 1024 + 1)),
    (error) => error.code === "FILE_LIMIT",
  );
  await assert.rejects(
    api.upload(token, "context.txt", "x".repeat(48001)),
    (error) => error.code === "CONTEXT_LIMIT",
  );
  await api.upload(token, "a.txt");
  await api.upload(token, "b.txt");
  await api.upload(token, "c.txt");
  await assert.rejects(
    api.upload(token, "d.txt"),
    (error) => error.code === "FILE_LIMIT",
  );
});

test("PDF có mật khẩu trả thông báo riêng", async () => {
  const buffer = await readFile(
    new URL("./fixtures/password.pdf", import.meta.url),
  );
  await assert.rejects(
    extractText({ originalname: "password.pdf", buffer, size: buffer.length }),
    (error) => error.code === "PDF_PASSWORD",
  );
});

test("Streaming truyền partial trước complete và lịch sử được chuyển cho provider", async (t) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let input;
  const api = await setup(t, {
    generate: async (args) => {
      input = args.messages;
      args.onData({ ...sampleAnswer, summary: "Ngân sách" });
      await gate;
      return sampleAnswer;
    },
  });
  const token = await api.session();
  const doc = await api.upload(token);
  let receivedPartial = false;
  const events = [];
  await readEvents(
    await api.chat(token, [doc.id], "Thời gian?", [
      { role: "user", content: "Ngân sách?" },
      { role: "assistant", content: JSON.stringify(sampleAnswer) },
    ]),
    (event) => {
      events.push(event);
      if (event.type === "data") {
        receivedPartial = true;
        release();
      }
    },
  );
  assert.equal(receivedPartial, true);
  assert.equal(events.at(-1).type, "complete");
  assert.match(input[1].content, /120 triệu/);
  assert.equal(input[2].content, "Ngân sách?");
  assert.equal(input.at(-1).content, "Thời gian?");
});

test("Lỗi giữa stream giữ data; kết quả sai schema không có complete", async (t) => {
  const api = await setup(t, {
    generate: async ({ onData }) => {
      onData(sampleAnswer);
      return { summary: 3 };
    },
  });
  const token = await api.session();
  const doc = await api.upload(token);
  const events = [];
  await assert.rejects(
    readEvents(await api.chat(token, [doc.id]), (event) => events.push(event)),
    (error) => error.code === "INVALID_ANSWER",
  );
  assert.ok(events.some((event) => event.type === "data"));
  assert.ok(!events.some((event) => event.type === "complete"));
});

test("Hủy fetch truyền AbortSignal tới provider và giải phóng khóa phiên", async (t) => {
  let wasAborted = false;
  const api = await setup(t, {
    generate: ({ signal, onData }) =>
      new Promise((resolve, reject) => {
        onData(sampleAnswer);
        signal.addEventListener(
          "abort",
          () => {
            wasAborted = true;
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      }),
  });
  const token = await api.session();
  const doc = await api.upload(token);
  const controller = new AbortController();
  await assert.rejects(
    readEvents(
      await api.chat(token, [doc.id], "Hỏi", [], controller.signal),
      (event) => {
        if (event.type === "data") controller.abort();
      },
    ),
  );
  for (let i = 0; i < 30 && !wasAborted; i++)
    await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(wasAborted, true);
  assert.equal(api.store.get(token).busy, false);
});

test("Timeout, thiếu key và rate limit báo rõ, không thay bằng demo", async (t) => {
  const api = await setup(t, {
    timeoutMs: 30,
    generate: ({ signal }) =>
      new Promise((resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("timeout")), {
          once: true,
        }),
      ),
  });
  const token = await api.session();
  const doc = await api.upload(token);
  await assert.rejects(
    readEvents(await api.chat(token, [doc.id]), () => {}),
    (error) => error.code === "TIMEOUT",
  );
  api.store.get(token).requests = Array(6).fill(Date.now());
  assert.equal((await api.chat(token, [doc.id])).status, 429);
  await assert.rejects(
    createResearchAI({ apiKey: "" })({}),
    (error) => error.code === "AI_NOT_CONFIGURED",
  );
});

test("Phiên hết hạn, giới hạn phiên/bộ nhớ và ngân sách gồm cả lịch sử/đầu ra", () => {
  let now = 0;
  const store = createSessionStore({
    ttlMs: 10,
    maxSessions: 1,
    maxBytes: 10,
    now: () => now,
  });
  const session = store.create();
  assert.throws(
    () => store.create(),
    (error) => error.code === "SERVER_BUSY",
  );
  assert.throws(
    () => store.add(session, { id: "x", text: "a".repeat(11) }),
    (error) => error.code === "SERVER_BUSY",
  );
  now = 11;
  assert.throws(
    () => store.get(session.id),
    (error) => error.code === "SESSION_EXPIRED",
  );
  assert.throws(
    () =>
      buildMessages([{ name: "a", text: "a".repeat(45000) }], "Hỏi", [
        { role: "user", content: "b".repeat(20000) },
      ]),
    (error) => error.code === "CONTEXT_LIMIT",
  );
});

test("Lỗi public không làm lộ nội dung exception/key", () => {
  assert.ok(
    !JSON.stringify(publicError(new Error("secret-key-and-stack"))).includes(
      "secret-key",
    ),
  );
  assert.equal(publicError({ status: 401 }).code, "AI_AUTH");
  assert.equal(publicError({ status: 429 }).code, "AI_LIMIT");
});

test("HTTP thiếu API key báo AI_NOT_CONFIGURED; health không lộ cấu hình bí mật", async (t) => {
  const api = await setup(t, {
    generate: createResearchAI({ apiKey: "" }),
    aiConfigured: false,
  });
  assert.deepEqual(await (await api.request("/health")).json(), {
    ok: true,
    aiConfigured: false,
  });
  const token = await api.session();
  const doc = await api.upload(token);
  const events = [];
  await assert.rejects(
    readEvents(await api.chat(token, [doc.id]), (event) => events.push(event)),
    (error) => error.code === "AI_NOT_CONFIGURED",
  );
  assert.ok(
    !events.some((event) => event.type === "data" || event.type === "complete"),
  );
});

test("Một phiên không được chat/xóa đồng thời; giải phóng khóa sau hoàn tất", async (t) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const api = await setup(t, {
    generate: async () => {
      await gate;
      return sampleAnswer;
    },
  });
  const token = await api.session();
  const doc = await api.upload(token);
  const first = await api.chat(token, [doc.id]);
  assert.equal((await api.chat(token, [doc.id])).status, 429);
  assert.equal(
    (await api.request(`/documents/${doc.id}`, token, { method: "DELETE" }))
      .status,
    409,
  );
  release();
  await readEvents(first, () => {});
  assert.equal(api.store.get(token).busy, false);
});
