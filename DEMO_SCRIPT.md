# Kịch bản video — tối đa 5 phút

Mục tiêu: minh họa luồng nghiên cứu tài liệu, cách xử lý phản hồi và giới hạn thật của sản phẩm. Không quay `.env`, API key hoặc console có thông tin tài khoản.

## Chuẩn bị trước khi quay

- Bản hiện tại dùng Gemini Developer API Free Tier, model `gemini-3.5-flash-lite`. Tự điền `GEMINI_API_KEY` trong `.env`; không bật billing/nạp credit. Google AI Pro không đồng nghĩa với quota API. Chỉ dùng tài liệu không nhạy cảm theo điều khoản Free Tier.
- Nếu gặp 429, chờ ít nhất 60 giây; nếu hết quota ngày thì chờ quota phục hồi. Không tạo phiên mới để né hạn mức. Dừng nhận stream không bảo đảm Google ngừng xử lý hoặc hoàn lại quota.

- Chạy frontend/backend theo README, điền key hợp lệ riêng trong `.env`, kiểm tra hạn mức tài khoản và thử một câu hỏi thật.
- Chuẩn bị `samples/research-notes.txt`, một PDF có lớp văn bản và một TXT rỗng/PDF scan để minh họa lỗi.
- Bắt đầu hội thoại sạch cho video; giữ giới hạn 6 yêu cầu AI/phút và chờ giữa các đoạn nếu cần. Không thay đổi giới hạn chỉ để che lỗi trong video.
- Chuẩn bị cửa sổ điện thoại 375 px trong DevTools. Tắt phần hiển thị thông tin bí mật khi chia sẻ màn hình.
- Nếu chưa có key, chỉ quay phần upload/UX và nói rõ AI chưa được xác minh. Nếu quay test mock, phải gắn nhãn “Kiểm thử mock — không phải phản hồi Gemini thật”; không dùng làm bằng chứng hoàn thành AI thật.

## 0:00–0:25 — Vấn đề và giải pháp

“Sinh viên thường phải đọc nhiều tài liệu rời rạc. AI Research Workspace gom tài liệu vào một phiên, cho phép hỏi tiếp và trình bày câu trả lời theo yêu cầu, chỉ mở thêm phần khi có nội dung liên quan.”

Chỉ hai cột tài liệu/trò chuyện và thông báo dữ liệu gửi đến Gemini khi hỏi.

## 0:25–1:00 — Upload

Chọn TXT mẫu và PDF. Chỉ trạng thái tải lên, đọc tệp, sẵn sàng. Nêu ngắn giới hạn 3 tệp, 5 MB/tệp; PDF phải có lớp văn bản. Nếu xử lý quá nhanh để thấy nhãn trung gian, không giả làm chậm bản chính.

## 1:00–1:50 — Hỏi và xem streaming

Hỏi: **“Tóm tắt mục tiêu, ngân sách và các rủi ro của dự án.”**

Chỉ nội dung xuất hiện khi vẫn đang nhận; sau đó chỉ phần Trả lời và các phần bổ sung thực sự có nội dung. Đối chiếu con số 120 triệu với tài liệu. Nhắc mục trống được ẩn, không hiển thị JSON và không bắt buộc đủ bốn phần.

## 1:50–2:25 — Hỏi tiếp

Hỏi: **“Ngân sách đó được chia thành những khoản nào?”**

Đối chiếu 70/30/20 triệu. Giải thích backend gửi lịch sử cùng tài liệu để hiểu “ngân sách đó”. Nếu đủ thời gian, hỏi tên nhà tài trợ và chỉ thông báo không tìm thấy thông tin.

## 2:25–3:10 — Sao chép, tạo lại và dừng

Bấm Sao chép, chỉ thông báo thành công. Bấm Tạo lại và chỉ rằng số câu hỏi không tăng. Dừng khi đang nhận nếu kịp; chỉ nhãn Chưa hoàn tất và thao tác Thử lại. Nếu phản hồi quá nhanh, giải thích nút dừng và dùng một câu hỏi yêu cầu tổng hợp dài hơn trong lần chuẩn bị, không dùng hiệu ứng gõ giả.

## 3:10–4:05 — Lỗi và ngữ cảnh tài liệu

Chỉ thông báo tài liệu đang gắn với hội thoại. Bấm Hội thoại mới, xác nhận, rồi chọn tệp rỗng hoặc scan để xem lỗi cụ thể. Không tuyên bố đã OCR. Có thể tắt backend để minh họa lỗi kết nối, sau đó bật lại và giải thích phiên RAM đã mất, cần tải lại tài liệu.

Không cần cố tình làm phát sinh lỗi trả phí/hết hạn mức trong video; có thể trình bày kết quả kiểm thử trong nhật ký, ghi rõ mock.

## 4:05–4:35 — Mobile

Chuyển viewport 375 px. Thu gọn/mở khu vực tài liệu, chỉ ô nhập và danh sách hội thoại không tràn ngang. Nhắc Enter/Shift+Enter và khả năng dùng bàn phím.

## 4:35–5:00 — Kiến trúc và giới hạn

“React quản lý trạng thái và đọc NDJSON. Express xác thực phiên, trích xuất văn bản rồi gọi Google GenAI SDK streaming. API key chỉ ở backend. Phiên sống tối đa một giờ; chưa OCR, database hoặc trích dẫn nguồn.”

Nêu chính xác AI nào đã hỗ trợ xây dựng, phần đã chạy test và phần chưa kiểm chứng. Không bịa số liệu tiết kiệm thời gian hoặc URL deploy.
