import { isAnswer } from "../../shared/answer.js";

export const HISTORY_KEY = "research-history-v2";
export const SESSION_KEY = "research-session-v2";
export const CONTEXT_KEY = "research-context-v2";

export function loadHistory() {
  try {
    const value = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");
    if (
      !Array.isArray(value) ||
      value.length > 80 ||
      !value.every(
        (item) =>
          typeof item.id === "string" &&
          (item.role === "user"
            ? typeof item.text === "string"
            : item.role === "assistant" && isAnswer(item.answer)),
      )
    )
      return [];
    return value.map((item) => ({
      ...item,
      status: item.status === "streaming" ? "incomplete" : item.status,
    }));
  } catch {
    return [];
  }
}

export function requestHistory(messages) {
  return messages
    .filter((item) => item.role === "user" || item.status === "complete")
    .map((item) => ({
      role: item.role,
      content: item.role === "user" ? item.text : JSON.stringify(item.answer),
    }));
}
