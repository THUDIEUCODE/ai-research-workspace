export const emptyAnswer = () => ({
  summary: "",
  key_points: [],
  risks: [],
  actions: [],
});

export function isAnswer(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 4 &&
    typeof value.summary === "string" &&
    ["key_points", "risks", "actions"].every(
      (key) =>
        Array.isArray(value[key]) &&
        value[key].every((item) => typeof item === "string"),
    )
  );
}

// Chỉ lấy các trường đã đọc được từ streaming JSON parser.
export function partialAnswer(value) {
  const answer = emptyAnswer();
  if (typeof value?.summary === "string") answer.summary = value.summary;
  for (const key of ["key_points", "risks", "actions"]) {
    if (Array.isArray(value?.[key]))
      answer[key] = value[key].filter((item) => typeof item === "string");
  }
  return answer;
}

export function answerToText(answer) {
  return [
    ["Trả lời", answer.summary],
    ["Ý chính", answer.key_points],
    ["Rủi ro", answer.risks],
    ["Hành động đề xuất", answer.actions],
  ]
    .filter(([, value]) =>
      Array.isArray(value) ? value.some((item) => item.trim()) : value?.trim(),
    )
    .map(
      ([title, value]) =>
        `${title}\n${
          Array.isArray(value)
            ? value
                .filter((item) => item.trim())
                .map((item) => `• ${item}`)
                .join("\n")
            : value
        }`,
    )
    .join("\n\n");
}
