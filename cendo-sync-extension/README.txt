CENDO SYNC — Đồng bộ "Để in" (Pancake) → "Private note" (Cendo)
================================================================

Dùng chính phiên đăng nhập sẵn có (KHÔNG cần API key, không cần quyền admin).
Chạy trên 2 tab đang mở: pos.pancake.vn (đọc "Để in") và cendo.work (ghi
"Private note"). Hai phần trao đổi qua bộ nhớ nội bộ của tiện ích.


TỐC ĐỘ / ĐỘ TRỄ
---------------
- Nền: mỗi 10 giây (Pancake) và 15 giây dự phòng (Cendo). Muốn nhanh hơn nữa,
  chỉnh POLL_SECONDS trong pancake.js (có thể còn 5).
- TỨC THÌ: mỗi khi bạn MỞ/RELOAD tab cendo.work, tiện ích lập tức hối tab
  Pancake lấy dữ liệu mới rồi ghi ngay.
- HIỂN THỊ: ô Private note của Cendo là textarea readOnly do React kiểm soát,
  không thể "nhét" chữ vào trực tiếp. Nên sau khi ghi xong ĐƠN ĐANG MỞ, tiện
  ích TỰ RELOAD trang 1 lần để React nạp lại từ server và hiện đúng (có khoá
  chống lặp). Muốn tắt tự reload: đặt AUTO_RELOAD_OPEN_ORDER: false trong cendo.js.
  => Quy trình: điền "Để in" bên Pancake -> Lưu -> mở/reload đơn đó bên Cendo
     -> trang tự làm mới 1 nhịp -> thấy ở Private note.


CÀI ĐẶT (Load unpacked)
------------------------
1. Giải nén file zip ra một thư mục.
2. Mở Chrome -> chrome://extensions
3. Bật "Developer mode" (góc trên phải).
4. "Load unpacked" -> chọn thư mục vừa giải nén.
5. Nếu sửa file .js sau này: quay lại trang này, bấm nút reload (⟳) trên tiện ích.


CÁCH DÙNG
---------
1. Đăng nhập bình thường cả pos.pancake.vn và cendo.work.
2. Mở 1 tab pos.pancake.vn (trang đơn hàng) và 1 tab cendo.work, để yên.
3. Xem log: F12 -> Console trên từng tab.


CHẠY THỬ AN TOÀN TRƯỚC (khuyến nghị)
------------------------------------
- Mở cendo.js, đổi  DRY_RUN: false  ->  DRY_RUN: true , Save, rồi reload tiện ích.
- Nó chỉ log "sẽ ghi ..." mà KHÔNG ghi thật. Xem ổn thì đổi lại false + reload.


TUỲ CHỌN
--------
cendo.js:
  - FALLBACK_SECONDS    : chu kỳ nền dự phòng (mặc định 15s).
  - ONLY_WRITE_IF_EMPTY : true = chỉ ghi khi Private note trống (không đè tay).
  - DRY_RUN             : true = chỉ log.
pancake.js:
  - POLL_SECONDS        : chu kỳ nền đọc Pancake (mặc định 10s, giảm được).
  - PAGE_SIZE           : số đơn mới nhất quét mỗi vòng (mặc định 50).
  - SHOP_ID             : mã cửa hàng (tự nhận theo URL nếu đang ở trang shop).


LƯU Ý
-----
- Dùng API nội bộ (không tài liệu) của Pancake & Cendo; nếu 2 bên đổi API có thể
  phải chỉnh endpoint trong file .js.
- Chỉ đồng bộ đơn ĐÃ có bên Cendo; đơn chưa đồng bộ sẽ thử lại vòng sau.
- Mỗi vòng chỉ quét PAGE_SIZE đơn mới nhất. Điền "Để in" cho đơn quá cũ thì tăng
  PAGE_SIZE.
- Việc cập nhật hiển thị tức thì là "best-effort"; nếu giao diện Cendo đổi cấu
  trúc, giá trị vẫn được lưu ở server và sẽ hiện khi reload.
