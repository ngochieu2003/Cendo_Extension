# 🏸 Móc Khoá Cầu Lông 3D – Tạo Mockup & Design (cendo.work)

Extension Chrome (Load unpacked) cho đơn **Móc Khoá Cầu Lông 3D** trên cendo.work.

## Có gì mới
- **1.0.1** (21/08/2026) – sửa lỗi popup không hiện ảnh ("Failed to fetch"): web_accessible_resources thiếu `assets/*.jpg`.
- **1.0.0** (21/08/2026) – bản đầu: popup điền tay + luồng tự động theo lịch + báo Lark.
  Render kiểm chứng headless: khớp ảnh mẫu THUYTHU sai lệch ≤ 9px trên canvas 1500 cả 9 màu;
  Design 1254×1254 khớp mẫu (bbox 1065×111 vs 1066×110). Font Lemonada Bold bản đầy đủ
  (instance wght=700 từ Google Fonts, đủ glyph tiếng Việt — file TTF gốc bị subset hỏng dấu).

## Cách hoạt động
- **Tên khách**: External note — mỗi dòng có nội dung là 1 tên, dòng thứ n → item Cầu lông thứ n
  (theo thứ tự hiển thị trong đơn). Giống extension Thời Khoá Biểu.
- **Mẫu (màu)**: variant `"Màu: Màu Đen, Phân loại: In tên"`;
  dự phòng theo fulfillment SKU `P-3D-K07-{Black|Red|Yellow|Mint|Green|Pink|Orange|Blue|Purple}-N`.
- **Mockup 1500×1500**: ảnh mẫu theo màu (`assets/*.jpg` — bản "chưa điền tên") + tên khách **IN HOA**
  font **Lemonada Bold**, kiểu sticker: chữ trắng trên blob đỏ `#d01a2c` ôm theo chữ + vòng tròn đỏ
  bên trái. Tên dài tự thu nhỏ. Toạ độ từng mẫu nằm đầu `content.js` (TPL) — muốn xê dịch sửa ở đó.
- **Design 1254×1254**: nền trắng, tên (giữ nguyên hoa/thường như note) chữ đen Arial Bold 102,
  căn giữa, tự thu nhỏ — giống hệt TKB.

## Dùng tay
Mở trang đơn → nút **"🏸 Tạo Mockup Cầu Lông"** (góc phải dưới) → popup tự đọc note + màu từng item
→ sửa tên/màu nếu cần, kéo chữ trên preview để dời, lăn chuột đổi cỡ → **Điền vào Mockup & Design**
(hoặc **Tải PNG**). Không ghi đè ô đã có ảnh.

## Luồng tự động
Widget **"🏸 Auto Cầu Lông"** (góc trái dưới) hoặc trang Cài đặt của extension:
- Chỉ làm đơn tag **"Up đủ thông tin"**, item Cầu lông mà **cả Mockup & Design đều trống**.
- Điều kiện: số dòng tên trong note **= số item Cầu lông**; lệch → bỏ qua, báo lý do lên Lark.
- Upload qua `POST /api/orders/{oid}/items/{itemId}/upload-media` (field=mockup|design),
  kiểm tra lại trước khi up (không đè), up xong verify đủ 2 ảnh.
- Báo cáo về group Lark (webhook đổi được ở trang cài đặt).

## Vị trí UI (tránh đè extension khác)
- Nút popup: góc phải dưới `bottom: 298px` (TKB 186 · Instax 242).
- Widget auto: góc trái dưới `bottom: 234px` (TKB 130 · Instax 182).

## Điểm cần chỉnh khi lên đơn thật
- `isCauLongText()` nhận theo `cầu lông`/`K07` — sửa nếu shop đổi mã.
- Chưa xử lý biến thể "Phân loại" khác `In tên` — nếu có, thêm luật bỏ qua item đó.
- Chưa xử lý 1 item quantity > 1 cần nhiều tên khác nhau — hiện 1 item = 1 tên.
