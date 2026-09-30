import { useEffect, useRef, useState } from "react";
import {
  apiJSON,
  uploadDocument,
  errorMessage,
} from "../services/researchService.js";
import { selectFiles } from "../utils/files.js";
import { SESSION_KEY } from "../utils/history.js";

export function useDocuments() {
  const [files, setFiles] = useState([]);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [expired, setExpired] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const active = useRef(null);
  const busy = useRef(false);

  function handleError(error) {
    setErrors([errorMessage(error)]);
    if (error.code === "SESSION_EXPIRED") setExpired(true);
  }
  async function connect(newSession = false) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setErrors([]);
    try {
      const health = await apiJSON("/health", { signal: controller.signal });
      let saved;
      try {
        saved = !newSession && sessionStorage.getItem(SESSION_KEY);
      } catch {
        /* Storage bị chặn: vẫn dùng state. */
      }
      const session = saved
        ? { token: saved }
        : await apiJSON("/sessions", {
            method: "POST",
            signal: controller.signal,
          });
      if (controller.signal.aborted) return;
      setToken(session.token);
      try {
        sessionStorage.setItem(SESSION_KEY, session.token);
      } catch {
        /* Phiên chỉ ở trong bộ nhớ tab. */
      }
      const result = await apiJSON("/documents", {
        token: session.token,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setFiles(result.documents);
      setExpiresAt(result.expiresAt);
      setAiConfigured(health.aiConfigured);
      setExpired(false);
    } catch (error) {
      if (!controller.signal.aborted) handleError(error);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    void connect();
    return () => active.current?.abort();
  }, []);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(
      () => setExpired(true),
      Math.max(0, expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [expiresAt]);

  async function add(incoming) {
    if (busy.current || loading || expired || !token) return;
    const selected = selectFiles(files, incoming);
    const added = selected.files.slice(files.length);
    setErrors(selected.errors);
    if (!added.length) return;
    busy.current = true;
    setLoading(true);
    const controller = new AbortController();
    active.current = controller;
    const entries = added.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      status: "uploading",
      local: true,
    }));
    setFiles((previous) => [...previous, ...entries]);
    const update = (id, patch) => {
      if (!controller.signal.aborted)
        setFiles((previous) =>
          previous.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        );
    };
    for (let i = 0; i < added.length; i++) {
      if (controller.signal.aborted) break;
      try {
        const document = await uploadDocument(added[i], {
          token,
          signal: controller.signal,
          onProcessing: () => update(entries[i].id, { status: "processing" }),
        });
        update(entries[i].id, { ...document, local: false });
      } catch (error) {
        update(entries[i].id, { status: "error", error: errorMessage(error) });
        if (error.code === "SESSION_EXPIRED") setExpired(true);
      }
    }
    busy.current = false;
    if (!controller.signal.aborted) setLoading(false);
  }
  async function remove(file) {
    if (busy.current || loading) return;
    busy.current = true;
    setLoading(true);
    setErrors([]);
    try {
      if (!file.local && !expired)
        await apiJSON(`/documents/${file.id}`, { method: "DELETE", token });
      setFiles((previous) => previous.filter((item) => item.id !== file.id));
    } catch (error) {
      handleError(error);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }
  return {
    files,
    token,
    loading,
    errors,
    expired,
    aiConfigured,
    expiresAt,
    add,
    remove,
    reconnect: () => connect(),
    newSession: () => connect(true),
    markExpired: () => setExpired(true),
    ready:
      Boolean(token) &&
      !loading &&
      !expired &&
      files.some((file) => file.status === "ready"),
  };
}
