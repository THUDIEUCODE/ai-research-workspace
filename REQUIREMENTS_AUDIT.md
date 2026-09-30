# Kiểm tra trước khi nộp — AI Research Workspace

Ngày kiểm tra: **30/09/2026**. Đối chiếu các yêu cầu “7-Day AI Builder Challenge for Frontend Developer” được người dùng cung cấp trong tệp yêu cầu kiểm tra. Không có bản đề gốc riêng để xác minh thêm điều khoản ngoài nội dung đó.

**Kết luận:** luồng sản phẩm tối thiểu đã được kiểm chứng hoạt động trên máy: upload/đọc tài liệu thật, Gemini thật, streaming tới giao diện, hỏi tiếp, đáp án có cấu trúc, tạo lại và sao chép. Hồ sơ **chưa sẵn sàng nộp** vì chưa tìm thấy Live URL công khai và video demo thực tế. Có một lỗi biên về tải lại lịch sử quá 80 tin nhắn cần xử lý; không phải yêu cầu phải có nhiều hội thoại hay lưu vĩnh viễn.

Không sửa code chức năng, dependency, cấu hình hoặc key. Không commit/push/deploy. Chỉ tạo báo cáo và các tệp kiểm chứng trong `test-results/` (đã được quy tắc Git ignore loại trừ), chạy bộ kiểm tra hiện có và bốn yêu cầu Gemini thật. Backend kiểm tra dùng cổng ngẫu nhiên và được đóng sau kiểm tra; không cần thay tiến trình người dùng đang chạy.

## 1. Phạm vi và bằng chứng

- Đã đọc `package.json`, `README.md`, `AI_WORKLOG.md`, `DEMO_SCRIPT.md`, `.gitignore`, `.env.example`, `vite.config.js`; các component, hook, service, lịch sử, backend, parser, session store và tests liên quan. Không tìm thấy `AGENTS.md` trong dự án và các thư mục cha đã kiểm tra.
- Môi trường: Windows, Node **24.16.0**, React **19.3.0**, Vite **7.3.6**, Express **5.2.1**, `@google/genai` **2.24.0**, `pdf-parse` **2.4.5**, Playwright **1.63.0**, theo `npm.cmd ls --depth=0`. Không tự cập nhật hoặc cài dependency.
- Trình duyệt: Chromium headless. Kiểm tra bổ sung ở **1366×900**, **390×844** và câu trả lời dài ở **390×900/1366×900**. Bộ E2E sẵn có còn chạy ở 1440×1000/375×812. Không đại diện cho điện thoại thật, Safari hoặc tất cả trình duyệt.
- Đã kiểm tra có key bằng boolean; không in giá trị. Bốn yêu cầu thật dùng tài liệu thực hành có sẵn, không thay provider bằng mock trong lượt này. Không bật billing, đổi model hoặc cố gây hết quota. Không gặp quota trong bốn yêu cầu.

| Kiểm tra đã chạy | Kết quả thực tế | Phạm vi bằng chứng |
| --- | --- | --- |
| `npm.cmd test` | **31/31 đạt**, không bài thất bại | TXT/PDF thật; validation, giới hạn, session, NDJSON, schema, timeout, abort; SDK AI dùng transport mock |
| `npm.cmd run test:e2e` | Thành công, hai dòng PASS; build xử lý 36 modules | React/Express/parser thật; AI mock có kiểm soát; copy, regenerate/error/retry, stop, IME mô phỏng, cuộn, phiên, responsive và bốn dạng đáp án |
| Build do script E2E gọi `npm run build` | Thành công; JS 244,96 kB, gzip 77,20 kB; CSS 11,84 kB | Bản production được Express phục vụ trong kiểm tra bổ sung |
| Lint | Không thực hiện | `package.json` không có script lint; không đoán lệnh/cài công cụ. Đây không tự động là thiếu yêu cầu tối thiểu |
| `node --env-file-if-exists=.env test-results/requirements-audit.mjs` | Upload nhiều tệp, 4/4 yêu cầu Gemini thành công, không `pageerror` | Luồng thật browser → Express → Gemini → NDJSON → DOM, lưu lịch sử, clipboard và xác nhận hội thoại mới |
| `node test-results/audit-edge.mjs` | Upload trên mobile và layout câu trả lời dài thành công; tái hiện mất lịch sử 82 tin nhắn | Provider mock cho bố cục; dữ liệu sessionStorage được chủ động tạo để kiểm tra biên, không gọi AI |
| `git rev-parse --is-inside-work-tree` | Báo không phải Git repository | Không có remote/lịch sử Git để kiểm tra tại workspace này |

Bằng chứng chi tiết: [audit-live-results.json](test-results/audit-live-results.json), [audit-edge-results.json](test-results/audit-edge-results.json). Các script trong `test-results` chỉ phục vụ kiểm tra; script live gọi tối đa 4 yêu cầu AI nếu chạy lại. Không chạy lại liên tục khi hết quota. Không coi JSON này là video nộp bài.

## 2. Bảng đối chiếu chức năng bắt buộc

| Yêu cầu | Trạng thái | Bằng chứng | Việc cần làm |
| --- | --- | --- | --- |
| Upload một/nhiều PDF hoặc TXT | Đạt | Chọn đồng thời PDF ngày hội và TXT deepfake trên trình duyệt, cả hai `Sẵn sàng`; kiểm tra bổ sung upload PDF ở 390 px. `src/hooks/useDocuments.js`, `server/app.js` | Kiểm tra lại trên Live URL sau triển khai |
| Thực sự đọc file, không trả dữ liệu mẫu | Đạt | Đọc đủ 4 tệp trong `samples`; số ký tự và nội dung được ghi dưới đây. Luồng live lấy tài liệu đã upload trong session store; không có fallback mock trong `server/ai.js` | Không cần thêm định dạng ngoài PDF/TXT để đạt tối thiểu |
| PDF có chữ trích xuất nội dung thật | Đạt | PDF ngày hội đọc 2.082 ký tự, đúng ngân sách/các khoản chi; PDF chữ + ảnh đọc 1.009 ký tự. `server/documents.js`, `server/pdfWorker.js`; regression Node watch đã đạt | Không tuyên bố đọc được số liệu bên trong ảnh |
| Báo tệp lỗi/rỗng/quá lớn/không hỗ trợ | Đạt | Tests chạy qua các trường hợp sai phần mở rộng, UTF-8 hỏng, binary TXT, PDF hỏng, không chữ, có mật khẩu, >5 MiB, >3 tệp. `tests/files.test.js`, `tests/server.test.js`; UI có lỗi và hướng dẫn xóa/chọn lại | Lỗi khó tái hiện như native crash/PDF timeout chưa được ép xảy ra trong lượt audit |
| Gọi AI thật dựa trên tài liệu tải lên | Đạt | 4 yêu cầu Gemini thật từ trình duyệt; câu ngân sách trả 1.200.000 đồng đúng PDF. `server/ai.js`, `server/app.js` | Chạy smoke test tương tự trên hosting |
| Không có đáp án thì không bịa | Đạt | Hỏi tên nhà tài trợ đã xác nhận: trả “Không tìm thấy thông tin này trong tài liệu”, các mảng rỗng; tạo lại vẫn đúng | Đây là bằng chứng với câu đã thử, không bảo đảm model không bao giờ bịa |
| Câu hỏi tiếp nối cần lịch sử | Đạt | “Số tiền đó được phân bổ thành những khoản nào?” trả 300.000/450.000/250.000/200.000 đồng. Ghi nhận context có `user, assistant` của lượt trước | Không cần mở rộng sang nhiều hội thoại |
| API lỗi không âm thầm trả mẫu | Đạt | Test thiếu key không có `data/complete`; tests lỗi provider/mất mạng/stream dở không sinh đáp án thay thế. Runtime không import fixture. `tests/server.test.js`, `tests/browser.e2e.js` | Giữ phân biệt mock và thật khi demo |
| Streaming thật tới frontend | Đạt | Quan sát DOM có nội dung trước khi hàm provider hoàn tất ở cả 3 câu hỏi mới; số liệu thời gian bên dưới. `generateContentStream` → parser → `res.write` → `readEvents` → React | Cần kiểm chứng lại proxy/hosting không buffer response |
| Câu trả lời có cấu trúc, không JSON thô | Đạt | Schema Zod, response JSON Schema, tokenizer tăng dần; E2E bốn dạng đáp án đạt, lượt thật chỉ hiện “Trả lời” khi mảng rỗng. `shared/answer.js`, `server/answerParser.js`, `AnswerCard.jsx` | Không ép đủ bốn mục |
| Kết quả sai cấu trúc bị xử lý | Đạt | Tests JSON dở/hỏng/dư trường/sai kiểu/thiếu finish reason đạt, backend không gửi complete sai; frontend kiểm tra lại `isAnswer` | Không cần ép Gemini thật trả JSON sai để thử |
| Xem lịch sử trong hội thoại và reload cùng tab | Đạt một phần | Lượt live 3 câu hỏi vẫn còn sau reload. `useChat.js`, `utils/history.js` dùng state + sessionStorage. Nhưng dữ liệu 82 tin nhắn bị xóa im lặng khi reload (mục 5) | Sửa giới hạn tải lịch sử hoặc báo rõ, không bỏ toàn bộ im lặng |
| Tạo lại gửi yêu cầu mới, không thêm câu hỏi | Đạt | Lượt Gemini thứ 4 được ghi nhận riêng; câu hỏi vẫn là 3, context bỏ đáp án đang thay thế. E2E tạo lại/thử lại đạt | Không cần thay thiết kế |
| Tạo lại thất bại giữ đáp án cũ | Đạt | E2E provider mock lỗi giữa stream: giữ đáp án cũ, có phần lần tạo dở và nút thử lại. `useChat.js`, `AnswerCard.jsx` | Lỗi được mô phỏng có kiểm soát, không cố làm API thật hỏng |
| Sao chép văn bản dễ đọc và lỗi clipboard | Đạt | Live clipboard bắt đầu “Trả lời” rồi nội dung; E2E thành công và lỗi clipboard mô phỏng đều đạt | Thử quyền clipboard trên URL HTTPS thực tế |
| Hội thoại mới thông báo xóa lịch sử | Đạt | Đã mở dialog với nội dung “Bắt đầu hội thoại mới sẽ xóa lịch sử trong tab này. Tiếp tục?”; hủy giữ 3 câu hỏi. E2E xác nhận tạo phiên mới/xóa đạt. `ChatPanel.jsx` | Không coi xóa lịch sử sau xác nhận là vi phạm đề |
| Loading, empty, error; không gửi rỗng/trùng | Đạt | Empty screen đã xem; kiểm tra nút gửi khóa, busy guard, IME; loading và lỗi xuất hiện trong E2E. `ChatInput.jsx`, `useChat.js`, `MessageList.jsx` | IME thật vẫn cần người dùng thử |
| Backend mất kết nối, API thất bại, stream ngắt có phục hồi | Đạt | E2E chặn mạng và provider lỗi; unit kiểm tra EOF thiếu complete, timeout, no-key; nút thử lại và partial được giữ. Không ghi nhận trắng trang | Các trường hợp này dùng mock/chặn request, không phá kết nối Gemini thật |
| Loading có giới hạn, dừng được | Đạt | Timeout backend kiểm thử với thời gian rút ngắn; frontend có 35/100 giây; abort truyền tới provider mock và UI thoát pending. `researchService.js`, `server/app.js` | Chưa chờ đủ mọi timeout thực trên hosting; abort không bảo đảm Google hoàn quota |
| Desktop/mobile usable | Đạt | Xem ảnh 1366/390 px, `scrollWidth == innerWidth`; upload mobile, thu gọn/mở tài liệu, gửi/tạo lại/copy trên mobile thành công. Đáp án mock 20 ý dài vẫn cuộn được, các nút không bị lớp khác che | Thử bàn phím ảo và thiết bị thật; đây là kiểm chứng Chromium desktop mô phỏng viewport |

### Nội dung mẫu đã đọc

| Tệp trong `samples/` | Kích thước gốc | Văn bản trích xuất | Quan sát |
| --- | ---: | ---: | --- |
| `ke_hoach_ngay_hoi_doi_sach.pdf` | 74.236 byte | 2.082 ký tự | Đủ các mục, tổng 1.200.000 đồng; các khoản 300.000/450.000/250.000/200.000; câu cuối xác nhận chưa có tên nhà tài trợ |
| `mau_pdf_co_chu_va_hinh_anh.pdf` | 107.454 byte | 1.009 ký tự | Tủ sách Ánh Dương, 6 tình nguyện viên, mượn tối đa 2 cuốn/14 ngày, ngân sách 900.000 đồng; phần ảnh biểu đồ không được đọc và không được tuyên bố là đã đọc |
| `lua_dao_truc_tuyen_deepfake.txt` | 4.426 byte | 3.374 ký tự | Đọc UTF-8 thành công, đã upload cùng PDF trong luồng live |
| `research-notes.txt` | 1.273 byte | 968 ký tự | Đọc UTF-8 thành công; ngân sách 120 triệu là tài liệu khác, không bị dùng thay ngân sách 1,2 triệu của PDF |

Không tệp nào có ký tự thay thế Unicode `�` trong kết quả. Không có `pdftotext` để đối chiếu từng ký tự; bằng chứng là nội dung parser thực tế, đối chiếu dữ kiện và regression hiện có. “Ký tự” ở đây là độ dài chuỗi JavaScript, không phải token.

### Streaming và hỏi đáp thật ngày 30/09

Thời gian tương đối từ lúc backend bắt đầu gọi provider, cùng máy kiểm tra. Không chèn độ trễ hoặc hiệu ứng gõ giả.

| Lượt | Kết quả đối chiếu | Partial từ provider adapter | Nội dung đầu tiên trên DOM | Provider hoàn tất |
| --- | --- | ---: | ---: | ---: |
| Ngân sách ngày hội | 1.200.000 đồng; chỉ phần Trả lời | 2 | 1.259 ms | 1.292 ms |
| Hỏi tiếp “Số tiền đó…” | Đúng bốn khoản chi, đúng tổng | 5 | 982 ms | 1.586 ms |
| Tên nhà tài trợ đã xác nhận | Nói không tìm thấy | 3 | 1.137 ms | 1.340 ms |
| Tạo lại câu nhà tài trợ | Gọi mới, vẫn 3 câu hỏi, không bịa | 3 | Không dùng thời điểm DOM cũ làm bằng chứng streaming | 1.267 ms |

Chỉ ba lượt đầu được dùng chứng minh nội dung mới tới DOM trước complete. Khi tạo lại, UI có thể đang giữ đáp án cũ nên thời điểm DOM xuất hiện rất sớm không chứng minh có token mới. Lượt hỏi tiếp thể hiện rõ nhất: nội dung xuất hiện sớm hơn provider hoàn tất khoảng **604 ms**. Tất cả câu trả lời đều qua schema runtime.

## 3. Đối chiếu kỹ thuật

| Yêu cầu | Trạng thái | Bằng chứng | Việc cần làm |
| --- | --- | --- | --- |
| Framework frontend phù hợp | Đạt | React/Vite trong package và source; build/E2E chạy thật | Không cần chuyển framework |
| Component/hook/service dễ đọc, tách trách nhiệm | Đạt | `src/components/`, `hooks/useChat.js`, `hooks/useDocuments.js`, `services/researchService.js`; đây là đánh giá cấu trúc từ code, chức năng được đối chiếu tests riêng | Không cần thêm Redux/Context |
| Backend phù hợp, không bắt buộc DB/auth phức tạp | Đạt | Express, kho session RAM, API đọc tài liệu và AI; luồng thật chạy thành công | Giữ các giới hạn được công bố |
| Ngăn cập nhật từ request cũ | Đạt một phần | `useChat.js` kiểm tra `active.current === controller`, reset abort và xóa active; `useDocuments.js` kiểm tra aborted. Tests stop, retry, contextChanged đạt | Chưa có kiểm thử riêng ép response cũ hoàn tất sau reset/unmount của UI; bổ sung nếu chỉnh logic bất đồng bộ |
| Giới hạn tài liệu/context/phiên/bộ nhớ | Đạt | Tests 3 tệp, 5 MiB, 48.000 byte/phiên, context gồm history, TTL và store cap bằng cấu hình nhỏ đạt. Code: 50 phiên, RAM text 32 MiB, 100 trang/PDF, global 2 upload/3 AI, 6 AI/phút/phiên | Không coi giới hạn heap 128 MiB là hard cap toàn bộ native memory; chưa load test sức tải thực |
| Session hết hạn được xử lý | Đạt | API unit + E2E ép hết hạn: lịch sử vẫn xem, chặn hỏi, tạo phiên và upload lại | Đã dùng thời gian mô phỏng, không chờ 1 giờ thật |
| Key chỉ ở backend, không trong bundle | Đạt | `server/ai.js` đọc env; frontend không dùng key. Quét 46 tệp source/config/docs/samples/build ngoài env/private artifacts: không thấy giá trị key hiện cấu hình hoặc mẫu chuỗi key thật; không in secret | Kiểm tra lại bundle khi deploy; quét này không bảo đảm phát hiện mọi loại bí mật |
| `.env` được loại khỏi source nộp/Git | Đạt một phần | `.gitignore` có `.env`, `.env.*`, ngoại lệ `.env.example`; example có key rỗng. Hiện chưa có Git repo nên không thể kiểm chứng tracked files/history | Khi đóng gói tuyệt đối không kèm `.env`; khi tạo Git kiểm tra ignore/tracked trước push |
| Lịch sử Git không lộ secret | Chưa kiểm chứng | Workspace không phải Git repository, không có lịch sử để quét | Nếu có repository khác, cần kiểm tra riêng; không tự tạo Git trong audit |
| Production không hardcode localhost cho API | Đạt | Service gọi `/api`; Express phục vụ `dist`; kiểm tra chạy ở cổng ngẫu nhiên thành công. Localhost chỉ ở Vite dev/preview proxy và hướng dẫn | Xác minh HTTPS/proxy/streaming trên Live URL |
| Hiệu năng trong phạm vi đã thử | Đạt | Không trắng trang/pageerror; PDF mẫu đọc khoảng 0,6–2,8 giây; lượt Gemini khoảng 1,27–1,59 giây. Đáp án mock 20 ý cuộn được ở 390/1366 px | Đây không phải benchmark/load test; chưa có bằng chứng cần virtual list, cache hay kiến trúc phức tạp |
| Lint | Chưa kiểm chứng | Không có script lint trong package | Tùy chọn bổ sung sau, không tính là thiếu chức năng đề |

Lịch sử hiện ở React state và `sessionStorage` cùng tab; được lưu sau khi lượt xử lý kết thúc, không phải database và không cam kết tồn tại sau đóng tab. Tài liệu nằm ở RAM backend, hết hạn tuyệt đối sau 1 giờ hoặc mất khi restart. Tải lại giữa stream có thể mất lượt đang nhận, đã nêu trong README. Những giới hạn này không bị coi là thiếu quản lý nhiều hội thoại/lưu vĩnh viễn.

## 4. Hồ sơ nộp bài và điểm cộng

| Yêu cầu | Trạng thái | Bằng chứng | Việc cần làm |
| --- | --- | --- | --- |
| Live URL công khai | Chưa đạt | Không tìm thấy URL triển khai trong source/README; README nói chưa deploy. Localhost và cổng kiểm tra không phải Live URL | Người dùng cung cấp URL nếu đã có ở nơi khác, hoặc thực hiện triển khai ở bước riêng rồi kiểm tra công khai |
| Source code đầy đủ | Đạt | Có frontend/backend/shared, package-lock, scripts, cấu hình mẫu; build và luồng chạy thành công | Nộp source, loại `.env`, node_modules và tệp kiểm tra riêng không cần thiết |
| GitHub “if applicable” | Chưa kiểm chứng | `git rev-parse` xác nhận chưa có repository tại đây; không có remote để ghi nhận | Nếu chọn GitHub làm kênh nộp thì tạo/push theo yêu cầu riêng. Không coi thiếu GitHub tự động làm source không đạt |
| Mô tả kiến trúc | Đạt | README mô tả thư mục, luồng upload/AI/NDJSON, phiên, giới hạn, chạy production | Không cần file kiến trúc riêng |
| README: vấn đề, đối tượng, giải pháp, chạy, AI usage, hạn chế | Đạt | Có đủ nội dung, phân biệt mock/thật, dữ liệu Free Tier, key backend, không có fallback mẫu | Bổ sung Live URL và video khi có |
| AI_WORKLOG: công cụ và phần AI làm, lỗi thật/cách sửa/kiểm chứng | Đạt | Nêu Codex, lỗi PDF IPC/watch, lỗi mã hóa PowerShell, đáp án trùng ý, lần cải thiện prompt và kiểm tra thật/mock | Không cần bịa thêm công cụ hoặc số liệu tiết kiệm thời gian |
| AI_WORKLOG: kế hoạch thêm 7 ngày phù hợp hiện trạng | Đạt một phần | Có mục 7 ngày nhưng nằm ở bước OpenAI cũ, còn ưu tiên kiểm chứng OpenAI/OCR dù hiện đã dùng Gemini và còn thiếu hồ sơ nộp | Cập nhật kế hoạch hiện tại, ưu tiên Live URL/video/lỗi đã xác nhận; giữ lịch sử cũ có nhãn thời điểm |
| Video demo tối đa 5 phút | Chưa đạt | Có `DEMO_SCRIPT.md` 0:00–5:00; không thấy file video hoặc link video nộp bài. Kịch bản không phải video | Quay thật, kiểm tra thời lượng/quyền xem; không để lộ `.env` |
| Trích dẫn nguồn — điểm cộng | Chưa đạt | Không thấy citation tới trang/đoạn tài liệu trong schema/UI; README công bố chưa hỗ trợ | P2, không chặn yêu cầu tối thiểu |
| Phím tắt — điểm cộng | Đạt | Enter gửi, Shift+Enter xuống dòng, composition/229 bảo vệ IME; E2E mô phỏng đạt | IME thật cần thử thủ công |
| Optimistic UI — điểm cộng | Đạt | Tin nhắn người dùng/thẻ chờ được thêm trước phản hồi; trạng thái tệp hiện ngay khi upload. Quan sát E2E và live | Không cần thêm thư viện |
| Accessibility — điểm cộng | Đạt một phần | Label, tên nút xóa, focus-visible, aria-expanded, role status/alert, reduced-motion; keyboard E2E và ảnh giao diện | Chưa kiểm tra screen reader, tương phản định lượng hoặc toàn bộ luồng chỉ bàn phím; không tuyên bố đạt chuẩn WCAG |
| Streaming dữ liệu có cấu trúc — điểm cộng | Đạt | Parser tăng dần, render từng trường trước complete, ẩn chunk rỗng; SDK/UI mock test đạt và summary có cấu trúc stream thật tới DOM | Chưa quan sát mọi trường mảng trên provider thật trong lượt audit này; có bằng chứng từ tests và lượt kiểm chứng trước trong worklog |

OCR/đọc ảnh/biểu đồ, upload ảnh riêng, đăng nhập, database và nhiều hội thoại/lưu vĩnh viễn **không bị tính là thiếu yêu cầu tối thiểu**. PDF chữ + ảnh đọc được phần chữ; không đọc biểu đồ ảnh là giới hạn được công bố, không phải lý do buộc bổ sung OCR trước nộp.

## 5. Những việc cần hoàn thành trước khi nộp

### P0 — Hồ sơ bắt buộc còn thiếu

1. **Có Live URL công khai và kiểm tra luồng chính trên đó.** Hiện chỉ kiểm chứng bản production chạy local. Sau khi có URL cần thử upload PDF/TXT → hỏi → streaming → hỏi tiếp → tạo lại/copy trên cửa sổ riêng tư và điện thoại; kiểm tra HTTPS, proxy không buffer, timeout, env backend. Không tự deploy trong audit này.
2. **Có video thật tối đa 5 phút.** Dùng DEMO_SCRIPT làm kịch bản, quay với API thật và tài liệu không nhạy cảm; kiểm tra link video mở được cho người chấm. Không dùng mock làm bằng chứng AI thật.

Chưa phát hiện lỗi P0 chặn luồng sản phẩm trong các lần chạy đã làm. Việc không tìm thấy URL/video chỉ phản ánh workspace và tài liệu đã cung cấp; nếu chúng tồn tại ở nơi khác, người dùng cần cung cấp để xác minh.

### P1 — Lỗi trải nghiệm/độ ổn định đã quan sát

**Lịch sử quá 80 tin nhắn bị bỏ toàn bộ khi reload, không cảnh báo.**

- Vị trí: `src/utils/history.js:12` trả `[]` nếu `value.length > 80`. `src/hooks/useChat.js:44` vẫn ghi cả mảng messages mà không giới hạn tương ứng.
- Tái hiện có kiểm soát: tạo sessionStorage hợp lệ gồm 82 tin nhắn (41 câu hỏi xen 41 thẻ đáp án chưa hoàn tất), reload UI. Kết quả: **0 câu hỏi**, không có alert; kiểm tra trực tiếp `loadHistory()` cũng trả 0. Không dùng 41 lượt API thật để thử.
- Đây là lỗi biên sau nhiều lần gửi/thất bại; backend có giới hạn lịch sử context nên không phải 41 lượt thành công thông thường. UI vẫn có thể tiếp tục thêm lượt lỗi nếu người dùng không bắt đầu hội thoại mới. Không đánh đồng với giới hạn lưu lịch sử trong cùng tab vốn được phép.
- Đề nghị cho bước sửa sau: thống nhất giới hạn ghi/đọc, giữ được lịch sử đã có hoặc báo rõ trước khi giới hạn; không âm thầm xóa toàn bộ khi reload. Thêm regression test. **Chưa sửa trong audit.**

Ngoài ra, trước nộp nên cập nhật phần “thêm 7 ngày” trong AI_WORKLOG theo Gemini và các việc còn lại; không ưu tiên OCR hoặc kiến trúc mới để thay thế việc hoàn thiện hồ sơ.

### P2 — Chỉ nếu còn thời gian

- Bổ sung trích dẫn trang/đoạn có thể đối chiếu thực tế, không để model tự bịa citation.
- Kiểm tra screen reader, IME thật và tương phản; cải thiện điểm cụ thể quan sát được.
- Thêm test ép response cũ đến muộn sau reset/unmount nếu tiếp tục thay đổi hook. Không cần Redux/Context chỉ để đáp ứng đề.

## 6. Các bước người nộp tự kiểm tra/bổ sung

1. Cung cấp/triển khai Live URL ở bước riêng; thử từ thiết bị không chạy backend local. Audit này chưa kiểm chứng hosting, reverse proxy hoặc tải đồng thời thực.
2. Quay và kiểm tra video tối đa 5 phút, có upload thật, đáp án đối chiếu, streaming, hỏi tiếp, tạo lại/copy, ít nhất một lỗi và mobile.
3. Quyết định sửa lỗi lịch sử P1, chạy lại tests sau sửa; cập nhật liên kết nộp trong README và kế hoạch 7 ngày trong worklog.
4. Thử bộ gõ tiếng Việt thật, bàn phím ảo ở điện thoại, clipboard trên HTTPS; xem chữ/nút khi màn hình nhỏ. Không cần thêm OCR để kiểm tra PDF có chữ.
5. Khi đóng gói hoặc đưa lên Git, tự kiểm tra `.env` không nằm trong source nộp và key không xuất hiện trong video. Lịch sử Git chưa thể kiểm tra vì workspace hiện không phải repository.

Ảnh đã xem: [desktop 1366 px](test-results/audit-desktop-answer.png), [mobile mở tài liệu](test-results/audit-mobile-expanded.png), [mobile thu gọn](test-results/audit-mobile-collapsed.png), [câu trả lời dài 390 px](test-results/audit-long-390.png). Bố cục có cuộn trang và cuộn riêng lịch sử; trong thử nghiệm các nút copy/tạo lại/gửi nằm trong chiều ngang và không bị che sau cuộn tới chúng. Bàn phím ảo thực chưa được mô phỏng.

**Kết luận riêng về sản phẩm:** đã có bằng chứng cho các chức năng tối thiểu trên môi trường local, gồm AI/streaming thật toàn luồng; còn lỗi biên lịch sử và những giới hạn kiểm chứng nêu rõ. **Kết luận riêng về hồ sơ:** chưa đầy đủ vì chưa có bằng chứng Live URL/video. Không cam kết điểm số hoặc bảo đảm kết quả chấm của ban tổ chức.
