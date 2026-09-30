import React, { useEffect, useRef } from "react";
import AnswerCard from "./AnswerCard.jsx";

export default function MessageList({
  messages,
  pending,
  phase,
  retry,
  disabled,
  onSuggestion,
}) {
  const container = useRef(null);
  const follow = useRef(true);
  useEffect(() => {
    if (!messages.length) follow.current = true;
    if (follow.current && container.current)
      container.current.scrollTop = container.current.scrollHeight;
  }, [messages, pending]);
  return (
    <div
      className="message-list"
      ref={container}
      onScroll={() => {
        const el = container.current;
        follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      role="region"
      aria-label="Lịch sử trò chuyện"
      tabIndex={0}
    >
      {!messages.length && (
        <div className="chat-empty">
          <div className="empty-mark" aria-hidden="true">
            ✧
          </div>
          <span className="eyebrow">TỪ TÀI LIỆU ĐẾN Ý TƯỞNG</span>
          <h2>Bắt đầu một góc nhìn mới</h2>
          <p>
            Chọn tài liệu ở bên trái, sau đó đặt câu hỏi.
            <br />
            AI sẽ trả lời dựa trên nội dung đã đọc được từ tài liệu.
          </p>
          <div className="suggestions">
            {[
              "Tóm tắt các ý chính",
              "Những rủi ro cần lưu ý là gì?",
              "Đề xuất các bước tiếp theo",
            ].map((text) => (
              <button key={text} onClick={() => onSuggestion(text)}>
                {text}
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <small>Gợi ý chỉ điền câu hỏi. Bạn kiểm tra rồi bấm gửi.</small>
        </div>
      )}
      {messages.map((message, index) =>
        message.role === "user" ? (
          <article key={message.id} className="user-message">
            <span>Bạn</span>
            <p>{message.text}</p>
          </article>
        ) : (
          <div className="assistant-message" key={message.id}>
            <div className="assistant-avatar" aria-hidden="true">
              ✧
            </div>
            <AnswerCard
              answer={message.answer}
              status={message.status}
              failedAttempt={message.failedAttempt}
              attemptError={message.attemptError}
              previousAnswer={message.previousAnswer}
              canRegenerate={index === messages.length - 1}
              pending={pending || disabled}
              onRegenerate={retry}
            />
          </div>
        ),
      )}
      {pending && (
        <div className="loading" role="status">
          <span className="spinner" />
          {phase === "streaming" ? "Đang nhận nội dung…" : "Đang kết nối AI…"}
        </div>
      )}
    </div>
  );
}
