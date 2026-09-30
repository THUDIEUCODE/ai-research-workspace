import React, { useRef } from "react";

export default function ChatInput({
  value,
  setValue,
  onSend,
  pending,
  hasDocuments,
}) {
  const composing = useRef(false);
  function submit(event) {
    event.preventDefault();
    if (!value.trim() || pending || !hasDocuments || composing.current) return;
    onSend(value);
    setValue("");
  }
  return (
    <form className="composer" onSubmit={submit}>
      <label htmlFor="question">Câu hỏi của bạn</label>
      <div className="input-shell">
        <textarea
          id="question"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Bạn muốn tìm hiểu điều gì từ tài liệu?"
          rows={2}
          maxLength={4000}
          disabled={pending}
          aria-describedby="question-help"
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
          }}
          onKeyDown={(event) => {
            // keyCode 229 bảo vệ thêm cho trình duyệt đang kết thúc phiên IME.
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              !composing.current &&
              event.keyCode !== 229
            )
              submit(event);
          }}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!value.trim() || pending || !hasDocuments}
          aria-label="Gửi câu hỏi"
        >
          <span>Gửi</span> ↑
        </button>
      </div>
      <div className="composer-footer">
        <span id="question-help">
          {hasDocuments
            ? "Enter để gửi · Shift + Enter để xuống dòng"
            : "Cần ít nhất một tài liệu sẵn sàng trong phiên còn hạn."}
        </span>
        <span>{value.length}/4000</span>
      </div>
    </form>
  );
}
