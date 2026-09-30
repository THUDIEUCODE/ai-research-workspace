import React from "react";
import DocumentPanel from "./components/DocumentPanel.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import { useChat } from "./hooks/useChat.js";
import { useDocuments } from "./hooks/useDocuments.js";

export default function App() {
  const documents = useDocuments();
  const chat = useChat(documents);
  const locked = chat.messages.length > 0;
  function newConversation() {
    chat.reset();
    if (documents.expired) void documents.newSession();
  }
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ✧
          </span>
          <div>
            <h1>AI Research Workspace</h1>
            <p>Không gian nghiên cứu của bạn</p>
          </div>
        </div>
        <span className="version">
          BẢN THỬ NGHIỆM <span>01</span>
        </span>
      </header>
      <main>
        <div className="workspace-intro">
          <div>
            <span className="eyebrow">KHÁM PHÁ · KẾT NỐI · HIỂU SÂU</span>
            <h2>Ý tưởng lớn bắt đầu từ câu hỏi nhỏ.</h2>
          </div>
          <span className="workspace-tag">Workspace / 01</span>
        </div>
        <div className="demo-banner">
          <span aria-hidden="true">ⓘ</span>
          <div>
            <strong>
              {documents.aiConfigured === false
                ? "Chưa cấu hình API key — tải tài liệu vẫn hoạt động"
                : "Nghiên cứu dựa trên tài liệu của bạn"}
            </strong>
            <p>
              {documents.aiConfigured === false
                ? "Điền GEMINI_API_KEY trong .env ở backend rồi khởi động lại server. Không có câu trả lời mẫu thay thế."
                : "Văn bản tài liệu được gửi đến Gemini khi bạn hỏi. Với Free Tier, Google có thể dùng dữ liệu để cải thiện sản phẩm; chỉ dùng tài liệu không nhạy cảm."}
            </p>
          </div>
        </div>
        <div className="workspace">
          <DocumentPanel
            documents={documents}
            locked={locked}
            pending={chat.pending}
          />
          <ChatPanel
            chat={chat}
            hasDocuments={documents.ready && !chat.contextChanged}
            expired={documents.expired}
            onNewConversation={newConversation}
            documentsLoading={documents.loading}
          />
        </div>
      </main>
      <footer className="app-footer">
        <span>AI Research Workspace</span>
        <span>Rõ thông tin. Sáng ý tưởng.</span>
      </footer>
    </div>
  );
}
