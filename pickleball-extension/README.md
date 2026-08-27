# 🥒 Móc Khoá Pickleball 3D – Tạo Mockup & Design (cendo.work)

Extension Chrome (Load unpacked) cho đơn **Móc Khoá Pickleball 3D** trên cendo.work — dùng chung cho
**2 sản phẩm cùng 1 output**:

| Sản phẩm (`product_name`) | Variant | fulfillment_sku |
|---|---|---|
| `Móc Khóa 3D Clicky Pickleball` | `Mẫu: Móc Khóa Clicky Pickleball - Yellow, Phân loại: In tên` (màu **tiếng Anh**) | `P-3D-K04-Yellow-N` |
| `Móc Khoá Pickleball Bóng Xoay Tròn 3D` | `Màu: Màu Vàng, Phân loại: In tên` (màu **tiếng Việt**) | `P-3D-K08-Yellow-N` (có đơn để trống) |

Kiến trúc sao chép nguyên từ `tennis-extension` (namespace `PICKLE_`), chỉ khác mẫu ảnh, luật đọc màu
(Việt + Anh), **chữ xoay dọc ngược chiều kim đồng hồ** bên trái móc khoá và mỗi màu 1 toạ độ riêng.

## Có gì mới
- **1.0.0** (27/08/2026) – bản đầu: popup điền tay + luồng tự động theo lịch + báo Lark.
  Toạ độ chữ đo bằng khớp 7 ảnh mẫu THUYTHU (thư mục `Pickeball/ví dụ`) với ảnh chưa điền rồi sweep
  IoU bằng chính `content.js` trong Chromium headless (IoU 0.84–0.87, ngang Tennis).
  Đã soi đơn thật `6a7d39f5eb6d0fec27a85244` (#71244): 7 item 7 màu (Bóng Xoay Tròn), note 7 dòng tên,
  tag "Up đủ thông tin", chưa có ảnh → sẽ là đơn auto làm ở lần chạy đầu.

## Cách hoạt động
- **Nhận diện item**: `product_name` chứa chữ *pickle* (bỏ dấu) → nhận cả 2 sản phẩm trên.
- **Tên khách**: External note — mỗi dòng có nội dung là 1 tên, dòng thứ n → item Pickleball thứ n
  (theo thứ tự hiển thị trong đơn). Giống Cầu lông / Tennis.
- **Mẫu (màu)**: đọc `variant_name` (tiếng Việt *Màu Đen* hoặc tiếng Anh *- Black*), dự phòng
  `fulfillment_sku` → 7 mẫu: Đen · Đỏ · Vàng · Xanh Bạc Hà · Xanh Lá · Hồng · Cam
  (`assets/{black,red,yellow,mint,green,pink,orange}.jpg`). Màu có tên nhưng **chưa có mẫu**
  (Blue/Xanh Dương, Purple/Tím, White/Trắng) → auto bỏ qua đơn và báo Lark lý do.
- **Mockup 1500×1500**: tên khách **IN HOA** font **Lemonada Bold**, kiểu sticker (chữ trắng +
  blob đỏ `#d01a2c` + vòng tròn đỏ) — cùng style Cầu lông/Tennis — nhưng **xoay −90°** (đọc từ
  **dưới lên**, đầu chữ quay sang **trái**, vòng tròn ở **trên** = sau chữ) đặt **bên trái** móc khoá.
  Cỡ chữ 72, maxL 900, toạ độ riêng từng màu trong `TPL` ở đầu `content.js`. Tên dài tự thu nhỏ.
- **Design 1254×1254**: nền trắng, tên (giữ nguyên hoa/thường như note) chữ đen Arial Bold 102,
  căn giữa, tự thu nhỏ — giống hệt TKB/Cầu lông/Tennis (khớp `file design.png` Thuan gửi).

## Dùng tay
Mở trang đơn → nút **"🥒 Tạo Mockup Pickleball"** (góc phải dưới) → popup tự đọc note + màu từng item
→ sửa tên/màu nếu cần, kéo chữ trên preview để dời, lăn chuột đổi cỡ → **Điền vào Mockup & Design**
(hoặc **Tải PNG**). Không ghi đè ô đã có ảnh.

## Luồng tự động
Widget **"🥒 Auto Pickleball"** (góc trái dưới) hoặc trang Cài đặt của extension:
- Chỉ làm đơn tag **"Up đủ thông tin"**, item Pickleball mà **cả Mockup & Design đều trống**.
- Điều kiện: số dòng tên trong note **= số item Pickleball**, đọc được màu và màu có mẫu;
  lệch → bỏ qua, báo lý do lên Lark.
- Upload qua `POST /api/orders/{oid}/items/{itemId}/upload-media` (field=mockup|design),
  kiểm tra lại trước khi up (không đè), up xong verify đủ 2 ảnh.
- Báo cáo về group Lark (webhook mặc định giống các extension khác, đổi được ở trang cài đặt).

## Vị trí UI (tránh đè extension khác)
- Nút popup: góc phải dưới `bottom: 466px` (Tennis 410 · Cừu 354 · Cầu lông 298 · Instax 242 · TKB 186).
- Widget auto: góc trái dưới `bottom: 390px`, panel 438px (Tennis 338 · Cừu 286 · Cầu lông 234 · Instax 182 · TKB 130).

## Điểm cần chỉnh khi lên đơn thật
- `isPickleText()` nhận theo chữ *pickle* — sửa nếu shop đổi tên sản phẩm.
- Thêm màu mới: convert PNG 1500×1500 → `assets/<key>.jpg`, thêm dòng vào `TPL` + `TPL_ORDER`
  (đo `baseX`/`cy` riêng) và luật trong `colorFromText()`.
- Chưa xử lý 1 item quantity > 1 cần nhiều tên — hiện 1 item = 1 tên.
- Font: file `Lemonada-Bold (2).ttf` Thuan gửi là bản subset hỏng outline chữ có dấu (như Cầu lông/Tennis)
  → dùng `assets/Lemonada-Bold.ttf` bản đầy đủ của caulong-extension.
