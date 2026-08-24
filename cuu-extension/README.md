# 🐑 Móc Khoá Clicky Chú Cừu Dễ Thương 3D – Tạo Mockup & Design (cendo.work)

Extension Chrome (Load unpacked) cho đơn **Móc Khoá Clicky Chú Cừu Dễ Thương 3D** trên cendo.work.
Làm tương tự extension Cầu Lông 3D nhưng **chỉ có 1 mẫu mockup** (không cần đọc màu).

## Có gì mới
- **1.0.0** (24/08/2026) – bản đầu: popup điền tay + luồng tự động theo lịch + báo Lark.
  Render kiểm chứng headless: khớp ảnh mẫu THUYTHU (`ví dụ.png`) sai lệch ≤ 5px trên canvas 1500;
  Design 1254×1254 giống hệt Cầu lông/TKB. Font Lemonada Bold bản đầy đủ (file TTF gửi kèm bị
  subset hỏng dấu tiếng Việt nên không dùng).

## Cách hoạt động
- **Nhận diện item**: tên sản phẩm chứa chữ **"cừu"** (sau khi bỏ dấu: `cuu`) — `isCuuText()` đầu `content.js`.
- **Tên khách**: External note — mỗi dòng có nội dung là 1 tên, dòng thứ n → item Chú Cừu thứ n
  (theo thứ tự hiển thị trong đơn). Giống Cầu lông / TKB.
- **Mockup 1500×1500**: `assets/cuu.jpg` (bản "chưa điền tên") + tên khách **IN HOA** font **Lemonada Bold**,
  kiểu sticker: chữ trắng trên blob đỏ `#d01a2c` ôm theo chữ + vòng tròn đỏ bên trái, đặt góc phải dưới.
  Toạ độ: `TPL.cuu = { cx: 966, baseY: 1291, size: 118, maxW: 900 }` đầu `content.js` — muốn xê dịch sửa ở đó.
  Tên dài tự thu nhỏ.
- **Design 1254×1254**: nền trắng, tên (giữ nguyên hoa/thường như note) chữ đen Arial Bold 102,
  căn giữa, tự thu nhỏ.

## Dùng tay
Mở trang đơn → nút **"🐑 Tạo Mockup Chú Cừu"** (góc phải dưới) → popup tự đọc note cho từng item
→ sửa tên nếu cần, kéo chữ trên preview để dời, lăn chuột đổi cỡ → **Điền vào Mockup & Design**
(hoặc **Tải PNG**). Không ghi đè ô đã có ảnh.

## Luồng tự động
Widget **"🐑 Auto Chú Cừu"** (góc trái dưới) hoặc trang Cài đặt của extension:
- Chỉ làm đơn tag **"Up đủ thông tin"**, item Chú Cừu mà **cả Mockup & Design đều trống**.
- Điều kiện: số dòng tên trong note **= số item Chú Cừu**; lệch → bỏ qua, báo lý do lên Lark.
- Upload qua `POST /api/orders/{oid}/items/{itemId}/upload-media` (field=mockup|design),
  kiểm tra lại trước khi up (không đè), up xong verify đủ 2 ảnh.
- Báo cáo về group Lark (webhook đổi được ở trang cài đặt).

## Vị trí UI (để không đè lên extension khác nếu bật cùng lúc)
- Nút popup: góc phải dưới `bottom: 354px` (TKB 186 · Instax 242 · Cầu lông 298).
- Widget auto: góc trái dưới `bottom: 286px` (TKB 130 · Instax 182 · Cầu lông 234).

## Điểm cần chỉnh khi lên đơn thật
- `isCuuText()` nhận theo chữ "cừu" — sửa nếu shop đổi tên sản phẩm / muốn nhận theo SKU.
- Chưa xử lý 1 item quantity > 1 cần nhiều tên khác nhau — hiện 1 item = 1 tên.
