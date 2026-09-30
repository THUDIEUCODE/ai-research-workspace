import React, { useState } from "react";
import MessageList from "./MessageList.jsx";
import ChatInput from "./ChatInput.jsx";

export default function ChatPanel({
  chat,
  hasDocuments,
  expired,
  onNewConversation,
  documentsLoading,
}) {
  const [question, setQuestion] = useState("");
  return (
    <section className="chat-panel" aria-labelledby="chat-title">
      <div className="chat-heading">
        <div>
          <h2 id="chat-title">Trò chuyện nghiên cứu</h2>
          <p className="muted small">
            Một câu hỏi. Nhiều góc nhìn rõ ràng hơn.
          </p>
        </div>
        <span className="session-dot">Phiên hiện tại</span>
      </div>
      <div className="conversation-controls">
        <p>
          {expired
            ? "Phiên hết hạn. Lịch sử vẫn xem được."
            : "Hội thoại gắn với bộ tài liệu hiện tại."}
        </p>
        <button
          className="text-button"
          disabled={chat.pending || documentsLoading}
          onClick={() => {
            if (
              chat.messages.length &&
              !window.confirm(
                "Bắt đầu hội thoại mới sẽ xóa lịch sử trong tab này. Tiếp tục?",
              )
            )
              return;
            setQuestion("");
            onNewConversation();
          }}
        >
          {expired ? "Tạo phiên mới" : "Hội thoại mới"}
        </button>
      </div>
      {expired && (
        <p className="expiry-notice" role="alert">
          Tạo phiên mới và tải lại tài liệu trước khi tiếp tục hỏi. Bạn có thể
          sao chép lịch sử hiện tại trước khi xóa.
        </p>
      )}
      {chat.storageWarning && (
        <p className="expiry-notice" role="status">
          {chat.storageWarning}
        </p>
      )}
      {chat.contextChanged && (
        <p className="expiry-notice" role="alert">
          Bộ tài liệu đã thay đổi so với lịch sử này. Bắt đầu hội thoại mới
          trước khi hỏi để không lẫn ngữ cảnh.
        </p>
      )}
      <MessageList
        messages={chat.messages}
        pending={chat.pending}
        phase={chat.phase}
        retry={chat.retry}
        disabled={!hasDocuments}
        onSuggestion={(text) => {
          setQuestion(text);
          document.getElementById("question")?.focus();
        }}
      />
      {chat.error && (
        <div className="chat-error error-box" role="alert">
          <p>{chat.error}</p>
          <button
            className="text-button"
            disabled={chat.pending || !hasDocuments}
            onClick={chat.retry}
          >
            Thử lại câu hỏi gần nhất
          </button>
        </div>
      )}
      <div className="stream-status" role="status">
        {chat.pending
          ? chat.phase === "streaming"
            ? "Đang nhận phản hồi AI…"
            : "Đang kết nối AI…"
          : chat.phase === "complete"
            ? "Đã hoàn tất câu trả lời."
            : chat.phase === "incomplete"
              ? "Lần tạo vừa rồi chưa hoàn tất."
              : ""}
      </div>
      {chat.pending && (
        <button className="stop-button" onClick={chat.stop}>
          Dừng tạo câu trả lời
        </button>
      )}
      <ChatInput
        value={question}
        setValue={setQuestion}
        onSend={chat.send}
        pending={chat.pending}
        hasDocuments={hasDocuments}
      />
    </section>
  );
}
