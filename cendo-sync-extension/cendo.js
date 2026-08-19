/* =========================================================================
 * Cendo Sync — phần chạy trên tab CENDO (cendo.work)
 * -------------------------------------------------------------------------
 * - Khi tab Cendo vừa mở/reload: lập tức "hối" tab Pancake lấy dữ liệu mới
 *   (đặt cờ syncPing) rồi đồng bộ ngay.
 * - Đồng bộ lại mỗi khi dữ liệu Pancake thay đổi + nền dự phòng.
 * - Ô "Private note" của Cendo là <textarea> readOnly do React kiểm soát nên
 *   KHÔNG thể gán giá trị trực tiếp (React ghi đè lại). Vì vậy: sau khi ghi
 *   xong ĐƠN ĐANG MỞ, tiện ích TỰ RELOAD 1 lần để React nạp lại từ server và
 *   hiển thị đúng. Có khoá chống lặp.
 * ========================================================================= */
(() => {
  'use strict';

  const CONFIG = {
    FALLBACK_SECONDS: 15,          // nền dự phòng (giây)
    ONLY_WRITE_IF_EMPTY: false,    // true = chỉ ghi khi Private note trống
    DRY_RUN: false,                // true = chỉ log, KHÔNG ghi
    AUTO_RELOAD_OPEN_ORDER: true,  // true = tự reload để hiện ngay đơn đang mở
    STALE_MINUTES: 10,
  };

  const TAG = '%c[Cendo-Sync/Cendo]';
  const CSS = 'color:#0a7';
  let running = false, lastTick = 0;

  async function cendoSearch(orderNo) {
    const r = await fetch('/api/orders/search', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: String(orderNo), limit: 1 }),
    });
    if (!r.ok) throw new Error('search HTTP ' + r.status);
    const j = await r.json();
    return (j.data && j.data.items && j.data.items[0]) || null;
  }
  async function cendoGetNote(id) {
    const r = await fetch('/api/orders/' + id, { credentials: 'include' });
    if (!r.ok) throw new Error('get HTTP ' + r.status);
    const j = await r.json();
    return (j.data && typeof j.data.note === 'string') ? j.data.note : '';
  }
  async function cendoSetNote(id, note) {
    const r = await fetch('/api/orders/' + id + '/note', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!r.ok) throw new Error('setNote HTTP ' + r.status);
    return r.json();
  }

  async function tick(reason) {
    if (running) return;
    if (Date.now() - lastTick < 800) return;
    running = true; lastTick = Date.now();
    let reloadForOpenOrder = false;
    try {
      const st = await chrome.storage.local.get(['pancakePrint', 'doneMap']);
      const pp = st.pancakePrint;
      const done = st.doneMap || {};
      if (!pp || !Array.isArray(pp.orders)) {
        console.log(TAG, CSS, 'Chưa có dữ liệu Pancake. Mở & giữ 1 tab pos.pancake.vn (đã đăng nhập).');
        return;
      }
      if (CONFIG.STALE_MINUTES && Date.now() - pp.ts > CONFIG.STALE_MINUTES * 60000)
        console.warn(TAG, CSS, `Dữ liệu Pancake cũ > ${CONFIG.STALE_MINUTES} phút — tab Pancake còn mở không?`);

      let wrote = 0, checked = 0, notFound = 0;
      for (const o of pp.orders) {
        if (!o.note_print || !o.note_print.trim()) continue;
        checked++;
        if (done[o.id] === o.note_print) continue;

        let c;
        try { c = await cendoSearch(o.id); }
        catch (e) { console.warn(TAG, CSS, 'search lỗi', o.id, e.message); continue; }
        if (!c) { notFound++; continue; }

        let cur = '';
        try { cur = await cendoGetNote(c._id); }
        catch (e) { console.warn(TAG, CSS, 'đọc note lỗi', o.id, e.message); continue; }

        // Đã trùng (kể cả sau khi tự reload) -> đánh dấu xong, KHÔNG ghi/không reload
        if (cur === o.note_print) { done[o.id] = o.note_print; continue; }
        if (CONFIG.ONLY_WRITE_IF_EMPTY && cur.trim()) {
          console.log(TAG, CSS, 'bỏ qua', o.id, '(Private note đã có nội dung)'); continue;
        }
        if (CONFIG.DRY_RUN) { console.log(TAG, CSS, '[DRY_RUN] sẽ ghi', o.id, '→', o.note_print); continue; }

        try {
          await cendoSetNote(c._id, o.note_print);
          done[o.id] = o.note_print; wrote++;
          if (location.pathname.includes(c._id)) reloadForOpenOrder = true; // đơn đang mở
          console.log(TAG, CSS, '✔ đồng bộ', o.id, '→', o.note_print);
        } catch (e) { console.warn(TAG, CSS, 'ghi lỗi', o.id, e.message); }
      }
      // Lưu trạng thái TRƯỚC khi reload để chắc chắn không lặp
      await chrome.storage.local.set({ doneMap: done });
      if (wrote || notFound) console.log(TAG, CSS, `Vòng ${reason || ''}: ghi ${wrote}, chưa có bên Cendo ${notFound}/${checked}.`);
    } catch (e) {
      console.warn(TAG, CSS, 'tick lỗi', e.message);
    } finally {
      running = false;
      if (reloadForOpenOrder && CONFIG.AUTO_RELOAD_OPEN_ORDER && !CONFIG.DRY_RUN) {
        console.log(TAG, CSS, 'Đơn đang mở vừa cập nhật — tự reload để hiển thị.');
        setTimeout(() => location.reload(), 400);
      }
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.pancakePrint) tick('dữ liệu mới');
  });

  console.log(TAG, CSS, `Khởi động. Đồng bộ tức thì khi mở tab + nền ${CONFIG.FALLBACK_SECONDS}s. DRY_RUN=${CONFIG.DRY_RUN}.`);
  chrome.storage.local.set({ syncPing: Date.now() });
  tick('mở tab');
  setInterval(() => tick('nền'), CONFIG.FALLBACK_SECONDS * 1000);
})();
