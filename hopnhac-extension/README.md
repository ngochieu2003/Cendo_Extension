# Hộp Nhạc – Extension tạo Mockup & Design (cendo.work)

Chèn nút trên trang đơn hàng cendo.work. Bấm nút → popup cho chọn **font**, **màu**, nhập **chữ**;
extension lấy **ảnh khách trong Attachments**, ghép thành **Mockup (1000×1000)** + **Design (1500×2492)**
rồi **tự điền vào ô Upload** Mockup/Design.

## Cài đặt (Chrome / Edge / Cốc Cốc)
1. Mở `chrome://extensions`
2. Bật **Developer mode** (góc trên phải)
3. Bấm **Load unpacked** → chọn thư mục `hopnhac-extension`
4. Mở một đơn hàng trên `cendo.work` → nút **🎵 Tạo Mockup Hộp Nhạc** hiện ở góc phải dưới
   (phía trên nút "Xử lý đơn Flip Photo Book").

> Sau khi sửa code, quay lại `chrome://extensions` bấm **Reload** ở thẻ extension rồi F5 lại trang.

## Cách dùng
1. Bấm **🎵 Tạo Mockup Hộp Nhạc**.
2. Popup tự lấy ảnh khách từ Attachments; **màu** tự đoán theo đơn (đổi lại nếu cần).
3. Chọn **Phông** (nghiêng / thẳng), nhập **dòng chữ** (mỗi dòng một dòng, tự canh giữa & co chữ).
4. Xem preview Mockup + Design.
5. Bấm **✅ Điền vào Mockup & Design** (tự đẩy vào ô Upload) hoặc **⬇ Tải PNG** (tải về up tay).

## Tinh chỉnh về sau
Toàn bộ toạ độ nằm trong `content.js`:
- `TPL.gomoc` / `TPL.occho`:
  - `quad` = 4 góc khung ảnh khách (TL, TR, BR, BL) theo pixel ảnh gốc 640×637.
  - `textBox` = `[x0,y0,x1,y1]` vùng chữ trên nắp (chữ canh giữa trong vùng này).
  - `textColor` = màu chữ khắc.
- `DESIGN`: `bg` (màu nền), `textColor`, `textBox`, `photoBox`, `photoRadius`.

Ảnh template đã được **làm sạch chữ khắc mẫu** sẵn trong `assets/`.

## Ghi chú kỹ thuật
- Font Beautique Display (Bold = thẳng, BoldItalic = nghiêng), có hỗ trợ tiếng Việt có dấu.
- Ảnh khách tải qua `content.pancake.vn` (đã khai host_permissions) nên canvas không bị "tainted".
- Auto-fill: trang KHÔNG có sẵn `input[type=file]` (nút Upload mở hộp thoại Windows lúc bấm).
  `injected.js` chạy ở **MAIN world** (`document_start`) chặn `HTMLInputElement.click()`:
  khi `content.js` bấm hộ nút Upload, script bơm thẳng file (Mockup→ô1, Design→ô2) qua
  `DataTransfer` + dispatch `change`, không bật hộp thoại. Giao tiếp 2 world qua `postMessage`.
  Nếu web đổi cấu trúc/không nhận, luôn có nút **Tải PNG** để up tay.

## Luồng tự động (v1.1) – chạy theo lịch + báo Lark
> **v1.1.1:** webhook Lark không còn ghi sẵn trong code (repo public). Mở trang cài đặt → dán webhook của group → Lưu → *Gửi tin thử*.
> Nút **🎵 Auto Hộp Nhạc** ở góc trái dưới trang cendo.work: bật/tắt lịch, giờ, quy mô, Chạy ngay.
Bấm icon extension (hoặc `chrome://extensions` → Details → Extension options) để mở trang cài đặt:
- **Bật chạy tự động** + **giờ chạy** (giờ máy tính, VN) + **quy mô** (1/2/3/5/10 trang đầu hoặc tất cả).
- **Chạy ngay** để chạy tay theo quy mô đã chọn. **Gửi tin thử** để kiểm tra Lark.
- Lịch sử 20 lần chạy gần nhất (kèm nội dung đã gửi Lark).

Điều kiện làm đơn: có tag **"Up đủ thông tin"**, item **Hộp Nhạc** (tên SP hoặc SKU `-SMB-`), **Mockup và Design đều trống**.
Đơn đã có ảnh / khác trạng thái → không đụng. Đơn bất thường (không mã MB, note thiếu dòng, MB04 không đọc được ngày,
không có ảnh khách, đơn có >1 item Hộp Nhạc, chỉ có 1/2 ảnh…) → bỏ qua và ghi lý do + link trong tin Lark.

Kỹ thuật: `bg.js` (chrome.alarms, mở/tìm tab cendo.work, gửi Lark) · `auto.js` (content script: gọi
`/api/orders/search`, `/api/orders/{id}/items`, render bằng `window.__HN_API__` của content.js, upload qua
`/api/orders/{id}/items/{itemId}/upload-media` field=mockup|design, kiểm tra lại sau upload) · `options.html/js`.
Yêu cầu: Chrome đang mở (có thể thu nhỏ) và đã đăng nhập cendo.work vào giờ chạy. Alarm bị lỡ (Chrome tắt) sẽ
chạy bù khi Chrome mở lại trong ngày, mỗi ngày tối đa 1 lần theo lịch.
