// Chỉ dành cho kiểm thử: backend thật + provider mock có điều khiển, không gọi Gemini.
import assert from "node:assert/strict";
import { once } from "node:events";
import { chromium } from "playwright";
import { createApp } from "../server/app.js";
import { AppError } from "../server/errors.js";
import { emptyAnswer } from "../shared/answer.js";
import { makePDF, sampleAnswer } from "./support/fixtures.js";

let scenario = "normal";
let finish;
let pushMore;
let aborted = false;
let focusedAnswer;
const requests = [];
const { app, store } = createApp({
  aiConfigured: true,
  generate: async ({ messages, signal, onData }) => {
    requests.push(messages);
    if (scenario === "focused") {
      onData({ summary: " ", key_points: [" "], risks: [], actions: [""] });
      await new Promise((resolve) => {
        finish = resolve;
      });
      onData(focusedAnswer);
      return focusedAnswer;
    }
    onData({ ...emptyAnswer(), summary: "Đang kiểm thử phản hồi từng phần" });
    if (scenario === "controlled")
      await new Promise((resolve, reject) => {
        finish = resolve;
        pushMore = () =>
          onData({
            ...emptyAnswer(),
            summary: "Đang kiểm thử phản hồi từng phần — bổ sung dữ liệu",
          });
        signal.addEventListener(
          "abort",
          () => {
            aborted = true;
            reject(new DOMException("Stop", "AbortError"));
          },
          { once: true },
        );
      });
    if (scenario === "error")
      throw new AppError(
        "TEST_INTERRUPTED",
        "Lỗi giữa stream chỉ dùng trong kiểm thử.",
        502,
      );
    if (scenario === "invalid") return { summary: 123 };
    if (messages.at(-1).content.includes("sao Hỏa"))
      return {
        ...emptyAnswer(),
        summary: "Không tìm thấy thông tin này trong tài liệu",
      };
    return sampleAnswer;
  },
});
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
const base = `http://127.0.0.1:${server.address().port}`;
const input = page.locator("#question");
const send = page.getByRole("button", { name: "Gửi câu hỏi" });
const countQuestions = () => page.locator(".user-message").count();
async function waitDone() {
  await page
    .getByRole("button", { name: "Dừng tạo câu trả lời" })
    .waitFor({ state: "hidden" });
}
async function ask(question) {
  await input.fill(question);
  await send.click();
}
async function clearRate() {
  store.get(
    await page.evaluate(() => sessionStorage.getItem("research-session-v2")),
  ).requests = [];
}

try {
  await page.goto(base);
  await page.locator("#documents:enabled").waitFor();
  assert.equal(await send.isDisabled(), true);
  await page.locator("#documents").setInputFiles([
    {
      name: "nghiên-cứu.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Ngân sách: 120 triệu đồng. Thời gian: 6 tuần."),
    },
    { name: "research.pdf", mimeType: "application/pdf", buffer: makePDF() },
  ]);
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".file-info span").length === 2 &&
      [...document.querySelectorAll(".file-info span")].every((el) =>
        el.textContent.includes("Sẵn sàng"),
      ),
  );
  await page.getByText("nghiên-cứu.txt", { exact: true }).waitFor();
  await input.fill("Ngân sách là bao nhiêu?");
  await input.press("Shift+Enter");
  assert.ok((await input.inputValue()).includes("\n"));
  await input.dispatchEvent("compositionstart");
  await input.press("Enter");
  assert.equal(await countQuestions(), 0);
  await input.dispatchEvent("compositionend");
  scenario = "controlled";
  await input.press("Enter");
  await page
    .getByText("Đang kiểm thử phản hồi từng phần", { exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Dừng tạo câu trả lời" })
      .isVisible(),
    true,
  );
  assert.equal(await send.isDisabled(), true);
  assert.equal(await page.locator("#documents").isDisabled(), true);
  assert.deepEqual(await page.locator(".answer-card h3").allTextContents(), [
    "Trả lời",
  ]);
  finish();
  await waitDone();
  await page.getByText(sampleAnswer.summary, { exact: true }).waitFor();
  assert.equal(await countQuestions(), 1);
  assert.equal(await page.locator(".answer-card h3").count(), 2);
  scenario = "normal";
  await ask("Còn thời gian thực hiện thì sao?");
  await waitDone();
  assert.equal(requests.at(-1).length, 5);
  assert.ok(
    requests
      .at(-1)
      .some(
        (item) =>
          item.role === "assistant" && item.content.includes("120 triệu"),
      ),
  );
  await page
    .locator(".answer-card")
    .last()
    .getByRole("button", { name: "Sao chép" })
    .click();
  await page.getByText("Đã sao chép câu trả lời.", { exact: true }).waitFor();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Test denied");
        },
      },
    }),
  );
  await page
    .locator(".answer-card")
    .last()
    .getByRole("button", { name: "Sao chép" })
    .click();
  await page
    .getByText(
      "Không thể sao chép. Bạn có thể chọn văn bản và sao chép thủ công.",
      { exact: true },
    )
    .waitFor();

  scenario = "error";
  await page.getByRole("button", { name: "↻ Tạo lại", exact: true }).click();
  await waitDone();
  assert.equal(await countQuestions(), 2);
  await page.locator(".failed-attempt summary").waitFor();
  assert.equal(
    await page.getByText(sampleAnswer.summary, { exact: true }).count(),
    2,
  );
  assert.equal(requests.at(-1).length, 5); // Không có đáp án đang bị thay thế ở cuối context.
  await page.locator(".failed-attempt summary").click();
  await page
    .getByText("Trả lời\nĐang kiểm thử phản hồi từng phần", { exact: true })
    .waitFor();
  scenario = "normal";
  await page
    .getByRole("button", { name: "Thử lại câu hỏi gần nhất", exact: true })
    .click();
  await waitDone();
  assert.equal(await countQuestions(), 2);
  assert.equal(await page.locator(".failed-attempt").count(), 0);

  await clearRate();
  scenario = "controlled";
  await ask("Kiểm tra dừng");
  await page
    .getByText("Đang kiểm thử phản hồi từng phần", { exact: true })
    .waitFor();
  await page.locator(".message-list").evaluate((el) => {
    el.scrollTop = 0;
    el.dispatchEvent(new Event("scroll"));
  });
  pushMore();
  await page
    .getByText("Đang kiểm thử phản hồi từng phần — bổ sung dữ liệu", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.locator(".message-list").evaluate((el) => el.scrollTop),
    0,
  );
  await page.getByRole("button", { name: "Dừng tạo câu trả lời" }).click();
  await waitDone();
  await page
    .locator(".answer-label")
    .last()
    .getByText("Chưa hoàn tất", { exact: true })
    .waitFor();
  for (let i = 0; i < 30 && !aborted; i++)
    await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(aborted, true);
  scenario = "normal";
  await page
    .getByRole("button", { name: "Thử lại câu hỏi gần nhất", exact: true })
    .click();
  await waitDone();
  assert.equal(await countQuestions(), 3);

  await ask("Có thông tin về sao Hỏa không?");
  await waitDone();
  await page
    .getByText("Không tìm thấy thông tin này trong tài liệu", { exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByText("Không tìm thấy thông tin này trong tài liệu", { exact: true })
    .waitFor();
  assert.equal(await countQuestions(), 4);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Thu gọn", exact: true }).click();
  assert.equal(await page.locator("#document-content").isVisible(), false);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.getByRole("button", { name: "Mở rộng", exact: true }).click();
  assert.equal(await page.locator("#document-content").isVisible(), true);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });

  const token = await page.evaluate(() =>
    sessionStorage.getItem("research-session-v2"),
  );
  const session = store.get(token);
  session.documents.delete(session.documents.keys().next().value);
  await page.reload();
  await page
    .getByText(
      "Bộ tài liệu đã thay đổi so với lịch sử này. Bắt đầu hội thoại mới trước khi hỏi để không lẫn ngữ cảnh.",
      { exact: true },
    )
    .waitFor();
  assert.equal(await send.isDisabled(), true);
  assert.equal(await countQuestions(), 4);
  store.get(token).expiresAt = Date.now() - 1;
  await page.reload();
  await page
    .getByRole("button", { name: "Tạo phiên mới", exact: true })
    .waitFor();
  assert.equal(await countQuestions(), 4);
  assert.equal(await send.isDisabled(), true);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Tạo phiên mới", exact: true })
    .click();
  await page.locator("#documents:enabled").waitFor();
  assert.equal(await countQuestions(), 0);
  assert.equal(await page.locator(".file-item").count(), 0);
  await page.locator("#documents:enabled").setInputFiles({
    name: "offline.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Network test"),
  });
  await page.route("**/api/chat", (route) => route.abort("failed"));
  await ask("Kiểm tra mất mạng");
  await page
    .locator(".chat-error")
    .getByText(
      "Mất kết nối hoặc backend chưa chạy. Kiểm tra mạng và khởi động backend rồi thử lại.",
      { exact: true },
    )
    .waitFor();
  assert.deepEqual(pageErrors, []);
  // Bốn dạng đáp án mock kiểm tra UI, không khẳng định chất lượng model thật.
  const focused = await context.newPage();
  await focused.goto(base);
  await focused.locator("#documents:enabled").setInputFiles({
    name: "focused.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "Ngân sách 120 triệu đồng. Dự án kéo dài 6 tuần. Rủi ro: thiếu nhân lực.",
    ),
  });
  await focused.getByText("Sẵn sàng", { exact: false }).waitFor();
  const cases = [
    [
      "Ngân sách bao nhiêu?",
      { ...emptyAnswer(), summary: "120 triệu đồng." },
      ["Trả lời"],
    ],
    [
      "Tóm tắt tài liệu",
      {
        ...emptyAnswer(),
        summary: "Kế hoạch dự án.",
        key_points: ["Ngân sách 120 triệu đồng.", "Thời gian 6 tuần."],
      },
      ["Trả lời", "Ý chính"],
    ],
    [
      "Có rủi ro nào?",
      {
        ...emptyAnswer(),
        summary: "Tài liệu nêu một rủi ro.",
        risks: ["Thiếu nhân lực."],
      },
      ["Trả lời", "Rủi ro"],
    ],
    [
      "Ai là nhà tài trợ?",
      {
        ...emptyAnswer(),
        summary: "Không tìm thấy thông tin này trong tài liệu",
      },
      ["Trả lời"],
    ],
  ];
  scenario = "focused";
  for (const [question, answer, headings] of cases) {
    focusedAnswer = answer;
    await focused.locator("#question").fill(question);
    await focused.getByRole("button", { name: "Gửi câu hỏi" }).click();
    await focused
      .getByRole("button", { name: "Dừng tạo câu trả lời" })
      .waitFor();
    const card = focused.locator(".answer-card").last();
    await card.getByText("Đang nhận", { exact: true }).waitFor();
    assert.equal(
      await card.locator("h3").count(),
      0,
      "Không dựng tiêu đề cho chunk trắng",
    );
    finish();
    await card.getByText("Hoàn tất", { exact: true }).waitFor();
    assert.deepEqual(await card.locator("h3").allTextContents(), headings);
    assert.ok(requests.at(-1).at(-1).content.includes(question));
  }
  await focused.close();
  console.log(
    "PASS four answer shapes and empty streaming headings (provider mock).",
  );
  console.log(
    "PASS browser: upload TXT/PDF, partial before complete, follow-up context, regenerate/error/retry, stop propagates, copy success/failure, scroll preservation, IME simulation, persistence, expiry, mobile. Provider MOCK only.",
  );
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
}
