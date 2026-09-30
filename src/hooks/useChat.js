import { useEffect, useRef, useState } from "react";
import {
  getResearchAnswer,
  errorMessage,
} from "../services/researchService.js";
import { emptyAnswer } from "../../shared/answer.js";
import {
  HISTORY_KEY,
  CONTEXT_KEY,
  loadHistory,
  requestHistory,
} from "../utils/history.js";

export function useChat(documents) {
  const [messages, setMessages] = useState(loadHistory);
  const [binding, setBinding] = useState(() => {
    try {
      return sessionStorage.getItem(CONTEXT_KEY);
    } catch {
      return null;
    }
  });
  const currentBinding = documents.files
    .filter((file) => file.status === "ready")
    .map((file) => file.id)
    .sort()
    .join(",");
  const contextChanged =
    messages.length > 0 &&
    !documents.loading &&
    !documents.expired &&
    binding !== currentBinding;
  const [pending, setPending] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const active = useRef(null);
  const busy = useRef(false);
  useEffect(() => () => active.current?.abort(), []);
  // Chỉ lưu khi kết thúc lượt, tránh ghi storage trên mỗi token.
  useEffect(() => {
    if (pending) return;
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
      if (binding) sessionStorage.setItem(CONTEXT_KEY, binding);
      else sessionStorage.removeItem(CONTEXT_KEY);
    } catch {
      setStorageWarning(
        "Không lưu được lịch sử trong tab. Lịch sử hiện tại vẫn xem được, nhưng có thể mất khi tải lại.",
      );
    }
  }, [messages, pending, binding]);

  async function request(question, regenerate = false) {
    const clean = question.trim();
    if (!clean || busy.current || !documents.ready || contextChanged)
      return false;
    busy.current = true;
    setBinding(currentBinding);
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setPhase("connecting");
    setError("");
    const questionIndex = regenerate
      ? messages.findLastIndex((item) => item.role === "user")
      : messages.length;
    const context = messages.slice(0, questionIndex);
    const prior =
      regenerate && messages.at(-1)?.role === "assistant"
        ? messages.at(-1)
        : null;
    const base = regenerate
      ? messages.slice(0, questionIndex + 1)
      : [...messages, { id: crypto.randomUUID(), role: "user", text: clean }];
    const id = prior?.id || crypto.randomUUID();
    const backup = prior?.status === "complete" ? prior.answer : null;
    let partial = emptyAnswer();
    const update = (message) => {
      if (active.current === controller)
        setMessages([...base, { id, role: "assistant", ...message }]);
    };
    update({
      answer: backup || partial,
      status: "streaming",
      previousAnswer: backup,
    });
    try {
      const answer = await getResearchAnswer({
        token: documents.token,
        question: clean,
        documentIds: documents.files
          .filter((file) => file.status === "ready")
          .map((file) => file.id),
        history: requestHistory(context),
        signal: controller.signal,
        onStatus: () => {
          if (active.current === controller) setPhase("connecting");
        },
        onData: (answer) => {
          partial = answer;
          if (active.current === controller) setPhase("streaming");
          update({ answer, status: "streaming", previousAnswer: backup });
        },
      });
      update({ answer, status: "complete" });
      if (active.current === controller) setPhase("complete");
    } catch (err) {
      const message = errorMessage(err);
      update({
        answer: backup || partial,
        status: backup ? "complete" : "incomplete",
        failedAttempt: backup ? partial : null,
        attemptError: message,
      });
      if (active.current === controller) {
        setError(message);
        setPhase("incomplete");
        if (err.code === "SESSION_EXPIRED" || err.code === "DOCUMENT_MISSING")
          documents.markExpired();
      }
    } finally {
      if (active.current === controller) {
        busy.current = false;
        setPending(false);
        active.current = null;
      }
    }
    return true;
  }
  function reset() {
    active.current?.abort();
    active.current = null;
    busy.current = false;
    setPending(false);
    setMessages([]);
    setBinding(null);
    setError("");
    setPhase("");
  }
  return {
    messages,
    pending,
    phase,
    error,
    storageWarning,
    contextChanged,
    send: request,
    stop: () => active.current?.abort(),
    reset,
    retry: () =>
      request(
        messages.findLast((item) => item.role === "user")?.text || "",
        true,
      ),
  };
}
