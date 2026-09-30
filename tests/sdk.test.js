import test from "node:test";
import assert from "node:assert/strict";
import { GoogleGenAI } from "@google/genai";
import {
  createResearchAI,
  toGeminiContents,
  buildMessages,
} from "../server/ai.js";
import { createAnswerParser } from "../server/answerParser.js";
import { publicError } from "../server/errors.js";

const model = "gemini-3.5-flash-lite";
const answer = {
  summary: 'Tiếng Việt "trích dẫn"\nDòng mới 😀',
  key_points: ["Một", "Hai"],
  risks: [],
  actions: [],
};
function chunk(text, finishReason) {
  return {
    candidates: [
      {
        index: 0,
        content: { role: "model", parts: text ? [{ text }] : [] },
        ...(finishReason ? { finishReason } : {}),
      },
    ],
  };
}
function fakeClient(chunks) {
  return {
    models: {
      async *generateContentStream() {
        for (const item of chunks) yield item;
      },
    },
  };
}
function request(client, options = {}) {
  return createResearchAI({ client, model })({
    messages: buildMessages(
      [{ name: "test.txt", text: "Thông tin công khai" }],
      "Tóm tắt",
      [],
    ),
    signal: new AbortController().signal,
    onData: () => {},
    ...options,
  });
}

test("Google SDK thật đọc SSE mock bị chia byte UTF-8; partial hiển thị trước kết thúc", async () => {
  let body;
  let url;
  let index = 0;
  let upstreamDone = false;
  let sawPartial = false;
  // Escape surrogate để kiểm tra tokenizer có giữ trạng thái \u qua các delta.
  const json = JSON.stringify(answer).replace("😀", "\\ud83d\\ude00");
  const parts = [];
  for (let i = 0; i < json.length; i += 3)
    parts.push(chunk(json.slice(i, i + 3)));
  parts.push(chunk("", "STOP"));
  const bytes = new TextEncoder().encode(
    parts.map((value) => `data: ${JSON.stringify(value)}\n\n`).join(""),
  );
  const client = new GoogleGenAI({
    apiKey: "test-only-not-a-key",
    vertexai: false,
    httpOptions: {
      retryOptions: { attempts: 1 },
      fetch: async (input, options) => {
        url = String(input);
        body = JSON.parse(options.body);
        return new Response(
          new ReadableStream({
            pull(controller) {
              if (index === bytes.length) {
                upstreamDone = true;
                controller.close();
                return;
              }
              controller.enqueue(bytes.slice(index, index + 7));
              index = Math.min(index + 7, bytes.length);
            },
          }),
          { headers: { "Content-Type": "text/event-stream" } },
        );
      },
    },
  });
  const result = await request(client, {
    onData: (value) => {
      if (value.summary && value.summary !== answer.summary && !upstreamDone)
        sawPartial = true;
    },
  });
  assert.deepEqual(result, answer);
  assert.equal(sawPartial, true);
  assert.match(url, /streamGenerateContent/);
  assert.match(url, /gemini-3.5-flash-lite/);
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.equal(body.generationConfig.responseJsonSchema.type, "object");
  assert.ok(
    body.systemInstruction.parts[0].text.includes("Không tìm thấy thông tin"),
  );
});

test("Google SDK truyền AbortSignal tới fetch mock, không gọi Google", async () => {
  const controller = new AbortController();
  let aborted = false;
  const client = new GoogleGenAI({
    apiKey: "test-only-not-a-key",
    vertexai: false,
    httpOptions: {
      fetch: async (_url, options) => {
        return new Response(
          new ReadableStream({
            start(stream) {
              options.signal.addEventListener(
                "abort",
                () => {
                  aborted = true;
                  stream.error(new DOMException("Stop", "AbortError"));
                },
                { once: true },
              );
              controller.abort();
            },
          }),
          { headers: { "Content-Type": "text/event-stream" } },
        );
      },
    },
  });
  await assert.rejects(request(client, { signal: controller.signal }));
  assert.equal(aborted, true);
});

test("Chuyển system instruction riêng, user/model đúng vai trò, giữ toàn bộ lịch sử", () => {
  const messages = buildMessages(
    [{ name: "a", text: "120 triệu" }],
    "Còn thời gian?",
    [
      { role: "user", content: "Ngân sách?" },
      { role: "assistant", content: JSON.stringify(answer) },
    ],
  );
  const contents = toGeminiContents(messages);
  assert.deepEqual(
    contents.map((item) => item.role),
    ["user", "model", "user"],
  );
  assert.match(contents[0].parts[0].text, /120 triệu/);
  assert.equal(contents[0].parts[1].text, "Ngân sách?");
  assert.equal(contents[1].parts[0].text, JSON.stringify(answer));
  assert.equal(contents[2].parts[0].text, "Còn thời gian?");
});

test("JSON đầy đủ nhưng thiếu finishReason không được đánh dấu complete", async () => {
  await assert.rejects(
    request(fakeClient([chunk(JSON.stringify(answer))])),
    (error) => error.code === "STREAM_INTERRUPTED",
  );
});

test("JSON cắt giữa chừng/sai schema/dư trường bị từ chối", async () => {
  for (const text of [
    '{"summary":"dở',
    '{"summary":123}',
    JSON.stringify({ ...answer, extra: true }),
  ]) {
    await assert.rejects(request(fakeClient([chunk(text, "STOP")])));
  }
});

test("Gemini chặn prompt, chặn phản hồi, hết output: lỗi riêng, giữ partial đã gửi", async () => {
  for (const response of [
    { promptFeedback: { blockReason: "SAFETY" } },
    chunk("", "SAFETY"),
  ])
    await assert.rejects(
      request(fakeClient([response])),
      (error) => error.code === "AI_BLOCKED",
    );
  let seen = false;
  await assert.rejects(
    request(
      fakeClient([chunk('{"summary":"đã nhận'), chunk("", "MAX_TOKENS")]),
      {
        onData: () => {
          seen = true;
        },
      },
    ),
    (error) => error.code === "INVALID_ANSWER",
  );
  assert.equal(seen, true);
});

test("Lỗi 429 qua Google SDK chỉ một lần gọi, không retry tự động", async () => {
  let count = 0;
  const client = new GoogleGenAI({
    apiKey: "test-only-not-a-key",
    vertexai: false,
    httpOptions: {
      fetch: async () => {
        count++;
        return Response.json(
          {
            error: {
              code: 429,
              status: "RESOURCE_EXHAUSTED",
              message: "Quota exhausted",
            },
          },
          { status: 429 },
        );
      },
    },
  });
  await assert.rejects(
    request(client),
    (error) => publicError(error).code === "AI_LIMIT",
  );
  assert.equal(count, 1);
});

test("Phân loại lỗi key/quyền/model/quota/network/timeout/Free Tier, không lộ message gốc", () => {
  for (const [error, code] of [
    [
      {
        status: 400,
        message: JSON.stringify({
          error: { details: [{ reason: "API_KEY_INVALID" }] },
        }),
      },
      "AI_AUTH",
    ],
    [{ status: 403 }, "AI_PERMISSION"],
    [{ status: 404 }, "AI_MODEL"],
    [{ status: 429 }, "AI_LIMIT"],
    [new TypeError("fetch failed: secret-key"), "AI_NETWORK"],
    [{ status: 504 }, "TIMEOUT"],
    [{ status: 503 }, "AI_UNAVAILABLE"],
    [{ status: 400, message: "Unsupported schema" }, "AI_REQUEST"],
    [
      {
        status: 400,
        message: JSON.stringify({ error: { status: "FAILED_PRECONDITION" } }),
      },
      "AI_FREE_TIER_UNAVAILABLE",
    ],
  ]) {
    assert.equal(publicError(error).code, code);
    assert.ok(!JSON.stringify(publicError(error)).includes("secret-key"));
  }
});

test("Parser không hoàn tất khi JSON hỏng hoặc còn thiếu ký tự", () => {
  const parser = createAnswerParser();
  assert.equal(parser.write('{"summary":"hel').summary, "hel");
  assert.throws(
    () => parser.finish(),
    (error) => error.code === "INVALID_ANSWER",
  );
  const broken = createAnswerParser();
  assert.throws(
    () => broken.write("{wrong}"),
    (error) => error.code === "INVALID_ANSWER",
  );
});

test("Thiếu GEMINI_MODEL: dừng trước lời gọi SDK, không chọn model ngầm", async () => {
  await assert.rejects(
    createResearchAI({ model: "", client: fakeClient([]) })({}),
    (error) => error.code === "AI_MODEL",
  );
});
