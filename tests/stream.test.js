import test from "node:test";
import assert from "node:assert/strict";
import { readEvents } from "../src/services/researchService.js";
import { requestHistory } from "../src/utils/history.js";
import { emptyAnswer } from "../shared/answer.js";

function response(chunks) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
    { headers: { "Content-Type": "application/x-ndjson" } },
  );
}
const encode = (text) => new TextEncoder().encode(text);

test("NDJSON: ghép từng byte UTF-8, nhiều sự kiện/chunk, escape và xuống dòng trong nội dung", async () => {
  const events = [
    {
      type: "data",
      answer: { ...emptyAnswer(), summary: 'Tiếng Việt: "đúng"\nDòng 2 😀' },
    },
    { type: "complete", answer: emptyAnswer() },
  ];
  const bytes = encode(
    events.map((event) => JSON.stringify(event)).join("\n") + "\n",
  );
  const output = [];
  await readEvents(
    response([...bytes].map((byte) => Uint8Array.of(byte))),
    (event) => output.push(event),
  );
  assert.deepEqual(output, events);
  const combined = [];
  await readEvents(response([bytes]), (event) => combined.push(event));
  assert.deepEqual(combined, events);
});

test("NDJSON: phát hiện EOF thiếu complete và giữ sự kiện đã nhận", async () => {
  const received = [];
  await assert.rejects(
    readEvents(response([encode('{"type":"data","answer":{}}\n')]), (event) =>
      received.push(event),
    ),
    (error) => error.code === "STREAM_INTERRUPTED",
  );
  assert.equal(received.length, 1);
});

test("NDJSON: lỗi giữa stream và JSON hỏng không được coi là complete", async () => {
  await assert.rejects(
    readEvents(
      response([
        encode('{"type":"error","code":"AI_LIMIT","message":"Hết hạn mức"}\n'),
      ]),
      () => {},
    ),
    (error) => error.code === "AI_LIMIT",
  );
  await assert.rejects(
    readEvents(response([encode("{broken}\n")]), () => {}),
    (error) => error.code === "INVALID_STREAM",
  );
});

test("Context không chứa đáp án dở dang hoặc thông báo lỗi", () => {
  assert.deepEqual(
    requestHistory([
      { role: "user", text: "Hỏi" },
      { role: "assistant", status: "incomplete", answer: emptyAnswer() },
    ]),
    [{ role: "user", content: "Hỏi" }],
  );
});
