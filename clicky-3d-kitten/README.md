# CLICKY 3D KITTEN – Cendo → Raccoonie (userscript v9.8.0)

Userscript (Tampermonkey / Violentmonkey) chạy trên **cendo.work**: vẽ mockup **móc khoá Clicky 3D** (kiểu ngang không đầu
hoặc kiểu dọc có đầu nhân vật – Kitten/Sanrio…) bằng canvas ngay trên trang đơn, rồi **đính thẳng vào ô Mockup/Design**
của Cendo. Có bảng xem trước để sửa tay, Shift+bấm để tải PNG, "Làm cả đơn" và lịch tự động.

File: [`CLICKY-3D-KITTEN.user.js`](CLICKY-3D-KITTEN.user.js)

## Cài đặt
1. Cài Tampermonkey (Chrome/Edge/Cốc Cốc).
2. Mở file `CLICKY-3D-KITTEN.user.js` trên GitHub → bấm **Raw** → Tampermonkey tự bật hộp cài → **Install**.
   (Hoặc Tampermonkey → Dashboard → Utilities → *Install from URL* → dán link raw.)
3. Mở một đơn trên cendo.work → thấy nút của script.

## Cập nhật
Trong phần header của script có 2 dòng `@updateURL` / `@downloadURL`. Sửa thành link raw của repo này, ví dụ:

```
// @updateURL    https://raw.githubusercontent.com/ngochieu2003/Cendo_Extension/main/clicky-3d-kitten/CLICKY-3D-KITTEN.user.js
// @downloadURL  https://raw.githubusercontent.com/ngochieu2003/Cendo_Extension/main/clicky-3d-kitten/CLICKY-3D-KITTEN.user.js
```
rồi tăng `@version` mỗi lần sửa → Tampermonkey của cả team **tự cập nhật** (mặc định kiểm tra mỗi ngày; có thể bấm
*Check for userscript updates* để lấy ngay).

## Ghi chú
- Icon trong External note viết dạng `*HRT*`, `*STR*`, `*FLW*`… (xem bảng mã ở đầu file).
- Phần PARSER (mục 3 trong file) là chỗ duy nhất phụ thuộc HTML của Cendo; web đổi giao diện thì chỉnh `CONFIG.noteSelectors`.
- Cùng họ với `Gen-mockup-design/cendo-to-raccoonie.user.js` (bản trước); bản này là bản đang dùng cho Clicky 3D Kitten.
