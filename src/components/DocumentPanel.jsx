import React, { useState } from "react";
import FileItem from "./FileItem.jsx";

export default function DocumentPanel({ documents, locked, pending }) {
  const { files, errors } = documents;
  const disabled =
    pending ||
    documents.loading ||
    locked ||
    documents.expired ||
    !documents.token;
  const [collapsed, setCollapsed] = useState(false);
  function handleFiles(event) {
    void documents.add(Array.from(event.target.files));
    event.target.value = "";
  }
  return (
    <aside
      className={`document-panel ${collapsed ? "collapsed" : ""}`}
      aria-label="Quản lý tài liệu"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">NGUỒN NGHIÊN CỨU</span>
          <h2>
            Tài liệu <span className="count">{files.length}/3</span>
          </h2>
        </div>
        <button
          className="collapse-button"
          aria-expanded={!collapsed}
          aria-controls="document-content"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "Mở rộng" : "Thu gọn"}
        </button>
      </div>
      <div id="document-content" className="document-content">
        <p className="muted intro">
          Tập hợp tài liệu cho câu hỏi tiếp theo của bạn.
        </p>
        {locked && (
          <p className="context-note">
            Tài liệu đang gắn với hội thoại này. Bấm “Hội thoại mới” trước khi
            thay đổi tệp.
          </p>
        )}
        <div className={`upload-zone ${disabled ? "disabled" : ""}`}>
          <span className="upload-symbol" aria-hidden="true">
            ↥
          </span>
          <label htmlFor="documents">Chọn tài liệu</label>
          <p>PDF hoặc TXT · Tối đa 5 MB/tệp</p>
          <input
            id="documents"
            type="file"
            accept=".pdf,.txt"
            multiple
            disabled={disabled}
            onChange={handleFiles}
            aria-describedby="file-help"
          />
        </div>
        <p id="file-help" className="small muted">
          Tối đa 3 tệp. PDF có văn bản hoặc TXT UTF-8. Máy chủ đọc tệp và giữ
          văn bản tối đa 1 giờ; chưa hỗ trợ OCR.
        </p>
        {errors.length > 0 && (
          <div className="error-box" role="alert">
            <ul>
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        {(errors.length > 0 || files.some((file) => file.status === "error")) &&
          !documents.expired && (
            <button
              className="text-button"
              disabled={documents.loading || pending}
              onClick={documents.reconnect}
            >
              Kết nối lại / Đồng bộ tệp
            </button>
          )}
        {documents.loading && (
          <p className="small muted" role="status">
            Đang kết nối hoặc xử lý tài liệu…
          </p>
        )}
        {files.length ? (
          <ul className="file-list">
            {files.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                disabled={pending || documents.loading || locked}
                expired={documents.expired}
                onRemove={() => documents.remove(file)}
              />
            ))}
          </ul>
        ) : (
          <div className="files-empty">
            <span aria-hidden="true">▤</span>
            <p>Chưa có tài liệu</p>
            <small>Tài liệu bạn chọn sẽ xuất hiện tại đây.</small>
          </div>
        )}
        <div className="local-note">
          <span aria-hidden="true">◇</span>
          <p>
            <strong>Không gian của phiên hiện tại</strong>
            <br />
            Lịch sử lưu trong tab này. Tài liệu được tách riêng theo phiên và
            mất khi máy chủ khởi động lại.
          </p>
        </div>
      </div>
    </aside>
  );
}
