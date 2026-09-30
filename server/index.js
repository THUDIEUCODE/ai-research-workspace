import { createApp } from "./app.js";

const port = Number(process.env.PORT || 3001);
const { app, store } = createApp();
const cleanup = setInterval(store.sweep, 30000);
cleanup.unref();
const server = app.listen(port, () => {
  console.log(`AI Research Workspace backend: http://localhost:${port}`);
  console.log(
    process.env.GEMINI_API_KEY?.trim()
      ? "Đã cấu hình API key (chưa kiểm chứng kết nối)."
      : "Chưa có GEMINI_API_KEY. Upload vẫn hoạt động; AI sẽ báo thiếu cấu hình.",
  );
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;
