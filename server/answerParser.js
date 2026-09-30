import { JSONParser } from "@streamparser/json";
import { emptyAnswer, partialAnswer } from "../shared/answer.js";
import { AppError } from "./errors.js";

// Tokenizer giữ trạng thái chuỗi/escape/Unicode qua các chunk, không sửa JSON bằng regex.
export function createAnswerParser() {
  const parser = new JSONParser({
    emitPartialTokens: true,
    emitPartialValues: true,
  });
  const snapshot = emptyAnswer();
  let result;
  let bytes = 0;
  const invalid = () =>
    new AppError(
      "INVALID_ANSWER",
      "Gemini trả dữ liệu sai cấu trúc hoặc JSON chưa đầy đủ. Hãy thử lại.",
      502,
    );
  parser.onValue = ({ value, key, stack, partial }) => {
    if (stack.length === 0 && !partial) result = value;
    if (stack.length === 1 && key === "summary" && typeof value === "string")
      snapshot.summary = value;
    const section = stack[1]?.key;
    if (
      stack.length === 2 &&
      ["key_points", "risks", "actions"].includes(section) &&
      Number.isInteger(key) &&
      typeof value === "string"
    )
      snapshot[section][key] = value;
  };
  return {
    write(delta) {
      bytes += Buffer.byteLength(delta);
      if (bytes > 128000) throw invalid();
      try {
        parser.write(delta);
      } catch {
        throw invalid();
      }
      return partialAnswer(snapshot);
    },
    finish() {
      if (!parser.isEnded || result === undefined) throw invalid();
      return result;
    },
  };
}
