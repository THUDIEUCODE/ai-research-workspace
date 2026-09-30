import test from "node:test";
import assert from "node:assert/strict";
import { selectFiles, MAX_SIZE } from "../src/utils/files.js";
import { answerToText } from "../src/services/researchService.js";

const file = (name, size = 100) => ({ name, size, lastModified: 1 });

test("Chấp nhận PDF/TXT, kể cả phần mở rộng viết hoa và đúng 5 MB", () => {
  const result = selectFiles([], [file("a.PDF", MAX_SIZE), file("b.txt")]);
  assert.equal(result.files.length, 2);
  assert.deepEqual(result.errors, []);
});

test("Báo lỗi tệp sai định dạng, quá dung lượng, trùng và vượt số lượng; giữ tệp hợp lệ", () => {
  const original = [file("a.pdf")];
  const result = selectFiles(original, [
    file("bad.exe"),
    file("big.pdf", MAX_SIZE + 1),
    file("a.pdf"),
    file("b.txt"),
    file("c.pdf"),
    file("d.pdf"),
  ]);
  assert.equal(result.files.length, 3);
  assert.equal(result.errors.length, 4);
  assert.equal(original.length, 1);
});

test("Sao chép có tiêu đề dễ đọc và bỏ mục rỗng", () => {
  assert.equal(
    answerToText({
      summary: "Mẫu",
      key_points: ["Ý 1"],
      risks: [],
      actions: [],
    }),
    "Trả lời\nMẫu\n\nÝ chính\n• Ý 1",
  );
});

test("Frontend từ chối tệp rỗng", () => {
  assert.equal(selectFiles([], [file("empty.txt", 0)]).files.length, 0);
});
