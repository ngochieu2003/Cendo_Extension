# Thời Khoá Biểu 3D – Extension tạo Mockup & Design (cendo.work)

Chèn nút trên trang đơn hàng cendo.work. Bấm nút → popup liệt kê **tất cả item Thời khoá biểu**
trong đơn, tự lấy **tên khách ở External note** (dòng thứ n → item thứ n) và tự chọn
**mẫu bảng theo mục “Thiết kế”** của từng item, ghép thành **Mockup (1254×1254)** +
**Design (1254×1254)** rồi **tự điền vào ô Upload** của đúng từng item.

3 mẫu bảng: **Cấp 1 Cơ Bản** · **Cấp 1 Thỏ Hồng** · **Cấp 1 Vũ Trụ**.
Chữ trên mockup dùng font **Lobster** (có viền theo màu từng bảng); file Design là nền trắng,
chữ đen **Arial Bold** canh giữa (cả 3 mẫu dùng chung 1 kiểu Design).

## Cài đặt (Chrome / Edge / Cốc Cốc)
1. Mở `chrome://extensions`
2. Bật **Developer mode** (góc trên phải)
3. Bấm **Load unpacked** → chọn thư mục `tkb-extension`
4. Mở một đơn trên `cendo.work` → nút **🗓 Tạo Mockup Thời Khoá Biểu** hiện ở góc phải dưới.

> Sau khi sửa code, quay lại `chrome://extensions` bấm **Reload** ở thẻ extension rồi F5 lại trang.

## Cách dùng
1. Bấm **🗓 Tạo Mockup Thời Khoá Biểu**.
2. Popup liệt kê từng item: mẫu bảng đã nhận (đổi bằng 3 nút Cơ Bản / Thỏ Hồng / Vũ Trụ nếu sai)
   và ô tên đã điền sẵn theo dòng tương ứng của External note.
3. Bấm vào 1 item để xem preview của item đó; sửa tên / cỡ chữ / vị trí nếu cần
   (kéo thẳng trên ảnh preview, lăn chuột để đổi cỡ chữ). Mỗi item nhớ chỉnh riêng.
4. Bấm **✅ Điền vào Mockup & Design** — điền lần lượt cho **tất cả** item có tên;
   hoặc **⬇ Tải PNG (tất cả)** để up tay.

### Nhiều item trong 1 đơn
- Ghép theo **thứ tự**: dòng 1 của External note → item 1 (theo thứ tự hiển thị trên trang đơn).
- Note lệch số dòng so với số item, hoặc item nào chưa có tên → popup **báo đỏ**, vẫn cho gõ tay;
  item để trống sẽ bị bỏ qua khi điền. Luồng tự động thì bỏ qua cả đơn và ghi lý do lên Lark.

## Tinh chỉnh toạ độ về sau
Toàn bộ thông số nằm ở đầu `content.js`:

```js
const TPL = {
  coban:   { size: 53, stroke: 6, baseY: 977,  cx: 627, maxW: 640, ink: "#1240c2" },
  thohong: { size: 47, stroke: 5, baseY: 1000, cx: 627, maxW: 700, ink: "#f86a99" },
  vutru:   { size: 47, stroke: 5, baseY: 960,  cx: 627, maxW: 700, ink: "#093283" },
};
```

- `size` cỡ chữ · `stroke` độ dày viền · `baseY` đường chân chữ · `cx` tâm ngang ·
  `maxW` bề ngang tối đa (tên dài hơn tự thu nhỏ) · `ink` màu viền.
- Các con số đo trực tiếp từ 3 ảnh mockup mẫu (khung 1254×1254), sai lệch so với mẫu ≤ 3 px.
- File Design: sửa khối `DESIGN` (1254×1254, nền trắng, chữ đen, cỡ 102, baseline y = 646).

Ảnh nền 3 mẫu nằm trong `assets/` (bản chưa có tên).

## Ghi chú kỹ thuật
- Tên khách = mỗi **dòng có nội dung** của External note là 1 tên; tự bỏ nhãn “Tên:” nếu có.
- Quét item: mỗi `[class*="media_row"]` → `closest('[class*="item_container"]')`, lọc item có chữ
  “Thời khoá biểu”/“TKB”, đọc `SKU ID:` và `Thiết kế: …`.
- Mẫu bảng: dò từ khoá *cơ bản / thỏ hồng / vũ trụ* trong mục “Thiết kế” (không phân biệt hoa thường,
  có dấu hay không); dự phòng theo fulfillment SKU `P-3D-TKB-01-N` (cơ bản) · `-TKB-VT-` (vũ trụ) ·
  `-TKB-TH-` (thỏ hồng). Nhận sai thì bấm chọn tay trong popup.
- Auto-fill (**v1.1.0 — cơ chế lấy theo userscript "Cendo → Raccoonie v9.8"** đã chạy ổn
  trong sản xuất trên chính trang này). `injected.js` chạy ở **MAIN world**, điền
  **tuần tự từng ô**, mỗi ô:
  1. đóng modal đang hiện (nếu có) trước khi bắt đầu;
  2. tìm item theo **SKU ID** (dự phòng theo thứ tự), tìm ô theo nhãn
     `[class*="controller_field"]` = “mockup”/“design”;
  3. bấm nút Upload của ô (loại tuyệt đối nút thùng rác: mọi nút trong
     `controller_header` là nút xoá) → chờ modal có tiêu đề
     `Upload media (mockup|design)` **đang hiển thị thật** và lấy `input[type=file]`
     bên trong; tiêu đề lệch ô thì đóng modal, báo lỗi, không điền bừa;
  4. chèn file bằng **native setter** `HTMLInputElement.prototype.files`
     (`desc.set.call`) + event `input`/`change` → React nhận ra, Cendo tự upload.
     **KHÔNG giả lập kéo-thả** — Raccoonie ghi rõ cách đó "báo thành công giả";
  5. chờ preview hiện ở đúng ô (img / preview_container / nút thùng rác xuất hiện
     trong header), poll 350 ms tối đa 12 s, rồi mới sang ô kế tiếp.
- **Không ghi đè**: ô nào đã có ảnh thì bỏ qua và báo “ô đã có ảnh sẵn”. Muốn làm lại phải bấm
  thùng rác xoá ảnh cũ trên trang rồi chạy lại.
- ⚠️ Lỗi đã sửa ở v1.0.1: bản đầu sau khi thả ảnh có đi tìm nút “Upload/Save” trên **toàn trang**
  để bấm xác nhận — trang này không có nút xác nhận, nên nó bấm trúng nút Upload của item khác
  làm ảnh nhảy lệch ô. Nay mọi thao tác đều bị giới hạn trong modal đang mở.
- ⚠️ **Lỗi đã sửa ở v1.0.3 (nguyên nhân thật của vụ "điền quá lâu rồi lỗi")**: modal của cendo là
  Bootstrap `div.modal.show` với `position: fixed`, mà phần tử `position:fixed` thì
  **`offsetParent` luôn = `null`**. Code cũ lọc modal bằng `m.offsetParent !== null` nên
  **không bao giờ thấy modal** → mỗi ô chờ hết timeout rồi báo lỗi → 4 ô = rất lâu + toàn lỗi.
  Nay dò modal bằng `.modal.show` + chiều cao thật (đo được **843 ms**, trước đó là vô hạn).

### Cấu trúc DOM thật (soi trực tiếp trên đơn 72033)
```
[class*="media_row"]                                <- 1 item
  [class*="controller_container"]                   <- 1 ô media
    [class*="controller_field"]  = "mockup"|"design"   (nhãn chuẩn để nhận ô)
    ô TRỐNG  : button.button_button__…  (chữ "Upload")
    ô CÓ ẢNH : <img> + button.remove_button__… (THÙNG RÁC) + button.view_button__…
div.modal.show                                      <- Bootstrap, position:fixed
  .modal-title = "Upload media (mockup)" | "Upload media (design)"
  [class*="uploader_inner"] > input[type="file"]    <- vùng thả
  nút duy nhất: button.btn-close                    <- KHÔNG có nút xác nhận
```
Vì ô đã có ảnh thì **nút đầu tiên là thùng rác**, `uploadBtn()` chỉ nhận nút có chữ “Upload”
hoặc class `button_button` — không bao giờ fallback sang “nút đầu tiên”.

Gõ `__TKB_DIAG__()` trong Console trang đơn để in ra bảng chẩn đoán từng item/từng ô.
- Chạy song song được với extension **Hộp Nhạc** (khác namespace, khác vị trí nút).

## Luồng tự động – chạy theo lịch + báo Lark
Nút **🗓 Auto TKB** ở góc trái dưới trang cendo.work: bật/tắt lịch, giờ, quy mô, Chạy ngay.
Bấm icon extension (hoặc `chrome://extensions` → Details → Extension options) để mở trang cài đặt đầy đủ:
webhook Lark, keyword, lịch sử 20 lần chạy gần nhất.

Điều kiện làm đơn: có tag **“Up đủ thông tin”**, item **Thời khoá biểu** (tên SP hoặc SKU chứa `TKB`),
**Mockup và Design đều trống**. Đơn nhiều item được làm trọn gói: tên gán theo thứ tự dòng note,
**bắt buộc số dòng tên = số item TKB** thì mới chạy. Đơn đã có ảnh / khác trạng thái → không đụng.
Đơn bất thường (lệch số dòng tên/số item, không đọc được mục Thiết kế, External note trống,
tên dài > 40 ký tự, item chỉ có 1/2 ảnh…) → bỏ qua và ghi lý do + link trong tin Lark.

> ⚠️ Nếu SKU thật của Thời khoá biểu không chứa chữ `TKB`, sửa hàm `isTKB()` trong `auto.js`
> cho khớp mã thật rồi Reload extension.

Kỹ thuật: `bg.js` (chrome.alarms, mở/tìm tab cendo.work, gửi Lark) · `auto.js` (content script:
gọi `/api/orders/search`, `/api/orders/{id}/items`, render bằng `window.__TKB_API__` của content.js,
upload qua `/api/orders/{id}/items/{itemId}/upload-media` field=mockup|design, kiểm tra lại sau upload)
· `options.html/js`. Yêu cầu: Chrome đang mở và đã đăng nhập cendo.work vào giờ chạy.
