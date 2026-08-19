# SPEC v2 — Xử lý ảnh tại chỗ trên cendo.work (nhúng cendoauto.art)

## Mục tiêu
Người dùng chỉ làm việc trên **cendo.work**. Ở trang đơn, bấm 1 nút → popup (iframe
cendoauto.art) mở ngay trên trang → tự đổ ảnh Attachments vào → user review/chỉnh sửa
bằng UI gốc của cendoauto.art → bấm "Điền vào đơn" → Mockup/Design tự vào Media.

## Ràng buộc
- **KHÔNG sửa code cendoauto.art.** Chỉ điều khiển từ ngoài bằng content script + đọc repo.
- Engine xử lý vẫn là backend cendoauto.art (chạy ẩn trong iframe).

## Dữ liệu chốt (đọc từ repo cendo-automated-order-tool-hub + DOM cendo.work)
- Trang tool (iframe): `https://cendoauto.art/tools/photo-line`
- Ô nạp ảnh: `<input type=file webkitdirectory>` (onChange → nhận 12/16 ảnh)
- Nút chạy: button chữ **"Bắt đầu xử lý"**
- Kết quả: `<img src=".../goi_ket_qua/Mockup.png">`; Design = thay `Mockup.png`→`Design.png`
- Ảnh input cendo.work: `a.attachments_item__…` → `href` = ảnh gốc trên `content.pancake.vn`
- Media (đích điền): nút "Upload" mở react-dropzone (đã xử lý ở v1)
- cendoauto.art **không cần đăng nhập**

## Kiến trúc (tất cả nằm trong EXTENSION)
```
cendo.work (top)                         background(SW)              cendoauto.art (iframe)
content-order.js                         background.js              content-source.js (all_frames)
  ⚡ nút "Xử lý & điền"
  1. gom href Attachments ──START──▶ fetch 12 ảnh (pancake) lưu session
  2. mở modal iframe  ◀──sessionId──
        src=.../tools/photo-line?cendo_embed=SID
                                                     ◀──GET(SID)──  3. lấy ảnh
                                          ─images──▶               4. đổ vào input + "Bắt đầu xử lý"
                                                                    5. UI review/edit (gốc)
                                                     ◀─RESULT(SID)─ 6. user bấm "Điền vào đơn"
  7. đóng modal ◀──CLOSE──           relay
  8. điền Media ◀──CENDO_TASK──       (dùng content-target+inject v1)
```

## Chống chặn nhúng
cendoauto.art có thể gửi `X-Frame-Options`/`CSP frame-ancestors` chặn iframe.
→ extension dùng `declarativeNetRequest` gỡ 2 header đó CHỈ cho response sub_frame của
cendoauto.art (can thiệp phía trình duyệt, không đụng server).

## File
- `rules.json` — DNR gỡ header chặn iframe
- `content-order.js` — nút + modal iframe trên cendo.work (mới)
- `content-source.js` — thêm chế độ embed (tự đổ ảnh + nút "Điền vào đơn")
- `background.js` — fetch attachments, giữ session, relay kết quả
- `content-target.js`, `inject.js` — điền Media (tái dùng v1, không đổi)

## Lưu ý vận hành
- Chỉ chạy ở đơn có đúng 12/16 ảnh Attachments (đúng yêu cầu tool).
- Ảnh input tải qua background (khác origin pancake → cần host_permission).
