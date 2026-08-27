# 🎾 Móc khoá Clicky Tennis 3D – Tạo Mockup & Design (cendo.work)

Extension Chrome (Load unpacked) cho đơn **Móc khoá Clicky Tennis 3D** trên cendo.work.
Kiến trúc sao chép nguyên từ `caulong-extension` (namespace `TENNIS_`), chỉ khác mẫu ảnh,
số màu (7) và **chữ xoay dọc 90°** bên phải móc khoá.

## Có gì mới
- **1.0.0** (27/08/2026) – bản đầu: popup điền tay + luồng tự động theo lịch + báo Lark.
  Toạ độ chữ đo bằng khớp 7 ảnh mẫu THUYTHU (thư mục `Tennis/VÍ dụ`) với ảnh chưa điền;
  render kiểm chứng Chromium headless: bbox sticker lệch ≤ 3px trên canvas 1500.
  Đã soi đơn thật `6a7aef55eb6d0fec27a550da` (#71092): 7 item 7 màu, note 7 dòng tên.

## Cách hoạt động
- **Nhận diện item**: `product_name` chứa chữ *tennis* ("Móc khoá Clicky Tennis 3D").
  `sku_id` dạng `NDT260615-3-8` không đặc trưng, `fulfillment_sku` trống → không dựa vào SKU.
- **Tên khách**: External note — mỗi dòng có nội dung là 1 tên, dòng thứ n → item Tennis thứ n
  (theo thứ tự hiển thị trong đơn). Giống Cầu lông / Chú Cừu.
- **Mẫu (màu)**: variant `"Màu: Màu Xanh Bạc Hà, Phân loại: In tên"` → 7 mẫu:
  Đen · Đỏ · Vàng · Xanh Bạc Hà · Xanh Lá · Hồng · Cam (`assets/{black,red,yellow,mint,green,pink,orange}.jpg`).
  Màu có tên nhưng **chưa có mẫu** (Xanh Dương, Tím…) → auto bỏ qua đơn và báo Lark lý do.
- **Mockup 1500×1500**: tên khách **IN HOA** font **Lemonada Bold**, kiểu sticker (chữ trắng +
  blob đỏ `#d01a2c` + vòng tròn đỏ) — cùng style Cầu lông/Chú Cừu — nhưng **xoay 90°** (đọc từ
  trên xuống, đầu chữ quay sang phải, vòng tròn ở trên) đặt bên phải móc khoá. Cả 7 mẫu dùng
  chung toạ độ `POS` ở đầu `content.js` (baseX 1060 · cy 938 · size 119 · maxL 920). Tên dài tự thu nhỏ.
- **Design 1254×1254**: nền trắng, tên (giữ nguyên hoa/thường như note) chữ đen Arial Bold 102,
  căn giữa, tự thu nhỏ — giống hệt TKB/Cầu lông (khớp `file design.png` Thuan gửi).

## Dùng tay
Mở trang đơn → nút **"🎾 Tạo Mockup Tennis"** (góc phải dưới) → popup tự đọc note + màu từng item
→ sửa tên/màu nếu cần, kéo chữ trên preview để dời, lăn chuột đổi cỡ → **Điền vào Mockup & Design**
(hoặc **Tải PNG**). Không ghi đè ô đã có ảnh.

## Luồng tự động
Widget **"🎾 Auto Tennis"** (góc trái dưới) hoặc trang Cài đặt của extension:
- Chỉ làm đơn tag **"Up đủ thông tin"**, item Tennis mà **cả Mockup & Design đều trống**.
- Điều kiện: số dòng tên trong note **= số item Tennis**, đọc được màu và màu có mẫu;
  lệch → bỏ qua, báo lý do lên Lark.
- Upload qua `POST /api/orders/{oid}/items/{itemId}/upload-media` (field=mockup|design),
  kiểm tra lại trước khi up (không đè), up xong verify đủ 2 ảnh.
- Báo cáo về group Lark (webhook mặc định giống các extension khác, đổi được ở trang cài đặt).

## Vị trí UI (tránh đè extension khác)
- Nút popup: góc phải dưới `bottom: 410px` (Cừu 354 · Cầu lông 298 · Instax 242 · TKB 186).
- Widget auto: góc trái dưới `bottom: 338px`, panel 386px (Cừu 286 · Cầu lông 234 · Instax 182 · TKB 130).

## Điểm cần chỉnh khi lên đơn thật
- `isTennisText()` nhận theo chữ *tennis* — sửa nếu shop đổi tên sản phẩm.
- Thêm màu mới: convert PNG 1500×1500 → `assets/<key>.jpg`, thêm dòng vào `TPL` + `TPL_ORDER`
  và luật trong `colorFromText()`.
- Chưa xử lý 1 item quantity > 1 cần nhiều tên — hiện 1 item = 1 tên.
- Font: file `Lemonada-Bold (2).ttf` Thuan gửi là bản subset hỏng outline chữ có dấu (như Cầu lông/Cừu)
  → dùng `assets/Lemonada-Bold.ttf` bản đầy đủ của caulong-extension.
