import React, { useState } from "react";
import { answerToText } from "../services/researchService.js";

export default function AnswerCard({
  answer,
  canRegenerate,
  pending,
  onRegenerate,
  status = "complete",
  failedAttempt,
  attemptError,
  previousAnswer,
}) {
  const [copyStatus, setCopyStatus] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `${status === "complete" ? "" : "Chưa hoàn tất\n\n"}${answerToText(answer)}`,
      );
      setCopyStatus("Đã sao chép câu trả lời.");
    } catch {
      setCopyStatus(
        "Không thể sao chép. Bạn có thể chọn văn bản và sao chép thủ công.",
      );
    }
  }
  return (
    <article className="answer-card">
      <div className="answer-label">
        CÂU TRẢ LỜI AI{" "}
        <span>
          {status === "streaming"
            ? "Đang nhận"
            : status === "incomplete"
              ? "Chưa hoàn tất"
              : "Hoàn tất"}
        </span>
      </div>
      {answer.summary?.trim() && (
        <section>
          <h3>Trả lời</h3>
          <p>{answer.summary}</p>
        </section>
      )}
      {[
        ["key_points", "Ý chính"],
        ["risks", "Rủi ro"],
        ["actions", "Hành động đề xuất"],
      ].map(
        ([key, title]) =>
          answer[key]?.some((item) => item.trim()) && (
            <section key={key}>
              <h3>{title}</h3>
              <ul>
                {answer[key]
                  .filter((item) => item.trim())
                  .map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
              </ul>
            </section>
          ),
      )}
      {previousAnswer && (
        <p className="small muted">
          Đang tạo lại. Đáp án cũ sẽ được giữ nếu lần này thất bại.
        </p>
      )}
      {failedAttempt && (
        <details className="failed-attempt">
          <summary>Lần tạo lại chưa hoàn tất — đáp án cũ đã được giữ</summary>
          <p>{attemptError}</p>
          <div className="partial-text">
            {answerToText(failedAttempt) || "Chưa nhận được nội dung mới."}
          </div>
        </details>
      )}
      <div className="answer-actions">
        <button className="text-button" onClick={copy}>
          ⧉ Sao chép
        </button>
        {canRegenerate && (
          <button
            className="text-button"
            onClick={onRegenerate}
            disabled={pending}
          >
            {status === "incomplete" || failedAttempt
              ? "↻ Thử lại"
              : "↻ Tạo lại"}
          </button>
        )}
      </div>
      <p role="status" className="copy-status">
        {copyStatus}
      </p>
    </article>
  );
}
