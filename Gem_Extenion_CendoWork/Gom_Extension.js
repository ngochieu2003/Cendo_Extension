// ==UserScript==
// @name         Extension Hub - Gom nút nổi vào 1 box (Cendo)
// @namespace    https://local.hub
// @version      3.3
// @description  Gom các nút nổi của extension ở góc dưới phải/trái Cendo vào 1 box thu gọn, chia nhóm theo từng extension.
// @match        *://cendo.work/*
// @match        *://*.cendo.work/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* ============ CẤU HÌNH ============ */
  // Mỗi nhóm = 1 extension. Muốn thêm extension mới thì thêm 1 dòng vào đây.
  // Nhóm nào không tìm thấy nút nào trên trang sẽ tự động ẩn tiêu đề đi.
  const GROUPS = [
    {
      title: 'Raccoonie',
      ids: [
        'rcn-btn',          // ⚡ Tạo mockup Raccoonie
        'rcn-sched-btn',    // ⏰ Auto: BẬT 08:30
        'rcn-batch-btn',    // 💫 Làm cả đơn
      ],
    },
    {
      title: 'Hộp Nhạc',
      ids: [
        'hn-open-btn',      // 🎵 Tạo Mockup Hộp Nhạc
        'hn-auto-fab',      // 🎵 Auto Hộp Nhạc: TẮT
      ],
    },
    // Nhóm móc khoá 3D — xếp theo đúng thứ tự nút nổi trên màn hình (từ trên xuống)
    {
      title: 'Pickleball',
      ids: [
        'pickle-open-btn',  // 🥒 Tạo Mockup Pickleball
        'pickle-auto-fab',  // 🥒 Auto Pickleball: TẮT
      ],
    },
    {
      title: 'Tennis',
      ids: [
        'tennis-open-btn',  // 🎾 Tạo Mockup Tennis
        'tennis-auto-fab',  // 🎾 Auto Tennis: TẮT
      ],
    },
    {
      title: 'Chú Cừu 3D',
      ids: [
        'cuu-open-btn',     // 🐑 Tạo Mockup Móc Khoá Clicky Chú Cừu
        'cuu-auto-fab',     // 🐑 Auto Cừu: TẮT
      ],
    },
    {
      title: 'Cầu Lông',
      ids: [
        'caulong-open-btn', // 🏸 Tạo Mockup Cầu Lông
        'caulong-auto-fab', // 🏸 Auto Cầu Lông: TẮT
      ],
    },
    {
      title: 'Instax',
      ids: [
        'instax-open-btn',  // 📷 Tạo Mockup Instax
        'instax-auto-fab',  // 📷 Auto Instax: TẮT
      ],
    },
    {
      title: 'Thời Khoá Biểu',
      ids: [
        'tkb-open-btn',     // 📅 Tạo Mockup Thời Khoá Biểu
        'tkb-auto-fab',     // 📅 Auto TKB: TẮT
      ],
    },
    {
      title: 'Flip Photo Book',
      ids: [
        'cendo-order-btn',  // ⚡ Xử lý đơn Flip Photo Book
        'cendo-bot-widget', // 🤖 Tự động làm đơn Hộp quay ảnh kỉ niệm (container: panel + nút pill)
      ],
    },
  ];

  // Các node là "container" chứa nhiều thứ bên trong (không phải 1 nút đơn lẻ)
  // -> giữ nguyên display gốc của nó, không ép về block.
  const KEEP_DISPLAY = ['cendo-bot-widget'];

  const START_OPEN  = false;  // true = mở sẵn box khi tải trang
  const FAB_LABEL   = '☰';    // biểu tượng nút bật/tắt
  const SHOW_BADGE  = true;   // hiện số nút đã gom được trên nút tròn
  const WARN_MISSING = true;  // in ra Console id của nút nổi chưa được gom (để thêm extension mới)
  /* ================================== */

  const NS = 'exthub';
  const state = {};    // id -> node đang nằm trong box
  const slots = {};    // id -> phần tử chứa của nhóm

  // ---------- Tạo box + nút bật/tắt ----------
  const fab = document.createElement('button');
  fab.id = NS + '-fab';
  fab.type = 'button';
  fab.title = 'Mở/đóng hộp tiện ích';
  fab.textContent = FAB_LABEL;

  const badge = document.createElement('span');
  badge.id = NS + '-badge';
  if (SHOW_BADGE) fab.appendChild(badge);

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

  // Dựng sẵn khung từng nhóm theo đúng thứ tự trong GROUPS
  GROUPS.forEach((g, gi) => {
    const sec = document.createElement('div');
    sec.className = NS + '-group';
    sec.dataset.group = String(gi);
    sec.style.display = 'none'; // ẩn cho tới khi gom được ít nhất 1 nút

    const label = document.createElement('div');
    label.className = NS + '-group-title';
    label.textContent = g.title;

    const items = document.createElement('div');
    items.className = NS + '-group-items';

    sec.appendChild(label);
    sec.appendChild(items);
    boxBody.appendChild(sec);

    g.ids.forEach((id) => { slots[id] = items; });
  });

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
  const itemSel = `#${NS}-body [data-${NS}-item]`;
  const displaySel = KEEP_DISPLAY.length
    ? `${itemSel}:not(${KEEP_DISPLAY.map((id) => `[data-${NS}-item="${id}"]`).join(',')})`
    : itemSel;

  const css = `
  #${NS}-fab{
    position:fixed; right:20px; bottom:24px; z-index:2147483000;
    width:52px; height:52px; border-radius:50%; border:none; cursor:pointer;
    background:#2f6b4f; color:#fff; font-size:22px; line-height:52px;
    box-shadow:0 4px 14px rgba(0,0,0,.25); transition:transform .15s;
  }
  #${NS}-fab:hover{ transform:scale(1.06); }
  #${NS}-fab.active{ background:#254f3b; }
  #${NS}-badge{
    position:absolute; top:-4px; right:-4px; min-width:20px; height:20px;
    padding:0 5px; border-radius:10px; background:#e05b3a; color:#fff;
    font-size:11px; line-height:20px; font-weight:700; box-sizing:border-box;
    font-family:system-ui,Segoe UI,Arial,sans-serif; display:none;
  }
  #${NS}-panel{
    position:fixed; right:20px; bottom:88px; z-index:2147483647;
    width:320px; max-height:70vh; overflow-y:auto; overflow-x:hidden;
    background:#fff; border:1px solid #e3e3e3; border-radius:12px;
    box-shadow:0 8px 30px rgba(0,0,0,.18);
    display:none; flex-direction:column;
    font-family:system-ui,Segoe UI,Arial,sans-serif;
  }
  #${NS}-panel.open{ display:flex; }
  #${NS}-header{
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 14px; font-weight:600; font-size:14px; color:#333;
    border-bottom:1px solid #eee; position:sticky; top:0; background:#fff; z-index:1;
  }
  #${NS}-close{ cursor:pointer; color:#999; font-size:13px; }
  #${NS}-close:hover{ color:#333; }
  #${NS}-body{ display:flex; flex-direction:column; padding:10px 12px 12px; }

  .${NS}-group{ padding-top:10px; }
  .${NS}-group + .${NS}-group{ border-top:1px solid #f0f0f0; margin-top:10px; }
  .${NS}-group-title{
    font-size:11px; font-weight:700; letter-spacing:.5px; text-transform:uppercase;
    color:#9a9a9a; margin-bottom:7px;
  }
  .${NS}-group-items{ display:flex; flex-direction:column; gap:8px; }

  /* Ép node đã gom về vị trí tĩnh để nằm gọn trong box (đè cả style inline nhờ !important) */
  ${itemSel}{
    position:static !important; inset:auto !important;
    left:auto !important; right:auto !important; top:auto !important; bottom:auto !important;
    transform:none !important; float:none !important; margin:0 !important;
    width:100% !important; box-sizing:border-box !important;
  }
  ${displaySel}{ display:block !important; }

  /* Panel cấu hình nằm bên trong node đã gom: co lại cho vừa box thay vì width cứng */
  ${itemSel} [id$="-panel"]{
    width:auto !important; max-width:100% !important; box-sizing:border-box !important;
  }
  /* Nút bên trong container đã gom: kéo full chiều ngang cho đều */
  ${itemSel} > button{ width:100% !important; box-sizing:border-box !important; }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- Gom nút theo id ----------
  function collect() {
    let total = 0;

    Object.keys(slots).forEach((id) => {
      const slot = slots[id];
      const cur = document.getElementById(id);
      if (!cur) return;

      if (slot.contains(cur)) { state[id] = cur; total++; return; } // đã ở đúng chỗ

      // nếu extension chèn lại nút mới (khác node cũ) thì bỏ node cũ đi
      if (state[id] && state[id] !== cur && state[id].isConnected) state[id].remove();

      cur.setAttribute('data-' + NS + '-item', id);
      slot.appendChild(cur); // DI CHUYỂN node -> giữ nguyên toàn bộ chức năng của extension
      state[id] = cur;
      total++;
    });

    // Ẩn nhóm rỗng
    boxBody.querySelectorAll('.' + NS + '-group').forEach((sec) => {
      const items = sec.querySelector('.' + NS + '-group-items');
      sec.style.display = items.children.length ? 'block' : 'none';
    });

    if (SHOW_BADGE) {
      badge.textContent = String(total);
      badge.style.display = total ? 'block' : 'none';
    }

    if (WARN_MISSING) reportMissing();
  }

  // ---------- Báo nút nổi chưa gom ----------
  // Mỗi khi cài thêm extension mới, mở Console (F12) sẽ thấy ngay id cần thêm vào GROUPS.
  const warned = new Set();
  function reportMissing() {
    document.querySelectorAll('body > [id]').forEach((el) => {
      const id = el.id;
      if (!id || id.startsWith(NS) || slots[id] || warned.has(id)) return;
      const pos = getComputedStyle(el).position;
      if (pos !== 'fixed' && pos !== 'sticky') return;
      if (!el.offsetWidth && !el.offsetHeight) return; // đang ẩn (panel cấu hình) -> bỏ qua
      warned.add(id);
      console.info(
        '[Extension Hub] Nút nổi chưa gom: #' + id +
        ' — "' + (el.textContent || '').trim().slice(0, 45) + '"' +
        ' → thêm id này vào GROUPS trong Gom_Extension.js', el
      );
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
