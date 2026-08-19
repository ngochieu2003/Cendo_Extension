/* =========================================================================
 * Cendo Sync — phần chạy trên tab POS PANCAKE (pos.pancake.vn)
 * -------------------------------------------------------------------------
 * - Cứ mỗi POLL_SECONDS giây đọc đơn mới nhất (API nội bộ, dùng cookie sẵn có,
 *   KHÔNG cần API key), lấy "Để in" (note_print) lưu vào chrome.storage.
 * - NGOÀI RA: khi tab Cendo yêu cầu (đặt cờ syncPing), lập tức lấy lại ngay
 *   để đồng bộ gần như tức thì.
 * ========================================================================= */
(() => {
  'use strict';

  const CONFIG = {
    SHOP_ID: '100157270',
    PAGE_SIZE: 50,
    POLL_SECONDS: 10,               // chu kỳ nền (giây) — có thể giảm còn 5
    PRINT_NOTE_FIELD: 'note_print', // trường "Để in"
  };

  const TAG = '%c[Cendo-Sync/Pancake]';
  const CSS = 'color:#c60';
  let firstDiag = true, busy = false, lastPull = 0;

  function shopId() {
    const m = location.pathname.match(/\/shop\/(\d+)/);
    return m ? m[1] : CONFIG.SHOP_ID;
  }

  async function pull(reason) {
    if (busy) return;
    if (Date.now() - lastPull < 1500) return; // chống dội quá dày
    busy = true; lastPull = Date.now();
    try {
      const shop = shopId();
      const url = `${location.origin}/api/v1/shops/${shop}/orders`
                + `?page_size=${CONFIG.PAGE_SIZE}&page_number=1`;
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) { console.warn(TAG, CSS, 'HTTP', r.status, '(đã đăng nhập Pancake chưa?)'); return; }
      const j = await r.json();
      const arr = Array.isArray(j) ? j : (j.data || j.orders || []);
      if (!Array.isArray(arr)) { console.warn(TAG, CSS, 'Không đọc được mảng đơn.'); return; }

      if (firstDiag && arr[0]) {
        const noteKeys = Object.keys(arr[0]).filter(k => /note/i.test(k));
        console.log(TAG, CSS, 'Các trường note của Pancake:', noteKeys, '| dùng:', CONFIG.PRINT_NOTE_FIELD);
        firstDiag = false;
      }

      const list = arr
        .filter(o => o && o[CONFIG.PRINT_NOTE_FIELD] && String(o[CONFIG.PRINT_NOTE_FIELD]).trim())
        .map(o => ({ id: String(o.id), note_print: String(o[CONFIG.PRINT_NOTE_FIELD]) }));

      await chrome.storage.local.set({ pancakePrint: { orders: list, ts: Date.now(), shop } });
      console.log(TAG, CSS, `Đẩy ${list.length} đơn có "Để in" (${reason || 'poll'}).`);
    } catch (e) {
      console.warn(TAG, CSS, 'Lỗi:', e.message);
    } finally { busy = false; }
  }

  // Phản hồi tức thì khi tab Cendo yêu cầu làm mới
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.syncPing) pull('ping từ Cendo');
  });

  console.log(TAG, CSS, `Khởi động. Nền mỗi ${CONFIG.POLL_SECONDS}s + phản hồi tức thì. Giữ tab này mở.`);
  pull('start');
  setInterval(() => pull('poll'), CONFIG.POLL_SECONDS * 1000);
})();
