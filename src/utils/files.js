export const MAX_FILES = 3;
export const MAX_SIZE = 5 * 1024 * 1024;

export function formatSize(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function selectFiles(existing, incoming) {
  const files = [...existing];
  const errors = [];
  for (const file of incoming) {
    if (!/\.(pdf|txt)$/i.test(file.name)) {
      errors.push(`${file.name}: chỉ hỗ trợ PDF hoặc TXT.`);
    } else if (!file.size) {
      errors.push(`${file.name}: tệp rỗng, hãy chọn tệp có nội dung.`);
    } else if (file.size > MAX_SIZE) {
      errors.push(`${file.name}: vượt giới hạn 5 MB.`);
    } else if (
      files.some(
        (item) =>
          item.name === file.name &&
          item.size === file.size &&
          (!item.lastModified || item.lastModified === file.lastModified),
      )
    ) {
      errors.push(`${file.name}: tệp này đã được chọn.`);
    } else if (files.length >= MAX_FILES) {
      errors.push(`${file.name}: chỉ được chọn tối đa 3 tệp.`);
    } else {
      files.push(file);
    }
  }
  return { files, errors };
}
