# AI Research Workspace

Không gian nghiên cứu dành cho sinh viên và người cần đọc nhiều tài liệu: tải PDF/TXT, đặt câu hỏi tiếp nối và xem câu trả lời tiếng Việt có cấu trúc. Giao diện giữ lịch sử trong tab, hỗ trợ sao chép, tạo lại và dừng phản hồi.

**Luồng chính dùng backend và Google GenAI SDK, không trả đáp án demo.** Ngày 29/09/2026 đã thử Gemini thật với bốn dạng câu hỏi trên `samples/research-notes.txt`: ngân sách, tóm tắt, rủi ro và thông tin không có trong tài liệu; kết quả phù hợp trong lượt thử này. Kiểm thử tự động vẫn dùng provider/SSE mock riêng trong `tests`; không có chế độ mock trong ứng dụng chạy bình thường. Kết quả một lượt thử không bảo đảm mọi phản hồi AI đều đúng.

## Chạy trên Windows

Dự án chuyển từ OpenAI vì người dùng cho biết không có credit và muốn dùng **Gemini Developer API Free Tier**. Dùng SDK `@google/genai`, không dùng Vertex AI, không bật billing, không tự đổi model. Google AI Pro không được coi là bằng chứng có quota API. Tạo key ở [Google AI Studio](https://aistudio.google.com/apikey), kiểm tra project đang ở Free Tier; nếu không được cấp quota thì dừng và kiểm tra quyền/khu vực, không cần nạp tiền để làm theo dự án này. Phần mềm không thể xác minh tier của key: nếu tự đưa key của project trả phí vào, lời gọi vẫn theo billing của project đó.

Model cấu hình là `gemini-3.5-flash-lite`, có Free Tier text input/output theo bảng giá Google tại thời điểm tra cứu. SDK không tự retry (`attempts: 1`); gặp 429 thì chặn thêm yêu cầu AI trong phiên 60 giây. Hạn mức ngày có thể cần chờ lâu hơn; không bấm thử lại liên tục. Giới hạn của ứng dụng không thay thế quota Google.

Theo [điều khoản dịch vụ không trả phí](https://ai.google.dev/gemini-api/terms), Google có thể dùng nội dung để cải thiện sản phẩm và có người đánh giá dữ liệu, tùy điều khoản áp dụng theo khu vực. Chỉ dùng tài liệu công khai/không nhạy cảm; không gửi dữ liệu cá nhân hoặc bí mật.

Yêu cầu **Node.js 24 LTS** và npm. Mở terminal tại thư mục chứa `package.json`.

```powershell
npm.cmd install
Copy-Item .env.example .env
```

Chỉ chạy lệnh copy khi chưa có `.env`, tránh ghi đè cấu hình đã điền. Mở `.env` **ở thư mục gốc dự án**, ngang hàng `package.json`, và tự điền:

```dotenv
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
PORT=3001
```

Không dán key vào chat, không đặt trong `VITE_*`, frontend hoặc Git. `.gitignore` bỏ qua `.env` và `.env.*`, chỉ cho phép `.env.example`. SDK dùng key ở backend; không log key hoặc nội dung tài liệu. Thay `.env` thì khởi động lại backend.

Mở **hai terminal**, đều ở thư mục gốc:

```powershell
# Terminal 1: Express backend
npm.cmd run dev:server
```

```powershell
# Terminal 2: Vite frontend
npm.cmd run dev
```

Mở URL Vite in ra, thường là **http://localhost:5173**. Backend mặc định ở cổng 3001. Frontend gọi URL tương đối `/api`; Vite chuyển tiếp sang backend qua `vite.config.js`. Nếu đổi `PORT` khi phát triển, sửa cổng proxy tương ứng trong file này. Không mở `index.html` bằng Live Server hay `file://`: JSX cần Vite biên dịch.

Trên hệ thống không chặn `npm.ps1`, có thể dùng `npm` thay cho `npm.cmd`. Không cần thay execution policy của Windows. Không có key vẫn chạy được giao diện, upload và đọc tài liệu; khi hỏi AI sẽ báo thiếu cấu hình, không tự trả dữ liệu mẫu.

## Cách dùng

1. Chọn tối đa 3 PDF/TXT. Theo dõi trạng thái đang tải lên → đang đọc tài liệu → sẵn sàng hoặc lỗi. Tệp lỗi có thông báo; xóa và chọn lại. Nếu mất mạng khi upload, bấm **Kết nối lại / Đồng bộ tệp** để kiểm tra tệp đã có trên server.
2. Khi có ít nhất một tài liệu sẵn sàng, nhập câu hỏi. Enter gửi; Shift+Enter xuống dòng; có chặn Enter khi đang composition IME. Câu hỏi tối đa 4.000 ký tự.
3. Xem câu trả lời trực tiếp trong **Trả lời** (`summary`). Câu hỏi ngày/số lượng/ngân sách thường chỉ cần phần này. **Ý chính, Rủi ro, Hành động đề xuất** chỉ xuất hiện khi có nội dung liên quan; kể cả khi streaming, phần rỗng hoặc chỉ có khoảng trắng không dựng tiêu đề. AI được hướng dẫn không lặp thông tin, không tự thêm rủi ro/lời khuyên để điền schema và nói rõ khi không tìm thấy đáp án. Đây là hướng dẫn model, cần kiểm tra chất lượng với AI thật.
4. Có thể **Dừng tạo câu trả lời**. Phần đã nhận được giữ với nhãn **Chưa hoàn tất**, sau đó thử lại. Khi đang nhận, không gửi thêm hoặc thay đổi tài liệu.
5. **Tạo lại** gọi một yêu cầu AI mới cho câu hỏi gần nhất, không thêm câu hỏi và không đưa đáp án bị thay thế vào context. Nếu thất bại, phục hồi đáp án cũ; phần mới dở dang nằm trong mục có thể mở xem.
6. **Sao chép** xuất văn bản có tiêu đề, báo thành công/thất bại. Clipboard cần localhost hoặc HTTPS và quyền trình duyệt; có thể chọn văn bản để sao chép thủ công.
7. Muốn thay đổi bộ tài liệu sau khi chat, bấm **Hội thoại mới** và xác nhận xóa lịch sử tab. Tài liệu còn hạn được giữ để tiếp tục chỉnh. Khi phiên hết hạn, nút đổi thành **Tạo phiên mới**, yêu cầu tải lại tài liệu.

Lịch sử văn bản, ID bộ tài liệu gắn với hội thoại và mã phiên ngẫu nhiên được lưu trong `sessionStorage`, không lưu API key hoặc toàn bộ tài liệu. Sau khi tải lại trang, lịch sử vẫn xem được; frontend kiểm tra lại phiên/tài liệu trên server. Nếu bộ ID tài liệu thay đổi (ví dụ từ một tab khác), cần bắt đầu hội thoại mới để không trộn ngữ cảnh. Lịch sử chỉ ghi sau khi lượt xử lý kết thúc, nên tải lại giữa stream có thể mất lượt đang nhận. Nếu storage bị chặn/đầy, giao diện thông báo và tiếp tục dùng state trong bộ nhớ.

## Công nghệ và cấu trúc

React + Vite + JavaScript, CSS thuần; React hooks, không Redux/Context. Backend dùng Express, Multer (upload RAM), pdf-parse, Google GenAI SDK, Zod (schema), express-rate-limit. Playwright chỉ là dev dependency cho kiểm thử trình duyệt.

```text
src/
  App.jsx                       Ghép hai khu vực và khóa ngữ cảnh tài liệu
  components/                   DocumentPanel, FileItem, ChatPanel,
                                MessageList, AnswerCard, ChatInput
  hooks/useDocuments.js         Phiên, upload, trạng thái, xóa, hết hạn
  hooks/useChat.js               Hội thoại, streaming, dừng, thử lại, tạo lại
  services/researchService.js    Fetch API, đọc NDJSON và lỗi kết nối
  utils/                        Giới hạn tệp và lưu/chuyển lịch sử
  styles.css                    Giao diện responsive
server/
  index.js                      Khởi động Express, dọn phiên hết hạn
  app.js                        API routes, auth phiên, streaming, giới hạn
  sessionStore.js                Kho RAM tách phiên, TTL, ngân sách bộ nhớ
  documents.js                  Kiểm tra nội dung và điều phối đọc PDF
  pdfWorker.js                  Tiến trình Node con đọc PDF, không phải thread
  ai.js                         Prompt, context budget, Google GenAI SDK và schema
  answerParser.js               Tokenizer JSON tăng dần, snapshot và kiểm tra EOF
  errors.js                     Chuyển lỗi nội bộ thành thông báo an toàn
shared/answer.js                 Dạng đáp án, partial snapshot và sao chép
tests/                          Unit/API/SDK mock và browser E2E
samples/research-notes.txt        Tài liệu tự tạo để thử bằng AI thật
vite.config.js                  Proxy /api cho dev/preview
.env.example                    Cấu hình mẫu, không chứa key thật
DEMO_SCRIPT.md                  Kịch bản video tối đa 5 phút
AI_WORKLOG.md                   Nhật ký hỗ trợ AI và kết quả quan sát
```

## Luồng dữ liệu và streaming

```text
Browser chọn File → POST /api/documents → Multer RAM → kiểm tra/đọc TXT hoặc PDF
                 ← status: processing ← complete: metadata (không trả toàn văn)

Browser gửi câu hỏi + ID tệp + lịch sử → POST /api/chat
 → xác thực ID thuộc phiên → ghép toàn văn + lịch sử + system prompt
 → kiểm tra context → Google GenAI models.generateContentStream + JSON Schema
 ← text chunks → @streamparser/json → NDJSON data → React cập nhật từng phần
 ← STOP + JSON hoàn chỉnh + Zod validate → NDJSON complete → hoàn tất
```

Chọn **NDJSON qua fetch streaming** vì cùng một POST gửi được câu hỏi/lịch sử và đọc được `ReadableStream`, không cần WebSocket. Mỗi dòng là một JSON hoàn chỉnh có `type`:

- `status`: đang kết nối AI hoặc đang xử lý tệp.
- `data`: snapshot đáp án đã parse được đến thời điểm hiện tại, có thể chưa đầy đủ.
- `complete`: kết quả cuối được backend xác thực schema, hoặc metadata tài liệu sẵn sàng.
- `error`: mã và thông báo an toàn; không có stack trace.

Backend cấu hình `responseMimeType: application/json` và `responseJsonSchema`. `server/answerParser.js` dùng tokenizer tăng dần của `@streamparser/json` để đọc JSON còn dở, chỉ chuyển tiếp trường string/string-array. Không dùng regex hoặc `JSON.parse` trên JSON chưa hoàn chỉnh, không giả streaming từ kết quả đã hoàn thành. Frontend dùng `TextDecoder` chế độ stream để bảo toàn UTF-8, giữ phần dòng chưa đủ qua nhiều chunk và chỉ `JSON.parse` dòng NDJSON hoàn chỉnh. EOF thiếu `complete` là lỗi. Cuối stream phải có finish reason `STOP`, JSON hoàn chỉnh và đạt Zod schema; frontend kiểm tra lại hình dạng.

Nút dừng → `AbortController` của fetch → socket đóng ở Express → abort signal truyền vào Google GenAI SDK. Timeout AI là 90 giây, frontend 100 giây; upload frontend 35 giây, đọc PDF 15 giây. Mỗi yêu cầu gắn với controller riêng, yêu cầu cũ không được sửa hội thoại đã reset. Khi người dùng cuộn lên đọc lịch sử, token mới không kéo họ về cuối. Chỉ các nhãn trạng thái được thông báo qua live region, không đọc lại toàn bộ đáp án theo token.

Prompt yêu cầu trả lời tiếng Việt chỉ từ tài liệu, nói **“Không tìm thấy thông tin này trong tài liệu”** khi thiếu dữ kiện, ghi rõ đề xuất suy ra và coi chỉ dẫn trong tài liệu là dữ liệu không đáng tin cậy. Đây là hướng dẫn cho model, không phải bảo đảm rằng AI không thể trả lời sai; cần kiểm chứng với tài liệu thật trước khi nộp.

## API và phiên

Abort dừng việc nhận dữ liệu phía client và được truyền đến SDK; theo tài liệu SDK, **không bảo đảm Google ngừng xử lý hoặc hoàn lại quota**. Lỗi key, quyền/model, quota, mạng, timeout, safety và schema được chuyển thành thông báo riêng, không đưa lỗi thô chứa dữ liệu cấu hình ra giao diện.

| API                         | Chức năng                                                            |
| --------------------------- | -------------------------------------------------------------------- |
| `GET /api/health`           | Backend sống và đã có cấu hình key hay chưa; không kiểm tra key đúng |
| `POST /api/sessions`        | Tạo mã phiên ngẫu nhiên 256 bit, trả thời điểm hết hạn               |
| `GET /api/documents`        | Danh sách metadata tài liệu của phiên                                |
| `POST /api/documents`       | Một tệp multipart; frontend xếp hàng khi chọn nhiều tệp              |
| `DELETE /api/documents/:id` | Xác thực quyền sở hữu rồi xóa khỏi RAM                               |
| `POST /api/chat`            | Kiểm tra quyền tài liệu, context và trả luồng NDJSON                 |

Các API tài liệu/chat cần `Authorization: Bearer <session-token>`. Token là khả năng truy cập phiên, không phải đăng nhập. Không chia sẻ token. Không bật CORS công khai; dev dùng proxy và production dùng cùng origin. Không có endpoint tải toàn văn tài liệu sang trình duyệt khác.

## Giới hạn rõ ràng

| Hạng mục       | Giới hạn prototype                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| Tệp            | 3 tệp/phiên, 5 MiB/tệp (giao diện ghi 5 MB), PDF tối đa 100 trang                                    |
| TXT            | Văn bản thuần UTF-8; từ chối UTF-8 lỗi và ký tự điều khiển nhị phân                                  |
| PDF            | Kiểm tra chữ ký `%PDF-`, parse nội dung; báo riêng mật khẩu, hỏng, không có chữ, quá thời gian       |
| OCR            | Chưa có; PDF scan cần chuyển sang văn bản bằng công cụ khác                                          |
| Tổng tài liệu  | Tối đa 48.000 byte văn bản UTF-8 đã trích xuất/phiên                                                 |
| Context        | 64.000 đơn vị ngân sách: byte UTF-8 của messages/schema + 2.048 overhead + 3.000 token đầu ra        |
| Lịch sử gửi AI | Tối đa 40 tin nhắn trước câu hỏi hiện tại, mỗi tin tối đa 24.000 ký tự; còn phụ thuộc context budget |
| Phiên          | Hết hạn tuyệt đối sau 1 giờ kể từ lúc tạo; tối đa 50 phiên; dọn định kỳ 30 giây và khi truy cập      |
| Bộ nhớ         | Văn bản toàn kho tối đa 32 MiB, còn bị giới hạn bởi số phiên và 48.000 byte/phiên                    |
| Đồng thời      | 1 tác vụ/phiên, tối đa 2 upload/đọc PDF và 3 yêu cầu AI toàn server                                  |
| Tần suất       | 6 yêu cầu AI/phút/phiên, 100 request API/phút/IP                                                     |

Đếm byte UTF-8 là cách dự trù bảo thủ, **không phải đo token chính xác**. Có tính tài liệu, tên tệp, lịch sử, schema, system prompt và chỗ cho đầu ra. Vượt giới hạn thì từ chối kèm hướng dẫn giảm tài liệu/bắt đầu hội thoại mới; không âm thầm cắt nội dung. Nếu đổi model, chọn model hỗ trợ Gemini generateContentStream, structured output, streaming và context lớn hơn ngân sách này.

File gốc chỉ ở RAM trong lúc upload/đọc; không ghi tệp tạm lên đĩa. PDF chạy trong tiến trình riêng với heap V8 128 MiB và timeout; giới hạn heap không bao gồm toàn bộ native memory. Dữ liệu phiên mất khi server khởi động lại. Chưa hỗ trợ lưu lâu dài, nhiều instance dùng chung kho, OCR, bảng phức tạp, trích dẫn nguồn, đăng nhập hoặc database.

## Kiểm thử

```powershell
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

`test:e2e` tự build, khởi động backend ở cổng ngẫu nhiên và dùng Chromium, không cần hai dev server. Ảnh mobile ghi trong `test-results/` (Git bỏ qua). Fixture PDF có mật khẩu trong `tests/fixtures/password.pdf` chỉ chứa nội dung kiểm thử, được tạo bằng PDFKit chạy ở thư mục tạm; PDFKit không là dependency của sản phẩm.

Các test API đọc TXT/PDF thật, kiểm tra tệp lỗi, giới hạn, cách ly phiên, streaming, hủy, schema, timeout và thiếu key. Test SDK dùng Google GenAI SDK thật với transport SSE mock để xác minh parse tăng dần và abort. E2E dùng React + Express + trình đọc PDF thật, nhưng **provider AI được mock**. Các kiểm tra “có thông tin/không có thông tin/hỏi tiếp” ở E2E xác minh UI và chuyển context; **không chứng minh model thật hiểu tài liệu**.

Kết quả và những lần thất bại thực tế ghi trong `AI_WORKLOG.md`. Chưa kiểm tra bộ gõ IME thật (mới mô phỏng composition), Safari/Firefox, điện thoại thật hoặc trình đọc màn hình.

### Thử thủ công với Gemini thật trước khi nộp

Sau khi cấu hình key hợp lệ và khởi động lại backend:

1. Tải `samples/research-notes.txt` và một PDF có thể chọn chữ.
2. Hỏi “Ngân sách của dự án là bao nhiêu?” → kiểm tra câu trả lời khớp tài liệu.
3. Hỏi “Ngân sách đó được chia thành những khoản nào?” → kiểm tra câu hỏi tiếp nối dùng đúng ngữ cảnh.
4. Hỏi “Tên nhà tài trợ là gì?” → tài liệu mẫu không có thông tin này, cần nói rõ không tìm thấy.
5. Quan sát nội dung xuất hiện khi nhãn còn đang nhận, thử dừng, thử lại, sao chép và tạo lại. Lưu ý đáp án quá ngắn có thể stream xong rất nhanh.
6. Thử tệp rỗng/sai định dạng/scan/mật khẩu; thu màn hình về 375 px.
7. Tắt backend để kiểm tra mất kết nối. Chỉ thử sai key bằng cách tự sửa `.env` ở máy, không quay hoặc chia sẻ màn hình chứa key. Khôi phục key sau đó.

## Build và triển khai (chưa tự deploy)

```powershell
npm.cmd run build
npm.cmd start
```

Express phục vụ cả `dist/` và `/api`, mở cổng `PORT` (mặc định http://localhost:3001). `npm.cmd run preview` chỉ xem frontend build với proxy dev, không thay backend production.

Chọn môi trường Node 24 chạy process lâu dài, hỗ trợ tiến trình con và phản hồi HTTP streaming. Cài dependencies, build, cung cấp `GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT` bằng secret/environment của máy chủ; chạy `npm start`. Dùng HTTPS; reverse proxy phải tắt response buffering/compression cho `/api/chat` và `/api/documents`, timeout ít nhất 110 giây. Backend đã gửi `X-Accel-Buffering: no` và `Cache-Control: no-transform`; vẫn cần kiểm tra cấu hình nền tảng thực tế.

Không đưa API key vào quá trình build frontend. Không chỉ upload `dist/` lên static hosting rồi mong API hoạt động. Prototype nên chạy một instance vì kho RAM cục bộ; cần kho phiên dùng chung trước khi scale. Sau reverse proxy, cấu hình `trust proxy` theo số hop/IP proxy đã xác minh để rate limit nhận đúng IP, không bật tin cậy mọi proxy một cách tùy tiện. Chưa có URL triển khai hoặc kết quả thử streaming trên hosting.

## AI hỗ trợ và nguồn kỹ thuật

Codex hỗ trợ đọc yêu cầu, tổ chức component/hook/service, triển khai backend và frontend, tra cứu tài liệu, viết/chạy kiểm thử, sửa lỗi và soạn tài liệu. Người nộp cần tự đọc code, cấu hình key, thử model thật và giải thích được luồng dữ liệu. Nhật ký trung thực ở `AI_WORKLOG.md`.

- [Gemini Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output): JSON Schema và streaming.
- [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) và [giá Free Tier](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite): model cấu hình hiện tại, Standard text input/output có Free Tier; quyền và quota thực tế phụ thuộc project.
- [Google GenAI JavaScript SDK](https://googleapis.github.io/js-genai/release_docs/classes/models.Models.html): `generateContentStream`.
- [Cấu hình SDK](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html): schema và giới hạn abort phía client.
- [Retry SDK](https://googleapis.github.io/js-genai/release_docs/interfaces/types.HttpRetryOptions.html): `attempts: 1` không tự thử lại.
- [Streamparser JSON](https://github.com/juanjoDiaz/streamparser-json): parser tăng dần.
- [pdf-parse](https://github.com/mehmet-kozan/pdf-parse): API `PDFParse`, `getInfo`, `getText`, `destroy` và lỗi mật khẩu.

Không push Git hoặc deploy trong lần triển khai này.
