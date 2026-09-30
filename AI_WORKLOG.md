# Nhật ký hỗ trợ AI

## 30/09/2026 — GitHub và triển khai Render

Thông tin triển khai dưới đây do người thực hiện xác nhận; không phải kết quả Codex tự truy cập/kiểm thử hosting trong lần cập nhật tài liệu này.

- Người thực hiện **tự đưa code lên GitHub và deploy Render**, với hướng dẫn của ChatGPT.
- GitHub: [THUDIEUCODE/ai-research-workspace](https://github.com/THUDIEUCODE/ai-research-workspace).
- Live URL: [ai-research-workspace-a1yf.onrender.com](https://ai-research-workspace-a1yf.onrender.com).
- Gói Render: **Free**. Build Command: `npm ci --include=dev && npm run build`. Start Command: `npm run start`.
- Đã cấu hình `GEMINI_API_KEY` và `GEMINI_MODEL` bằng Environment Variables trên Render; không ghi giá trị vào nhật ký.
- Log Render được xác nhận có “Build successful” và “Your service is live”. Đây chỉ là bằng chứng build/deploy, không chứng minh đầy đủ upload, Gemini, streaming, lịch sử, copy hoặc tạo lại trên hosting.
- Chưa cung cấp bằng chứng kiểm thử đầy đủ bản online. Chưa quay video demo, chưa có link video; `DEMO_SCRIPT.md` chỉ là kịch bản.

### Vai trò các công cụ

- **Codex:** đọc/sửa code, hỗ trợ kiểm thử và tài liệu theo các giai đoạn đã ghi bên dưới. Trong nhiệm vụ hiện tại chỉ cập nhật README và nhật ký, không sửa ứng dụng, đọc `.env`, gọi API, commit, push hoặc deploy.
- **ChatGPT:** theo xác nhận của người thực hiện, giải thích yêu cầu, hỗ trợ soạn prompt, tạo tài liệu mẫu để thử, hướng dẫn GitHub/Render và rà soát tài liệu nộp bài.
- **Gemini API:** dịch vụ AI tích hợp trong sản phẩm để hỏi đáp dựa trên văn bản tài liệu; không phải công cụ được ghi nhận là viết code dự án.

### Phạm vi kết quả và giới hạn hiện tại

Các tests mock và những lượt Gemini thật đã ghi trong nhật ký/`REQUIREMENTS_AUDIT.md` chạy trên môi trường local; không chuyển thành kết quả đạt trên Render. Báo cáo audit phản ánh thời điểm kiểm tra trước xác nhận triển khai, nên nhận xét khi đó chưa tìm thấy Live URL/GitHub không phải trạng thái hiện tại. Checklist online mới nằm trong README và còn để chưa kiểm chứng.

Giữ nguyên các giới hạn: lịch sử sessionStorage chỉ trong cùng tab, có thể mất khi đóng tab/xóa dữ liệu; tài liệu RAM mất khi server restart. Lỗi lịch sử vượt 80 tin nhắn bị bỏ im lặng khi reload đã được audit tái hiện bằng 82 tin nhắn, chưa có xác nhận sửa. Không xóa lỗi này để làm hồ sơ đẹp hơn.

Các mục OpenAI, chưa có key, chưa có Git hoặc chưa deploy bên dưới là **lịch sử tại giai đoạn tương ứng**, không phải trạng thái ngày 30/09 sau triển khai. Các lỗi, giả thuyết sai và kết quả kiểm chứng cũ được giữ lại.

### Nếu có thêm 7 ngày — kế hoạch cập nhật sau triển khai

- Ngày 1: kiểm chứng Gemini thật trên Render với câu có đáp án, thiếu thông tin và hỏi tiếp; đối chiếu tài liệu, ghi rõ kết quả và giới hạn quota.
- Ngày 2: kiểm tra streaming provider → backend → giao diện qua hosting, dừng/tạo lại, timeout và lỗi; không dùng mock hoặc log live thay bằng chứng online.
- Ngày 3: thử PDF tiếng Việt, nhiều phông chữ/bố cục, PDF chữ kèm ảnh và file lỗi; xác nhận phần văn bản đọc được, không tuyên bố có OCR.
- Ngày 4: sửa và kiểm tra lại lỗi lịch sử quá giới hạn; kiểm tra sessionStorage, hết phiên và mất tài liệu khi server restart.
- Ngày 5: thử mobile thật, bàn phím ảo, IME, clipboard và accessibility; cải thiện vấn đề quan sát được.
- Ngày 6: nếu luồng bắt buộc đã ổn định, bổ sung trích dẫn trang/đoạn có thể đối chiếu; không để model tự bịa nguồn.
- Ngày 7: chạy kiểm tra hồi quy, cập nhật kết quả online, quay video tối đa 5 phút và rà soát liên kết/source nộp bài.

## Điều chỉnh câu trả lời theo câu hỏi — 29/09/2026

- Sửa system prompt: summary trả lời trực tiếp; câu hỏi đơn giản ưu tiên câu ngắn, các mảng rỗng; chỉ thêm ý chính/rủi ro/hành động có liên quan và cơ sở, không lặp thông tin hoặc điền cho đủ schema. Có hướng dẫn riêng cho tóm tắt, rủi ro và câu hỏi thiếu đáp án.
- Đổi nhãn summary thành “Trả lời” trên thẻ và nội dung sao chép. Giữ điều kiện ẩn phần rỗng/khoảng trắng sẵn có, schema và luồng Gemini/NDJSON không đổi. Cập nhật README và DEMO_SCRIPT.
- `npm.cmd test`: 31/31 đạt. `npm.cmd run test:e2e`: build đạt; E2E cũ đạt (copy/regenerate/history/error/abort/mobile). Thêm bốn dạng đáp án mock cho câu hỏi ngân sách, tóm tắt, rủi ro, thiếu thông tin; kiểm tra tiêu đề tương ứng và không có tiêu đề khi stream chỉ có khoảng trắng. Mock chỉ kiểm tra giao diện, không chứng minh model làm theo prompt.
- `.env` hiện có key (chỉ kiểm tra boolean, không in key). Đã gọi Gemini thật với tài liệu thực hành sẵn có `samples/research-notes.txt`. Lượt đầu câu hỏi bị mất dấu do pipe PowerShell; model cũng lặp ngân sách và rủi ro giữa các phần. Sửa prompt rõ hơn về việc không lặp con số và để key_points/actions rỗng khi chỉ hỏi rủi ro; chuyển script kiểm tra sang tệp UTF-8 trong test-results (được Git bỏ qua).
- Lượt Gemini thật cuối với đủ dấu: ngân sách trả summary “120 triệu đồng”, cả ba mảng rỗng (3 partial); tóm tắt trả summary khái quát + 5 ý chính, không risks/actions (8 partial); câu hỏi rủi ro trả đúng 2 rủi ro tài liệu, không key_points/actions (4 partial); tên nhà tài trợ trả “Không tìm thấy thông tin này trong tài liệu”, các mảng rỗng (3 partial). Đã đối chiếu với nội dung TXT. Đây là kết quả quan sát của lượt thử, không bảo đảm model không bao giờ lặp hoặc trả sai.

## Sửa đọc PDF — 29/09/2026

- Kiểm tra đúng `samples/ke_hoach_ngay_hoi_doi_sach.pdf` (74.236 byte), không thay bằng dữ liệu khác. Cài thực tế: pdf-parse 2.4.5, pdfjs-dist 5.4.296, Node 24.16.0. API v2 `new PDFParse`, `getInfo`, `getText`, `result.pages[].text` đúng; Buffer qua IPC advanced và bản sao Uint8Array đọc được tiếng Việt.
- Ban đầu đọc trực tiếp và API backend mới thành công nhưng cổng 3001 báo PDF_NO_TEXT. Giả thuyết tiến trình dùng mã cũ chưa đủ: thử khởi động lại vẫn gặp lỗi. Chẩn đoán tạm chỉ ghi tên trường IPC, quan sát thông điệp `{watch:import: ...}` không có text. Node watch gửi thông điệp quản lý dependency trước kết quả PDF; handler cũ nhận mọi message nên kết luận nhầm là không có chữ. Đã gỡ mã ghi chẩn đoán khỏi runtime.
- Sửa giao thức worker: chỉ xử lý message `type: pdf-result`. Bổ sung kiểm tra dữ liệu đầu vào/kết quả trang, stopAtErrors để lỗi parser không bị nuốt thành văn bản rỗng; bắt lỗi khởi tạo/destroy. Văn bản rỗng sau parse thành công có thông báo thận trọng, không khẳng định PDF là scan. Không đổi thư viện, không thêm OCR.
- Upload lại đúng tệp lên cổng 3001 sau sửa nhận `complete`, tài liệu `ready`. Văn bản trích xuất có đủ sáu mục, dấu tiếng Việt, ngân sách 1.200.000 đồng, mục tiêu 85% và câu cuối. Chưa đối chiếu từng ký tự với output pdftotext của người dùng; công cụ pdftotext không có trong PATH máy này.
- Thêm regression test dùng chính PDF và bật WATCH_REPORT_DEPENDENCIES để tái hiện IPC của Node watch. `npm.cmd test`: 31/31 đạt, gồm PDF hỏng/rỗng/mật khẩu và chức năng còn lại. `npm.cmd run build`: thành công. Không gọi AI, không thay đổi key, không push/deploy.
- Lệnh dừng PID cũ báo process không còn tồn tại; không coi thao tác này là đã dừng thành công. Một lệnh đọc mã builtin Node để xác minh watch có TypeError ở phần tử undefined sau khi đã in được biến WATCH_REPORT_DEPENDENCIES; không phải lỗi ứng dụng.

## Bước 3 — Chuyển sang Gemini Developer API Free Tier (28/09/2026)

Ghi chép tại thời điểm chuyển provider ngày 28/09/2026; trạng thái key và kiểm chứng khi đó không đại diện cho các mốc 29–30/09 bên trên.

### Yêu cầu và phần AI hỗ trợ

- Người dùng cho biết OpenAI không có credit và muốn dùng Gemini Free Tier, không bật billing/nạp tiền. Không kiểm tra tài khoản hoặc suy ra quyền API từ Google AI Pro.
- AI đọc mã hiện có, tra tài liệu Google chính thức, thay SDK OpenAI bằng `@google/genai` 2.24.0 và thêm `@streamparser/json` 0.0.26. Không thay thiết kế giao diện, upload, session ownership hay cấu trúc lịch sử.
- Chọn `gemini-3.5-flash-lite`: bảng giá Google xác nhận Standard text input/output có Free Tier; trang model xác nhận structured output; SDK có generateContentStream. Ban đầu cân nhắc 2.5 Flash-Lite, nhưng tài liệu model hướng project mới sang model mới nên đổi cấu hình trước khi hoàn tất. Không tự chuyển model khi chạy.
- Backend gửi system instruction riêng, đổi assistant sang model tại adapter, dùng JSON Schema và streaming thật. Parser tokenizer đọc chuỗi/escape/Unicode qua nhiều chunk; chỉ complete sau STOP, EOF JSON hợp lệ và Zod validation. Giữ NDJSON, partial khi lỗi, phục hồi đáp án cũ khi tạo lại thất bại.
- Phân loại lỗi key/quyền/model/quota/mạng/timeout/safety/schema. SDK chỉ thử một lần; 429 khóa thêm yêu cầu AI trong phiên 60 giây. Abort truyền tới SDK, không tuyên bố Google chắc chắn ngừng xử lý hay hoàn quota.
- Đổi `.env.example` và `.env` sang GEMINI_API_KEY/GEMINI_MODEL; xóa biến OpenAI, giữ biến không liên quan bằng kiểm tra nội bộ. Chỉ xuất boolean xác nhận, không in key. GEMINI_API_KEY đang trống; không tạo key thay người dùng.
- Cập nhật README, kịch bản demo và thông báo dữ liệu Free Tier trên UI. Nguồn chính thức và giới hạn dữ liệu được liên kết trong README. Không bật billing, không gọi Vertex AI, không push/deploy.

### Kết quả thực sự quan sát

- Cài dependencies và gỡ `openai` thành công; npm báo 0 vulnerabilities. Có cảnh báo deprecated của dependency gián tiếp `node-domexception@1.0.0`.
- `npm.cmd test`: 30/30 đạt. Test SDK dùng Google GenAI SDK thật với fetch/SSE mock: dữ liệu chia nhỏ, partial trước EOF, schema, lịch sử, abort, thiếu finish reason, safety, JSON lỗi, không retry 429, không tự chọn model, thông báo lỗi an toàn.
- `npm.cmd run test:e2e`: build Vite thành công (36 modules), Chromium đạt upload TXT/PDF thật, streaming partial, hỏi tiếp, tạo lại/thử lại/lỗi, dừng, sao chép thành công/thất bại, cuộn lịch sử, IME mô phỏng, lưu phiên/hết phiên và mobile. Provider AI là mock.
- Kiểm tra code/dependencies không còn OpenAI runtime. Format các file thay đổi bằng Prettier; không thêm Prettier vào dependencies.
- Một lần apply_patch tài liệu không khớp vì dùng nhầm từ “hình dáng” thay cho “hình dạng”; công cụ từ chối patch, đã đọc lại và sửa đúng. Không phải lỗi runtime. PowerShell Get-Content mặc định hiển thị sai dấu; đọc UTF-8 xác nhận nội dung tiếng Việt bình thường.

### Chưa xác minh

**Chưa gọi Gemini thật vì chưa có GEMINI_API_KEY.** Chưa xác nhận project người dùng có quota/model, độ chính xác câu trả lời, tốc độ hoặc hành vi ngừng xử lý phía Google. Tests mock không chứng minh AI thật bám tài liệu. Người dùng tự điền key Free Tier, restart backend và làm checklist README; không gửi key qua chat. Không kiểm tra tài khoản billing hoặc tự bật dịch vụ trả phí.

## Bước 1 — Frontend demo

Ngày thực hiện theo môi trường: 28/09/2026.

### Khảo sát

- AI kiểm tra thư mục `E:\HKDN_126\TEST CV`: thư mục trống, không có code cũ hoặc `AGENTS.md` tại thư mục dự án; cũng không thấy hướng dẫn tại các thư mục cha đã kiểm tra.
- Node.js hiện có: v24.16.0.
- PowerShell chặn `npm.ps1` do execution policy. Đã dùng `npm.cmd` thành công, không thay đổi chính sách của máy.

### AI đã hỗ trợ

- Tạo dự án React + Vite + JavaScript, CSS thuần, giao diện tiếng Việt với bố cục responsive.
- Tách các component tài liệu, tệp, trò chuyện, danh sách tin nhắn, đáp án và ô nhập.
- Viết kiểm tra tệp (PDF/TXT, 3 tệp, mỗi tệp 5 MiB, trùng tệp), thông báo lỗi và thao tác xóa.
- Viết hook quản lý lịch sử, trạng thái chờ/lỗi, thử lại và tạo lại đáp án gần nhất.
- Tạo service demo độc lập, trả cấu trúc `summary`, `key_points`, `risks`, `actions`. Chế độ chậm/lỗi chọn chủ động, không dùng lỗi ngẫu nhiên.
- Thêm sao chép kèm thông báo kết quả, label, focus, Enter/Shift+Enter và kiểm tra trạng thái composition của IME.
- Viết README, `.gitignore` bảo vệ tệp môi trường, 5 kiểm thử bằng `node:test`.
- Định dạng code bằng Prettier chạy tạm qua npm exec; không thêm Prettier vào dependencies của dự án.
- Cài Playwright trong thư mục tạm của hệ thống và tải Chromium để kiểm tra trình duyệt; không thêm Playwright vào dependencies dự án. Script kiểm tra và ảnh chụp nằm trong thư mục tạm, không thuộc bộ test `npm test`.

### Kết quả đã quan sát

- `npm.cmd install`: thành công; npm báo 0 vulnerabilities tại thời điểm cài đặt.
- `npm.cmd test`: 5/5 đạt. Bao phủ phần mở rộng viết hoa, ranh giới 5 MiB, sai định dạng, quá dung lượng, trùng tệp, giới hạn số lượng, không sửa mảng đầu vào, chuyển đáp án sang văn bản, cấu trúc demo và chế độ lỗi.
- `npm.cmd run build`: thành công với Vite 7.3.6, 33 modules được xử lý.
- Dev server khởi động thành công tại `http://127.0.0.1:5173/`.
- Script Playwright chạy Chromium headless thành công ở viewport máy tính 1440×1000 và điện thoại 375×812.
- Kiểm tra trình duyệt đạt: nút gửi bị khóa lúc đầu; chọn TXT; Shift+Enter xuống dòng; composition mô phỏng chặn gửi; Enter tạo tin nhắn; tạo lại không tăng số câu hỏi/đáp án; clipboard thành công và báo lỗi khi cố ý mô phỏng clipboard bị chặn; chế độ lỗi giữ đáp án cũ; thử lại không nhân đôi câu hỏi; chế độ chậm khóa gửi và chỉnh tệp; thu gọn/mở tài liệu trên điện thoại; không tràn ngang ở 375 px; xóa tệp không xóa lịch sử; tải lại trang xóa lịch sử.
- Không ghi nhận sự kiện `pageerror` trong lượt kiểm tra Chromium. Đã xem ảnh chụp giao diện điện thoại sau kiểm tra.

### Giới hạn kiểm tra và sản phẩm

- IME chỉ được kiểm tra qua sự kiện composition mô phỏng; chưa dùng bộ gõ thật, chưa kiểm tra Safari/Firefox, thiết bị điện thoại thật hoặc trình đọc màn hình.
- Kiểm tra clipboard thất bại dùng hàm cố ý ném lỗi; không phải thao tác từ chối quyền trong hộp thoại trình duyệt thật.
- Không có kiểm thử API AI thật vì chưa có backend/API AI trong bước này.
- Tệp chỉ nằm trong bộ nhớ trình duyệt; ứng dụng không đọc nội dung tệp hay upload. Câu trả lời cố định là dữ liệu mẫu, không lấy từ tài liệu.
- Không thêm API key, database, đăng nhập, Redux hoặc Docker. Không push code hoặc deploy.

## Bước 2 — Backend, tài liệu thật và luồng OpenAI streaming

Giai đoạn 28/09/2026, trước khi chuyển sang Gemini. Các nhận xét chưa có key/Git/deploy và kế hoạch ở mục này được giữ làm lịch sử; xem mốc 30/09 ở đầu file để biết trạng thái hiện tại.

### Yêu cầu và công cụ thực sự đã dùng

- Người dùng yêu cầu tiếp tục code hiện có cho “7-Day AI Builder Challenge for Frontend Developer”: upload/đọc PDF–TXT, OpenAI streaming thật, structured output, phiên riêng, giới hạn, dừng/tạo lại, kiểm chứng và tài liệu nộp bài. AI đọc toàn bộ yêu cầu trong tệp đính kèm, code, package.json, README, nhật ký và tìm hướng dẫn trước khi sửa. Không tạo lại dự án.
- Công cụ AI hỗ trợ xây dựng: Codex trong workspace này. Đã dùng skill **OpenAI Docs**, công cụ đọc/sửa file và PowerShell, tra cứu tài liệu web chính thức, npm, Node test runner, Playwright/Chromium và xem ảnh chụp giao diện. Không dùng agent phụ hoặc các công cụ AI khác.
- Đã xác nhận qua tài liệu OpenAI rằng `gpt-4.1-mini` hỗ trợ Chat Completions, streaming, structured output; hướng dẫn Structured Outputs có `content.delta.parsed`. Cũng đọc mã SDK đã cài để đối chiếu partial parser và abort signal. Nguồn được liên kết trong README.
- Chỉ kiểm tra sự tồn tại của `.env`/biến môi trường, không in secret. Không có `.env` hoặc `OPENAI_API_KEY` trong môi trường ở thời điểm kiểm tra.

### AI đã triển khai

- Giữ React/Vite/CSS và các component đang hoạt động; thêm hook tài liệu, đổi service chính từ demo sang API backend. Không có fallback đáp án mẫu.
- Express quản lý phiên bằng token ngẫu nhiên, kho tài liệu RAM tách phiên, TTL 1 giờ, giới hạn số phiên/văn bản/bộ nhớ, kiểm tra quyền trước đọc/xóa/chat, rate limit và concurrency limit.
- Upload nhiều tệp từ UI theo hàng đợi. Backend kiểm tra dung lượng, nội dung PDF/TXT, UTF-8, tệp rỗng, scan/không có chữ, mật khẩu, hỏng. Không ghi file tạm; giải phóng buffer sau xử lý.
- Tách đọc PDF sang tiến trình con có giới hạn heap và timeout. Giới hạn này không phải hard cap cho toàn bộ native memory; README nêu rõ.
- OpenAI SDK ở backend dùng structured output schema Zod, parse tăng dần của SDK và xác thực cuối stream. NDJSON `status/data/complete/error` tới frontend, giữ bộ đệm theo dòng/UTF-8, phát hiện EOF thiếu complete.
- Abort từ UI truyền tới backend và SDK; timeout và lỗi được chuyển sang thông báo an toàn. Tạo lại loại đáp án đang thay thế khỏi context, phục hồi đáp án cũ nếu thất bại và giữ phần mới dở dang để xem.
- Lưu lịch sử và liên kết ID tài liệu trong sessionStorage; khóa sửa tệp sau chat và chặn hỏi nếu bộ tài liệu đã đổi; tự cuộn chỉ khi người dùng đang gần cuối.
- Thêm `.env.example`, scripts backend phù hợp Windows, Vite proxy, Express phục vụ bản build; README, DEMO_SCRIPT và tài liệu thực hành tự tạo. Không push/deploy.

### Những lỗi/đầu ra chưa phù hợp đã quan sát và cách sửa

1. Lần đọc tệp yêu cầu bằng encoding mặc định PowerShell hiển thị tiếng Việt lỗi. Đọc lại với `-Encoding utf8` để lấy đúng yêu cầu; không sửa nội dung tệp đính kèm.
2. Lượt test PDF đầu tiên dùng `worker_threads` làm tiến trình test trên Windows kết thúc với exit code `3221225477`. Chưa xác định chính xác nguyên nhân native bên trong thư viện. Đổi sang tiến trình Node con (`fork`) để cô lập lỗi và dọn tài nguyên; test PDF chạy thành công sau thay đổi.
3. SSE mock ban đầu thiếu trường `role` trong delta, SDK báo `missing role for choice 0`. Đây là lỗi fixture kiểm thử. Bổ sung role assistant theo định dạng stream; SDK test sau đó đạt và quan sát được partial trước complete.
4. Một smoke test truyền JavaScript có tiếng Việt qua stdin PowerShell bị chuyển thành dấu `?`, làm locator timeout. Đổi smoke test sang selector ASCII; lượt chạy lại kiểm tra Vite proxy/backend thành công. Không coi timeout đó là lỗi giao diện.
5. Trong rà soát, bổ sung liên kết bộ ID tài liệu vào lịch sử để khi dữ liệu server thay đổi ngoài tab, giao diện yêu cầu hội thoại mới. Bổ sung giải phóng khóa upload khi kết nối bị hủy.

### Kết quả đã quan sát

- Cài dependencies thành công; `npm.cmd audit --omit=dev` báo 0 vulnerabilities tại thời điểm chạy. Đây không phải bảo đảm bảo mật tuyệt đối.
- `npm.cmd test`: 22/22 đạt trong lượt kiểm tra cuối sau rà soát. Bao gồm kiểm tra frontend tệp, NDJSON chia từng byte UTF-8/gộp nhiều dòng/EOF/lỗi, đọc TXT và PDF văn bản thật, tệp sai/rỗng/binary/encoding/hỏng/không chữ/mật khẩu, giới hạn, cách ly phiên, context gồm lịch sử, timeout, thiếu key qua HTTP, rate limit, khóa tác vụ, schema và abort.
- `npm.cmd run test:e2e`: build thành công và kiểm thử Chromium 1440×1000/375×812 đạt với backend/parser thật và **provider AI mock**. Đã quan sát nội dung trước complete, hỏi tiếp mang lịch sử, tạo lại không nhân đôi câu hỏi, giữ đáp án cũ khi lỗi, thử lại, dừng đến provider, sao chép thành công và lỗi mô phỏng, IME mô phỏng, không kéo cuộn khi đang đọc phần cũ, tải lại giữ lịch sử, hết phiên vẫn xem lịch sử, tạo phiên mới và responsive.
- Lượt E2E cuối cũng đạt kiểm tra bộ tài liệu bị đổi ngoài tab thì chặn gửi câu hỏi, cùng lỗi mất mạng mô phỏng bằng chặn request trong Playwright. Production build cuối xử lý 36 modules thành công.
- `npm.cmd run dev:server` khởi động thành công ở cổng 3001 trên Windows, không có key và thông báo đúng trạng thái này.
- `npm.cmd run dev -- --host 127.0.0.1 --port 5175 --strictPort` khởi động Vite thành công. Smoke test trên Vite thật qua proxy: upload TXT mẫu thành công; gửi câu hỏi nhận `AI_NOT_CONFIGURED`, không có nội dung demo thay thế.
- Đã xem ảnh chụp mobile từ E2E. E2E không ghi nhận `pageerror`. Ảnh kiểm tra nằm trong `test-results/`, được Git bỏ qua.
- PDF mật khẩu trong `tests/fixtures/password.pdf` được tạo cục bộ bằng PDFKit cài ở thư mục tạm, chứa văn bản kiểm thử. PDFKit không thêm vào dependencies dự án.
- `git status` xác nhận thư mục hiện chưa là Git repository. Không tự khởi tạo Git, commit, push hoặc deploy; `.gitignore` sẵn dùng khi người dùng tạo repository.

### Chưa kiểm chứng và giới hạn

- **Chưa gọi OpenAI thật vì chưa có key.** Test SDK sử dụng transport SSE mock, E2E dùng provider mock. Không xem đáp án mock, câu hỏi “có/không có thông tin” hoặc chuyển lịch sử mock là bằng chứng model thật hiểu và bám tài liệu.
- Cần tự cấu hình key rồi kiểm tra: model khả dụng với tài khoản, đáp án đúng tài liệu, câu hỏi thiếu thông tin, hỏi tiếp, tốc độ streaming và abort trên kết nối OpenAI thật. Hướng dẫn ở README; không cần gửi key qua chat.
- Chưa kiểm thử UI trên Safari/Firefox, điện thoại thật, IME thật hoặc trình đọc màn hình. Clipboard lỗi được mô phỏng bằng hàm ném lỗi.
- Không OCR, trích dẫn nguồn, database, đăng nhập; phiên RAM mất khi restart. Chưa deploy và chưa thử proxy/hosting production. Test PDF không có chữ dùng PDF trống tạo cục bộ, chưa đánh giá một bộ sưu tập PDF scan nhiều kiểu hoặc PDF bảng phức tạp.

### Kế hoạch 7 ngày ban đầu — lịch sử giai đoạn OpenAI

Kế hoạch cũ được giữ để đối chiếu; kế hoạch hiện tại nằm ở mục triển khai ngày 30/09 phía trên.

- Ngày 1–2: kiểm chứng OpenAI thật bằng bộ câu hỏi có đáp án đối chiếu, thiếu thông tin, hỏi tiếp và tài liệu có prompt injection; ghi kết quả thay vì giả định.
- Ngày 3: thử nhiều PDF tiếng Việt/bảng/phông chữ, kiểm tra chất lượng trích xuất và cân nhắc OCR có thông báo rõ.
- Ngày 4: kiểm thử IME thật, trình đọc màn hình và nhiều trình duyệt/thiết bị; cải thiện focus và trạng thái lỗi.
- Ngày 5: đo token bằng tokenizer phù hợp model, thêm trích dẫn nguồn sau khi luồng bắt buộc ổn định.
- Ngày 6: thử triển khai staging có streaming, kiểm tra timeout/buffering/rate limit và quan sát chi phí.
- Ngày 7: người nộp tự rà soát code, diễn tập thuyết trình, quay video dưới 5 phút và cập nhật nhật ký bằng bằng chứng thực tế.
