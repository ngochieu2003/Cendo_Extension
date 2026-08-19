// ==UserScript==
// @name         Extension Hub - Gom nút nổi vào 1 box (Cendo)
// @namespace    https://local.hub
// @version      2.0
// @description  Gom các nút nổi của extension ở góc dưới phải Cendo vào 1 box thu gọn; bấm để mở/đóng khi cần dùng.
// @match        *://cendo.work/*
// @match        *://*.cendo.work/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* ============ CẤU HÌNH ============ */
  // ID của các nút muốn gom vào box. Muốn thêm/bớt nút nào thì sửa danh sách này.
  const IDS = [
    'rcn-btn',          // ⚡ Tạo mockup Raccoonie
    'rcn-sched-btn',    // ⏰ Auto: BẬT 08:30
    'rcn-batch-btn',    // 💫 Làm cả đơn
    'hn-open-btn',      // 🎵 Tạo Mockup Hộp Nhạc
    'cendo-order-btn',  // ⚡ Xử lý đơn Flip Photo Book
  ];
  const START_OPEN = false;   // true = mở sẵn box khi tải trang
  const FAB_LABEL  = '☰';     // biểu tượng nút bật/tắt
  /* ================================== */

  const NS = 'exthub';
  const state = {}; // id -> node đang nằm trong box

  // ---------- Tạo box + nút bật/tắt ----------
  const fab = document.createElement('button');
  fab.id = NS + '-fab';
  fab.type = 'button';
  fab.title = 'Mở/đóng hộp tiện ích';
  fab.textContent = FAB_LABEL;

  const panel = document.createElement('div');
  panel.id = NS + '-panel';

  const header = document.createElement('div');
  header.id = NS + '-header';
  header.textContent = 'Tiện ích';
  const closeBtn = document.createElement('span');
  closeBtn.textContent = '✕';
  closeBtn.id = NS + '-close';
  header.appendChild(closeBtn);

  const boxBody = document.createElement('div');
  boxBody.id = NS + '-body';

  panel.appendChild(header);
  panel.appendChild(boxBody);
  document.body.appendChild(panel);
  document.body.appendChild(fab);

  function setOpen(open) {
    panel.classList.toggle('open', open);
    fab.classList.toggle('active', open);
  }
  fab.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  closeBtn.addEventListener('click', () => setOpen(false));
  setOpen(START_OPEN);

  // ---------- Style ----------
  const css = `
  #${NS}-fab{
    position:fixed; right:20px; bottom:24px; z-index:2147483000;
    width:52px; height:52px; border-radius:50%; border:none; cursor:pointer;
    background:#2f6b4f; color:#fff; font-size:22px; line-height:52px;
    box-shadow:0 4px 14px rgba(0,0,0,.25); transition:transform .15s;
  }
  #${NS}-fab:hover{ transform:scale(1.06); }
  #${NS}-fab.active{ background:#254f3b; }
  #${NS}-panel{
    position:fixed; right:20px; bottom:88px; z-index:2147483000;
    width:250px; max-height:65vh; overflow:auto;
    background:#fff; border:1px solid #e3e3e3; border-radius:12px;
    box-shadow:0 8px 30px rgba(0,0,0,.18);
    display:none; flex-direction:column;
    font-family:system-ui,Segoe UI,Arial,sans-serif;
  }
  #${NS}-panel.open{ display:flex; }
  #${NS}-header{
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 14px; font-weight:600; font-size:14px; color:#333;
    border-bottom:1px solid #eee; position:sticky; top:0; background:#fff;
  }
  #${NS}-close{ cursor:pointer; color:#999; font-size:13px; }
  #${NS}-close:hover{ color:#333; }
  #${NS}-body{ display:flex; flex-direction:column; gap:8px; padding:12px; }

  /* Ép nút đã gom về vị trí tĩnh để nằm gọn trong box (đè cả style inline nhờ !important) */
  #${NS}-body [data-${NS}-item]{
    position:static !important; inset:auto !important;
    left:auto !important; right:auto !important; top:auto !important; bottom:auto !important;
    transform:none !important; float:none !important; margin:0 !important;
    width:100% !important; display:block !important; box-sizing:border-box !important;
  }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- Gom nút theo id ----------
  function collect() {
    IDS.forEach((id) => {
      const cur = document.getElementById(id);
      if (!cur) return;
      if (boxBody.contains(cur)) { state[id] = cur; return; } // đã ở trong box
      // nếu extension chèn lại nút mới (khác node cũ) thì bỏ node cũ đi
      if (state[id] && state[id] !== cur && state[id].isConnected) state[id].remove();
      cur.setAttribute('data-' + NS + '-item', id);
      boxBody.appendChild(cur); // DI CHUYỂN node -> giữ nguyên toàn bộ chức năng của extension
      state[id] = cur;
    });
  }

  collect();

  // Extension có thể tạo lại nút sau khi trang load -> theo dõi để gom tiếp
  let timer;
  const obs = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(collect, 400);
  });
  obs.observe(document.body, { childList: true, subtree: true });
})();
