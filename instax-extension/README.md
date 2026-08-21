# 📸 Móc Khóa Clicky Instax 3D – Tạo Mockup & Design (cendo.work)

Chrome extension (Manifest V3) tự làm Mockup + Design cho đơn **Móc Khóa Clicky
Instax 3D Cá Nhân Hóa** trên cendo.work. Kiến trúc sao chép từ `tkb-extension`
(namespace `INSTAX_` / `instax-` riêng, chạy song song được với các extension
Hộp Nhạc & Thời Khoá Biểu).

## Cài đặt
1. Mở `chrome://extensions`, bật **Developer mode**.
2. **Load unpacked** → chọn thư mục `instax-extension`.
3. F5 lại tab cendo.work đang mở.

## Cách hoạt động
- **Ảnh khách**: mục **Attachments** của đơn (chỉ lấy type ảnh), **ảnh thứ n →
  item Instax thứ n** theo thứ tự hiển thị. Lệch số lượng ảnh/item → popup báo
  đỏ để gán tay từng ảnh; luồng auto bỏ qua cả đơn và báo lý do lên Lark.
- **Mẫu mockup**: đọc mục **Màu** của item (`Màu: Màu Xanh Dương / Xanh Lá /
  Hồng / Cam`), dự phòng theo fulfillment SKU `P-3D-K06-Blue|Green|Pink|Orange`.
- **Mockup** 1000×1000: ảnh mẫu theo màu + ảnh khách **phủ kín vùng đen** (tấm
  phim instax), cắt mép thừa, căn giữa. Mockup vẽ lại từ chính file Design nên
  luôn khớp 100% với ảnh sẽ in.
- **Design** 270×330 px = **2,29 × 2,79 cm @ 300 dpi** (PNG có ghi chunk pHYs
  nên Photoshop mở ra đúng kích thước cm): ảnh khách phủ kín khung, cắt đều
  2 mép thừa, căn giữa, nền trắng.
- Nhận diện item Instax: text chứa `instax` hoặc SKU chứa `K06`
  (`isInstaxText()` trong content.js – sửa nếu shop đổi mã).

## Nút trên trang đơn
**📸 Tạo Mockup Instax** (góc phải dưới, trên nút TKB): mở popup xem trước.
- Dải ảnh Attachments: bấm 1 ảnh để gán cho item đang chọn (hoặc chọn trong
  dropdown của từng item).
- Chỉnh ảnh từng item: kéo thẳng trên khung Design để dời ảnh, lăn chuột /
  ô "Phóng %" để phóng to (100% = vừa khít khung).
- **⬇ Tải PNG**: tải file về máy. **✅ Điền vào Mockup & Design**: tự bấm
  Upload từng ô trên trang (cơ chế modal + native setter kế thừa nguyên từ
  tkb-extension v1.1.x — xem DOM-CENDO.md trong project).
- Chẩn đoán: gõ `__INSTAX_DIAG__()` trong Console.

## Luồng tự động
Widget **📸 Auto Instax** (góc trái dưới, trên widget TKB) hoặc trang Options:
- Quét đơn tag **"Up đủ thông tin"** qua `/api/orders/search`; chỉ làm item
  Instax mà **cả Mockup và Design đều trống**; upload qua
  `POST /api/orders/{oid}/items/{itemId}/upload-media`.
- Điều kiện auto: số ảnh Attachments = số item Instax; đọc được Màu của mọi
  item cần làm; không có item chỉ có 1 trong 2 ảnh. Sai điều kiện nào →
  bỏ qua đơn + ghi rõ lý do trong báo cáo Lark.
- Kiểm tra lại ngay trước khi upload (không đè ảnh ai vừa up tay), upload
  xong xác minh lại đủ 2 ảnh mới tính là làm xong.
- Báo cáo Lark: giống format TKB (✅ đã làm / ❌ lỗi / 👀 cần xem + link đơn).
- **Webhook Lark không hardcode trong code** (repo public): mở trang Options
  của extension, dán webhook vào ô rồi bấm Lưu (lưu trong `chrome.storage`,
  không mất khi cập nhật code).

## Toạ độ vùng đen (canvas gốc 1000×1000)
Đo bằng phân tích pixel trên 4 ảnh mẫu (connected component vùng đen lớn nhất,
gần như vuông góc tuyệt đối, sai số ≤1px):

| Mẫu | x | y | w | h |
|---|---|---|---|---|
| Blue   | 385 | 155 | 204 | 273 |
| Green  | 385 | 151 | 190 | 285 |
| Pink   | 388 | 149 | 199 | 295 |
| Orange | 385 | 137 | 195 | 288 |

Vùng đen hẹp ngang hơn tỉ lệ Design (270:330) nên khi phủ kín sẽ cắt thêm một
ít 2 mép trái/phải — chấp nhận vì mockup chỉ để khách xem.

## Lưu ý kỹ thuật
- Ảnh khách nằm trên `content.pancake.vn` → content script fetch sẽ vướng
  CORS/taint canvas. Giải pháp: bg.js (service worker, có host_permissions)
  fetch hộ qua message `INSTAX_FETCH`, trả dataURL.
- Mọi quy tắc DOM/điền ảnh của cendo.work: xem `tkb-extension/DOM-CENDO.md`
  (project Cendowork Ẽxtension) — injected.js ở đây là bản sao nguyên cơ chế
  đã kiểm chứng, chỉ đổi namespace.

## Đơn mẫu đã đối chiếu
`https://cendo.work/orders/6a87c7686dc7208bb4d3f613` (system 72042): 4 item
Blue/Green/Pink/Orange (SKU `NDT260518-25-1…4`, fulfillment `P-3D-K06-*`),
4 ảnh Attachments type image.

## Version
- **1.0.0** – bản đầu: popup điền tay + luồng auto + báo Lark.
