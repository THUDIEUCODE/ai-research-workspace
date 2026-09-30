import React from "react";
import { formatSize } from "../utils/files.js";

export default function FileItem({ file, onRemove, disabled, expired }) {
  const status = expired
    ? "Phiên hết hạn"
    : {
        uploading: "Đang tải lên…",
        processing: "Đang đọc tài liệu…",
        ready: "Sẵn sàng",
        error: "Lỗi xử lý",
      }[file.status];
  return (
    <li className="file-item">
      <span
        className={`file-icon ${/\.pdf$/i.test(file.name) ? "pdf" : ""}`}
        aria-hidden="true"
      >
        {file.name.split(".").at(-1).toUpperCase()}
      </span>
      <div className="file-info">
        <strong title={file.name}>{file.name}</strong>
        <span>
          {formatSize(file.size)} · {status}
        </span>
        {file.error && (
          <p className="file-error" role="alert">
            {file.error} Xóa tệp lỗi rồi chọn lại.
          </p>
        )}
      </div>
      <button
        className="icon-button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Xóa tệp ${file.name}`}
      >
        ×
      </button>
    </li>
  );
}
