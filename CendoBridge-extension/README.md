# Cendo Bridge (Extension) — cendoauto.art ➜ cendo.work

Extension nhỏ giúp gửi thẳng ảnh kết quả từ **cendoauto.art** sang ô upload của
**cendo.work**, bỏ được bước tải về rồi up lại thủ công.

## Cách hoạt động

1. Trên trang kết quả **cendoauto.art** hiện 1 nút nổi góc dưới phải:
   **⇪ Gửi sang cendo.work**.
2. Bấm nút → extension đọc URL ảnh `Mockup.png` ngay trong DOM
   (`<img src=".../goi_ket_qua/Mockup.png">`), suy ra URL `Design.png`, tải 2
   file (same-origin, không dính CORS). Không cần tải/giải nén ZIP, không sửa
   code cendoauto.art.
3. Ảnh được chuyển sang tab **cendo.work** đang mở. `inject.js` (chạy trong
   MAIN world) ghi đè hàm mở hộp thoại: tự bấm nút **Upload** của ô Mockup/Design
   rồi tuồn ảnh vào bằng `DataTransfer` — không mở hộp thoại Windows.
   Làm lần lượt: Mockup trước, Design sau.

> Điều kiện: **tab cendo.work phải đang mở sẵn** đúng trang đơn hàng trước khi bấm.

## Cài đặt (Chrome / Edge / Cốc Cốc)

1. Mở `chrome://extensions`
2. Bật **Developer mode** (góc trên phải)
3. **Load unpacked** → chọn thư mục `cendo-bridge-extension` này
4. Mở cendoauto.art → thấy nút nổi góc dưới phải

Sau khi sửa code: quay lại `chrome://extensions` bấm **Reload (⟳)** trên thẻ extension.

## Các file

| File | Vai trò |
|------|---------|
| `manifest.json` | Khai báo extension, quyền 2 domain |
| `content-source.js` | cendoauto.art — chèn nút, lấy URL ảnh, tải 2 file |
| `background.js` | Cầu nối, tìm tab cendo.work |
| `content-target.js` | cendo.work (isolated) — điều phối lần lượt 2 slot |
| `inject.js` | cendo.work (MAIN world) — chặn hộp thoại, nhét file vào input |

## Selector đang dùng (chỉnh khi web đổi giao diện)

- **cendoauto.art** (`content-source.js`): `img[src*="Mockup.png"]`
- **cendo.work** (`inject.js`): tìm nút có chữ "Upload" trong khối
  `[class*="controller_container__"]`, phân biệt Mockup/Design theo
  `[class*="controller_header__"]`.

> Class của cendo.work có đuôi băm (đổi khi họ build lại) nên dùng khớp tiền tố
> `class*="controller_container__"`.

## Lưu ý

- Nếu bạn **chỉnh ảnh** trên cendoauto.art sau khi xử lý, `Design.png` chỉ dựng
  lại khi bấm "Tải gói ZIP". Khi đó nút extension có thể tải bản Design cũ — cứ
  bấm tải ZIP 1 lần cho web dựng lại rồi hãy gửi.

## v0.4.0 — Bot tự động 8h30 sáng

`auto-run.js` (importScripts vào service worker) + `popup.html/js`:

- `chrome.alarms` 8h30 hằng ngày (chạy bù khi mở Chrome muộn, khóa 1 lần/ngày qua `lastRunDate`).
- Quét `/orders` với filter tag **"Up đủ thông tin"** (điều khiển DOM qua message `AUTO_*` trong `content-order.js`), gom mọi đơn **Flip Photo Book** trên tất cả các trang.
- Mỗi đơn: `AUTO_CHECK_ORDER` đọc số Attachments + trạng thái 2 ô Media. Đủ điều kiện (12/16 ảnh, Media trống) → chạy luồng embed với `&cendo_auto=1`: `content-source.js` tự đợi Mockup, gom cảnh báo (ảnh ghép/cần designer — đọc DOM cendoauto.art), tự gọi `embedFill()`; lỗi báo về bằng `CENDO_AUTO_STATUS` thay vì `alert()`.
- Xác minh đã điền bằng cách poll lại Media; thử lại 1 lần nếu lỗi; trần 25 đơn/lượt.
- Báo cáo Lark webhook (fetch từ service worker — có host_permission `open.larksuite.com` nên không vướng CORS; tin nhắn luôn bắt đầu bằng keyword "Thông báo").
- Keepalive 20s/lần giữ service worker MV3 sống suốt lượt chạy.

Log lượt chạy gần nhất: `chrome.storage.local` key `lastRunLog` (xem nhanh trong popup).
