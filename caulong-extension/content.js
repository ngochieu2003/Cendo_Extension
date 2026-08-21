/* =========================================================================
   Móc Khoá Cầu Lông 3D – Tạo Mockup & Design (cendo.work)
   - 1 đơn có thể có NHIỀU item: mỗi item 1 màu + 1 tên.
   - Tên khách: External note, dòng thứ n -> item thứ n (theo thứ tự hiển thị).
   - Màu (mẫu mockup): mục "Màu" trong variant của từng item
     (Đen · Đỏ · Vàng · Xanh Bạc Hà · Xanh Lá · Hồng · Cam · Xanh Dương · Tím).
   - Mockup: ảnh mẫu theo màu + tên khách IN HOA, font Lemonada Bold,
     kiểu sticker: chữ TRẮNG trên blob ĐỎ ôm theo chữ + vòng tròn đỏ bên trái,
     vẽ ở vị trí đo sẵn cho từng mẫu.
   - Design 1254×1254: nền trắng, chữ đen Arial Bold, canh giữa (giống TKB).
   ========================================================================= */
(() => {
  "use strict";
  if (window.__CAULONG_LOADED__) return;
  window.__CAULONG_LOADED__ = true;

  const EXT = (p) => chrome.runtime.getURL(p);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ======================= Thông số 9 mẫu màu =======================
     Template = ảnh "chưa điền tên" 1500×1500 (assets/*.jpg). Toạ độ đo bằng
     cách khớp ảnh mẫu ĐÃ điền THUYTHU với bản chưa điền (match ≥0.99):
       size  = cỡ chữ Lemonada Bold mặc định (px)
       baseY = đường chân chữ (baseline)
       cx    = tâm ngang của chữ
       maxW  = bề ngang tối đa CẢ sticker (ring+blob); dài hơn tự thu nhỏ
     Toạ độ null = dùng mặc định theo tỷ lệ canvas.
     Muốn xê dịch chữ về sau, chỉ cần sửa mấy con số dưới đây.
     ================================================================== */
  /* Style sticker (đo từ ảnh mẫu, tỷ lệ theo cỡ chữ `size`):
     - chữ TRẮNG, nền blob ĐỎ ôm theo chữ (stroke đỏ dày, bo tròn),
     - vòng tròn đỏ trang trí nằm bên TRÁI chữ (luôn vẽ kèm),
     - rim = viền trắng ngoài cùng (ảnh mẫu = 0, chỉnh được). */
  const RED = "#d01a2c";        // màu blob (đo từ ảnh mẫu: rgb(208,26,44))
  const WHITE = "#ffffff";
  const STICKER = {
    strokeR: 0.27,  // độ dày blob đỏ toả ra ngoài chữ (× size)
    rimR: 0,        // viền trắng ngoài cùng (× size); 0 = không vẽ
    trackEm: 0.025, // letter-spacing (× size, khớp ảnh mẫu)
    ring: { gap: 0.62, dy: 0.345, midR: 0.36, width: 0.29, on: true },
    // ring: tâm cách mép trái chữ `gap`×size, cao hơn baseline `dy`×size,
    //       bán kính giữa `midR`×size, dày nét `width`×size
  };
  const TPL = {
    black:  { key: "black",  label: "Đen",          img: "assets/black.jpg",  cx: 1012, baseY: 202, size: 119, maxW: 896 },
    red:    { key: "red",    label: "Đỏ",           img: "assets/red.jpg",    cx: 1016, baseY: 207, size: 121, maxW: 887 },
    yellow: { key: "yellow", label: "Vàng",         img: "assets/yellow.jpg", cx: 1033, baseY: 194, size: 119, maxW: 853 },
    mint:   { key: "mint",   label: "Xanh Bạc Hà",  img: "assets/mint.jpg",   cx: 1034, baseY: 179, size: 121, maxW: 852 },
    green:  { key: "green",  label: "Xanh Lá",      img: "assets/green.jpg",  cx: 1014, baseY: 163, size: 122, maxW: 891 },
    pink:   { key: "pink",   label: "Hồng",         img: "assets/pink.jpg",   cx: 1020, baseY: 232, size: 121, maxW: 880 },
    orange: { key: "orange", label: "Cam",          img: "assets/orange.jpg", cx: 1018, baseY: 263, size: 122, maxW: 884 },
    blue:   { key: "blue",   label: "Xanh Dương",   img: "assets/blue.jpg",   cx: 1031, baseY: 246, size: 121, maxW: 857 },
    purple: { key: "purple", label: "Tím",          img: "assets/purple.jpg", cx: 1020, baseY: 202, size: 118, maxW: 879 },
  };
  const TPL_ORDER = ["black", "red", "yellow", "mint", "green", "pink", "orange", "blue", "purple"];
  // Mặc định theo tỷ lệ canvas khi chưa đo toạ độ (w,h = kích thước template)
  function tplCoords(t, w, h) {
    return {
      size: t.size != null ? t.size : Math.round(h * 0.081),
      baseY: t.baseY != null ? t.baseY : Math.round(h * 0.131),
      cx: t.cx != null ? t.cx : Math.round(w * 0.55),
      maxW: t.maxW != null ? t.maxW : Math.round(w * 0.72),
    };
  }

  /* --------------------------- File Design --------------------------- */
  const DESIGN = {
    w: 1254, h: 1254, bg: "#ffffff", ink: "#000000",
    size: 102, baseY: 646, cx: 627, maxW: 1130,
    font: 'Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif',
    weight: "bold",
  };

  /* ------------------------------ Font ------------------------------ */
  const FONT_LEMONADA = "CAULONG-Lemonada";
  let fontsReady = null;
  function loadFonts() {
    if (fontsReady) return fontsReady;
    const f = new FontFace(FONT_LEMONADA, `url(${EXT("assets/Lemonada-Bold.ttf")})`, { weight: "700" });
    fontsReady = f.load().then((ff) => { document.fonts.add(ff); }).catch(() => {});
    return fontsReady;
  }

  /* ---------------------------- Tải ảnh ---------------------------- */
  async function loadBitmap(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await createImageBitmap(await res.blob());
  }
  const extImgCache = {};
  function loadExtBitmap(path) {
    if (!extImgCache[path]) extImgCache[path] = loadBitmap(EXT(path));
    return extImgCache[path];
  }

  /* --------------------------- Vẽ chữ --------------------------- */
  function textWidth(ctx, text, fontCss, stroke) {
    ctx.font = fontCss;
    const m = ctx.measureText(text);
    const w = (m.actualBoundingBoxLeft != null && m.actualBoundingBoxRight != null)
      ? Math.max(m.width, m.actualBoundingBoxLeft + m.actualBoundingBoxRight) : m.width;
    return w + stroke * 2;
  }
  function fitSize(ctx, text, family, size, stroke, maxW, weight) {
    const css = (s) => `${weight ? weight + " " : ""}${s}px ${family}`;
    let s = size;
    const w = textWidth(ctx, text, css(s), stroke);
    if (w > maxW) s = Math.max(10, Math.floor(s * maxW / w));
    return s;
  }
  function drawOutlined(ctx, text, x, y, family, size, stroke, fill, ink, shadow, blur, weight) {
    ctx.save();
    ctx.font = `${weight ? weight + " " : ""}${size}px ${family}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (stroke > 0) {
      if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = blur || 6; ctx.shadowOffsetY = Math.max(1, Math.round(stroke / 3)); }
      ctx.strokeStyle = ink;
      ctx.lineWidth = stroke * 2; // canvas kẻ viền giữa nét -> nhân đôi để viền toả ra ngoài
      ctx.strokeText(text, x, y);
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    }
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /* --------------------------- Render --------------------------- */
  // Tên trên mockup: luôn IN HOA (giữ nguyên dấu tiếng Việt)
  const mockName = (name) => String(name || "").trim().toUpperCase();
  // Đo bề ngang mực chữ (ink) tại cỡ size, đã tính letter-spacing
  function inkMetrics(ctx, text, size) {
    ctx.font = `700 ${size}px "${FONT_LEMONADA}"`;
    ctx.letterSpacing = `${Math.round(size * STICKER.trackEm)}px`;
    const m = ctx.measureText(text);
    const w = (m.actualBoundingBoxLeft != null && m.actualBoundingBoxRight != null)
      ? Math.max(m.width, m.actualBoundingBoxLeft + m.actualBoundingBoxRight) : m.width;
    return { w, left: m.actualBoundingBoxLeft != null ? m.actualBoundingBoxLeft : w / 2 };
  }
  // Vẽ sticker: (rim trắng nếu có) -> blob đỏ + vòng tròn đỏ -> chữ trắng
  function drawSticker(ctx, text, cx, baseY, size) {
    const S = STICKER, st = size * S.strokeR, rim = size * S.rimR;
    ctx.save();
    ctx.font = `700 ${size}px "${FONT_LEMONADA}"`;
    ctx.letterSpacing = `${Math.round(size * S.trackEm)}px`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const ink = inkMetrics(ctx, text, size);
    const ringC = S.ring.on ? {
      x: cx - ink.left - S.ring.gap * size,
      y: baseY - S.ring.dy * size,
      r: S.ring.midR * size, w: S.ring.width * size,
    } : null;
    const ring = (extra) => {
      if (!ringC) return;
      ctx.beginPath();
      ctx.arc(ringC.x, ringC.y, ringC.r, 0, Math.PI * 2);
      ctx.lineWidth = ringC.w + (extra || 0) * 2;
      ctx.stroke();
    };
    if (rim > 0) { // viền trắng ngoài cùng
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = (st + rim) * 2;
      ctx.strokeText(text, cx, baseY);
      ring(rim);
    }
    ctx.strokeStyle = RED;           // blob đỏ ôm chữ
    ctx.lineWidth = st * 2;
    ctx.strokeText(text, cx, baseY);
    ring(0);                         // vòng tròn đỏ
    ctx.fillStyle = WHITE;           // chữ trắng
    ctx.fillText(text, cx, baseY);
    ctx.restore();
  }
  async function renderMockup(canvas, tplKey, name, off, sizeScale) {
    const t = TPL[tplKey] || TPL.black;
    const bg = await loadExtBitmap(t.img);
    canvas.width = bg.width; canvas.height = bg.height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0);
    const txt = mockName(name);
    if (!txt) return canvas;
    const C = tplCoords(t, bg.width, bg.height);
    const base = Math.max(10, Math.round(C.size * (sizeScale || 1)));
    // Thu nhỏ khi dài: tổng bề ngang = ring (trái) + blob (2 bên) + ink
    let size = base;
    const extraPerSize = STICKER.strokeR * 2 + (STICKER.ring.on ? (STICKER.ring.gap + STICKER.ring.midR + STICKER.ring.width / 2) : 0);
    const w0 = inkMetrics(ctx, txt, size).w + extraPerSize * size;
    if (w0 > C.maxW) size = Math.max(10, Math.floor(size * C.maxW / w0));
    const dx = (off && off.dx) || 0, dy = (off && off.dy) || 0;
    drawSticker(ctx, txt, C.cx + dx, C.baseY + dy, size);
    return canvas;
  }
  async function renderDesign(canvas, name) {
    canvas.width = DESIGN.w; canvas.height = DESIGN.h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = DESIGN.bg; ctx.fillRect(0, 0, DESIGN.w, DESIGN.h);
    const txt = String(name || "").trim();
    if (!txt) return canvas;
    const size = fitSize(ctx, txt, DESIGN.font, DESIGN.size, 0, DESIGN.maxW, DESIGN.weight);
    drawOutlined(ctx, txt, DESIGN.cx, DESIGN.baseY, DESIGN.font, size, 0, DESIGN.ink, DESIGN.ink, null, 0, DESIGN.weight);
    return canvas;
  }
  function canvasToFile(canvas, fname) {
    return new Promise((r) => canvas.toBlob((b) => r(new File([b], fname, { type: "image/png" })), "image/png"));
  }

  /* --------------------- Nhận diện đơn (DOM) --------------------- */
  const noAccent = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  // Variant: "Màu: Màu Xanh Bạc Hà, Phân loại: In tên"
  function colorFromText(s) {
    const t = noAccent(s);
    if (/bac\s*ha/.test(t)) return "mint";
    if (/xanh\s*la/.test(t)) return "green";
    if (/xanh\s*(duong|bien|nuoc)/.test(t)) return "blue";
    if (/\bden\b/.test(t)) return "black";
    if (/\bdo\b/.test(t)) return "red";
    if (/\bvang\b/.test(t)) return "yellow";
    if (/\bhong\b/.test(t)) return "pink";
    if (/\bcam\b/.test(t)) return "orange";
    if (/\btim\b/.test(t)) return "purple";
    return null;
  }
  // Fulfillment SKU: P-3D-K07-Black-N · P-3D-K07-Red-N · … (Black|Red|Yellow|Mint|Green|Pink|Orange|Blue|Purple)
  function colorFromSku(s) {
    const t = noAccent(s);
    const m = t.match(/k07[-_]?(black|red|yellow|mint|green|pink|orange|blue|purple)/);
    return m ? m[1] : null;
  }
  const isCauLongText = (s) => /cau\s*long/.test(noAccent(s)) || /\bk07\b/.test(noAccent(s));

  // Quét các item Cầu lông trên trang đơn (theo đúng thứ tự hiển thị).
  // rowIndex = vị trí trong danh sách TẤT CẢ media_row của trang (injected.js dùng để tìm đúng 2 nút Upload).
  function scanItems() {
    const rows = [...document.querySelectorAll('[class*="media_row"]')];
    const out = [];
    rows.forEach((row, i) => {
      const box = row.closest('[class*="item_container"]') || row.parentElement;
      if (!box) return;
      const raw = (box.innerText || "").replace(/\n/g, " | ");
      if (!isCauLongText(raw)) return;
      const sku = (raw.match(/SKU ID:\s*([\w.-]+)/i) || [])[1] || "";
      const mauTxt = ((raw.match(/M[àa]u\s*:\s*([^,|]+)/i) || [])[1] || "").trim();
      const fsku = (raw.match(/[A-Z0-9]*-?K07[A-Za-z0-9-]*/i) || [])[0] || "";
      const c = colorFromText(mauTxt) || colorFromSku(fsku) || colorFromText(raw);
      out.push({ rowIndex: i, sku, mauTxt, color: c || "black", detected: !!c, name: "", sizePct: 100, dx: 0, dy: 0 });
    });
    return out;
  }

  function orderId() {
    const m = location.pathname.match(/orders?\/([\w-]+)/i);
    return m ? m[1].slice(0, 12) : "order";
  }
  const cleanName = (s) => String(s || "").trim().replace(/^(t[eê]n\s*(kh[aá]ch)?|name)\s*[:\-–]\s*/i, "").trim();
  // Danh sách tên trong External note: mỗi dòng có nội dung là 1 tên
  function noteNames(note) {
    return String(note || "").replace(/\r/g, "").split("\n").map(cleanName).filter(Boolean);
  }
  function getExternalNote() {
    const val = document.querySelector('[class*="external_note"]');
    if (val && val.innerText && val.innerText.trim()) return val.innerText;
    const cont = document.querySelector('[class*="external_container"]');
    if (cont) { const t = (cont.innerText || "").replace(/external note/i, ""); if (t.trim()) return t; }
    return "";
  }

  /* ============================== UI ============================== */
  const state = { items: [], active: 0, orderKey: null, names: [] };
  const OFF_MAX = 400;
  let els = null;
  const cur = () => state.items[state.active] || null;

  function buildModal() {
    const overlay = document.createElement("div");
    overlay.id = "caulong-overlay";
    overlay.innerHTML = `
      <div id="caulong-modal">
        <div class="caulong-head"><h2>🏸 Tạo Mockup &amp; Design – Móc Khoá Cầu Lông 3D</h2><button class="caulong-close" title="Đóng">×</button></div>
        <div class="caulong-body">
          <div class="caulong-left">
            <div id="caulong-warn" class="caulong-warn" style="display:none"></div>
            <div class="caulong-field"><label>Các item trong đơn (tên lấy theo thứ tự dòng của External note)</label>
              <div id="caulong-items" class="caulong-items"></div>
            </div>
            <div class="caulong-field"><label>Chỉnh chữ cho item đang chọn</label>
              <div class="caulong-rf-row"><span>Cỡ %</span><input type="number" id="caulong-size" class="caulong-num caulong-num-sm" min="40" max="200" step="5" value="100">
                <span>X</span><input type="number" id="caulong-tx" class="caulong-num caulong-num-sm" step="1" value="0">
                <span>Y</span><input type="number" id="caulong-ty" class="caulong-num caulong-num-sm" step="1" value="0">
                <button type="button" id="caulong-treset">Đặt lại</button></div>
              <div class="caulong-hint">Kéo thẳng trên ảnh preview để dời chữ · lăn chuột để đổi cỡ. Tên trên mockup luôn IN HOA, tên quá dài tự thu nhỏ.</div>
            </div>
          </div>
          <div class="caulong-right"><div class="caulong-previews">
            <div class="caulong-pv"><div class="caulong-pv-title" id="caulong-pv-label">Mockup</div>
              <canvas id="caulong-pv-mock" class="caulong-draggable"></canvas></div>
            <div class="caulong-pv"><div class="caulong-pv-title">Design (1254×1254) · nền trắng, chữ đen Arial Bold</div>
              <canvas id="caulong-pv-design"></canvas></div>
          </div></div>
          <div id="caulong-status" class="info"></div>
          <div class="caulong-actions">
            <button class="caulong-btn-dl" id="caulong-dl">⬇ Tải PNG (tất cả)</button>
            <button class="caulong-btn-fill" id="caulong-fill">✅ Điền vào Mockup &amp; Design</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const $ = (s) => overlay.querySelector(s);
    els = {
      overlay, warn: $("#caulong-warn"), list: $("#caulong-items"), size: $("#caulong-size"),
      tx: $("#caulong-tx"), ty: $("#caulong-ty"), tReset: $("#caulong-treset"), pvLabel: $("#caulong-pv-label"),
      pvMock: $("#caulong-pv-mock"), pvDesign: $("#caulong-pv-design"), status: $("#caulong-status"),
      btnDl: $("#caulong-dl"), btnFill: $("#caulong-fill"),
    };
    els.size.addEventListener("input", () => { const it = cur(); if (!it) return; it.sizePct = clamp(parseFloat(els.size.value) || 100, 40, 200); schedule(); });
    const onOff = () => {
      const it = cur(); if (!it) return;
      it.dx = clamp(parseFloat(els.tx.value) || 0, -OFF_MAX, OFF_MAX);
      it.dy = clamp(parseFloat(els.ty.value) || 0, -OFF_MAX, OFF_MAX);
      schedule();
    };
    els.tx.addEventListener("input", onOff); els.ty.addEventListener("input", onOff);
    els.tReset.onclick = () => { const it = cur(); if (!it) return; it.dx = 0; it.dy = 0; syncTools(); schedule(); };
    $(".caulong-close").onclick = closeModal;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    els.btnDl.onclick = doDownload; els.btnFill.onclick = doFill;

    let drag = null;
    els.pvMock.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; els.pvMock.setPointerCapture(e.pointerId); els.pvMock.classList.add("caulong-grabbing"); });
    els.pvMock.addEventListener("pointermove", (e) => {
      if (!drag) return; const it = cur(); if (!it) return;
      const r = els.pvMock.getBoundingClientRect();
      it.dx = clamp(it.dx + (e.clientX - drag.x) / r.width * els.pvMock.width, -OFF_MAX, OFF_MAX);
      it.dy = clamp(it.dy + (e.clientY - drag.y) / r.height * els.pvMock.height, -OFF_MAX, OFF_MAX);
      drag.x = e.clientX; drag.y = e.clientY; syncTools(); schedule();
    });
    const end = () => { if (drag) { drag = null; els.pvMock.classList.remove("caulong-grabbing"); } };
    els.pvMock.addEventListener("pointerup", end); els.pvMock.addEventListener("pointercancel", end);
    els.pvMock.addEventListener("wheel", (e) => {
      e.preventDefault(); const it = cur(); if (!it) return;
      it.sizePct = clamp(it.sizePct + (e.deltaY < 0 ? 5 : -5), 40, 200);
      els.size.value = String(it.sizePct); schedule();
    }, { passive: false });
    return overlay;
  }

  function renderItemList() {
    els.list.innerHTML = "";
    state.items.forEach((it, i) => {
      const card = document.createElement("div");
      card.className = "caulong-item" + (i === state.active ? " sel" : "") + (it.name ? "" : " empty");
      card.innerHTML = `
        <div class="caulong-item-head">
          <b>Item ${i + 1}</b>
          <span class="caulong-item-tk ${it.detected ? "ok" : "err"}">${it.detected ? "Màu: " + TPL[it.color].label : "không đọc được Màu"}</span>
          <span class="caulong-item-sku">${it.sku || ""}</span>
        </div>
        <div class="caulong-item-row">
          <input class="caulong-item-name" type="text" placeholder="Tên khách…" value="">
          <select class="caulong-item-color">${TPL_ORDER.map((k) => `<option value="${k}">${TPL[k].label}</option>`).join("")}</select>
        </div>`;
      const input = card.querySelector(".caulong-item-name");
      input.value = it.name || "";
      input.addEventListener("input", () => { it.name = input.value; card.classList.toggle("empty", !it.name); refreshWarn(); if (i === state.active) schedule(); });
      input.addEventListener("focus", () => select(i));
      const sel = card.querySelector(".caulong-item-color");
      sel.value = it.color;
      sel.addEventListener("change", (e) => { e.stopPropagation(); it.color = sel.value; it.detected = true; renderItemList(); select(i); schedule(); });
      sel.addEventListener("focus", () => select(i));
      card.addEventListener("click", () => select(i));
      els.list.appendChild(card);
    });
    if (!state.items.length) els.list.innerHTML = '<div class="caulong-hint">Không thấy item Móc Khoá Cầu Lông nào trên trang này.</div>';
  }
  function select(i) {
    if (i === state.active) { syncTools(); return; }
    state.active = i;
    els.list.querySelectorAll(".caulong-item").forEach((c, k) => c.classList.toggle("sel", k === i));
    syncTools(); schedule();
  }
  function syncTools() {
    const it = cur(); if (!it || !els) return;
    els.size.value = String(it.sizePct);
    els.tx.value = String(Math.round(it.dx)); els.ty.value = String(Math.round(it.dy));
    els.pvLabel.textContent = `Mockup – Item ${state.active + 1} · Màu ${TPL[it.color].label}`;
  }
  function refreshWarn() {
    if (!els) return;
    const n = state.items.length, m = state.names.length;
    const missing = state.items.filter((i) => !String(i.name || "").trim()).length;
    const msgs = [];
    if (n && m && m !== n) msgs.push(`⚠️ External note có ${m} dòng tên nhưng đơn có ${n} item Cầu lông — kiểm tra lại rồi điền tay cho khớp.`);
    if (missing) msgs.push(`⚠️ Còn ${missing} item chưa có tên.`);
    const bad = state.items.filter((i) => !i.detected).length;
    if (bad) msgs.push(`⚠️ ${bad} item không đọc được mục “Màu” — chọn màu bên dưới.`);
    els.warn.innerHTML = msgs.join("<br>");
    els.warn.style.display = msgs.length ? "block" : "none";
  }
  function setStatus(msg, cls) { if (els) { els.status.textContent = msg || ""; els.status.className = cls || "info"; } }
  function toast(msg, cls) {
    let t = document.getElementById("caulong-toast");
    if (!t) { t = document.createElement("div"); t.id = "caulong-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.className = cls || "info"; t.style.opacity = "1";
    clearTimeout(t._timer); t._timer = setTimeout(() => { t.style.opacity = "0"; }, 5000);
  }

  let raf = 0;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(async () => {
      raf = 0;
      const it = cur(); if (!it) return;
      try {
        await fontsReady;
        await renderMockup(els.pvMock, it.color, it.name, { dx: it.dx, dy: it.dy }, it.sizePct / 100);
        await renderDesign(els.pvDesign, it.name);
      } catch (e) { setStatus("Lỗi render: " + e.message, "err"); }
    });
  }

  function syncOrder(force) {
    const key = orderId();
    if (!force && state.orderKey === key && state.items.length) return;
    state.orderKey = key;
    const items = scanItems();
    const names = noteNames(getExternalNote());
    items.forEach((it, i) => { it.name = names[i] || ""; });
    state.items = items; state.names = names; state.active = 0;
  }

  async function openModal() {
    await loadFonts();
    syncOrder(false);
    if (!els) buildModal(); else els.overlay.style.display = "flex";
    renderItemList(); syncTools(); refreshWarn(); setStatus("", "info");
    schedule();
  }
  function closeModal() { if (els) els.overlay.style.display = "none"; }

  const slug = (s) => noAccent(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "khach";
  async function buildFiles(it, i) {
    const tag = `${orderId()}-${i + 1}-${slug(it.name)}`;
    const mock = await canvasToFile(await renderMockup(document.createElement("canvas"), it.color, it.name, { dx: it.dx, dy: it.dy }, it.sizePct / 100), `mockup-caulong-${tag}.png`);
    const des = await canvasToFile(await renderDesign(document.createElement("canvas"), it.name), `design-caulong-${tag}.png`);
    return { mock, des };
  }

  async function doDownload() {
    try {
      setStatus("Đang tạo file…", "info"); await fontsReady;
      for (let i = 0; i < state.items.length; i++) {
        const it = state.items[i];
        if (!String(it.name || "").trim()) continue;
        const { mock, des } = await buildFiles(it, i);
        [mock, des].forEach((f) => {
          const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name;
          document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        });
      }
      setStatus("Đã tải Mockup + Design cho các item có tên.", "ok");
    } catch (e) { setStatus("Lỗi tải: " + e.message, "err"); }
  }

  function waitFillResult(timeout) {
    return new Promise((resolve) => {
      let tm = setTimeout(done, timeout || 15000);
      function done(data) { window.removeEventListener("message", on); clearTimeout(tm); resolve(data || null); }
      const on = (ev) => {
        if (ev.source !== window || !ev.data) return;
        if (ev.data.__caulong === "progress") { // còn chạy -> gia hạn chờ
          const st = ev.data.step ? ` – ${ev.data.step}` : "";
          toast(`⏳ Đang điền ${Math.min(ev.data.done + 1, ev.data.total)}/${ev.data.total} · ${ev.data.label || ""}${st}…`, "info");
          clearTimeout(tm); tm = setTimeout(done, timeout || 15000);
          return;
        }
        if (ev.data.__caulong === "result") done(ev.data);
      };
      window.addEventListener("message", on);
    });
  }
  const blobToDataURL = (blob) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });

  async function doFill() {
    try {
      const ready = state.items.filter((it) => String(it.name || "").trim());
      if (!ready.length) { setStatus("Chưa item nào có tên.", "err"); return; }
      const missing = state.items.length - ready.length;
      if (missing && !confirm(`Còn ${missing} item chưa có tên sẽ bị bỏ qua. Vẫn điền ${ready.length} item?`)) return;
      setStatus("Đang tạo ảnh…", "info"); await fontsReady;
      const payload = [];
      for (let i = 0; i < state.items.length; i++) {
        const it = state.items[i];
        if (!String(it.name || "").trim()) continue;
        const { mock, des } = await buildFiles(it, i);
        payload.push({
          rowIndex: it.rowIndex, sku: it.sku, label: `Item ${i + 1}`,
          mockUrl: await blobToDataURL(mock), mockName: mock.name,
          designUrl: await blobToDataURL(des), designName: des.name,
        });
      }
      closeModal();
      toast(`⏳ Đang điền ${payload.length} item, chờ chút đừng bấm gì thêm…`, "info");
      const resP = waitFillResult(120000); // 120s KHÔNG có tín hiệu mới coi là treo (mỗi ô xong lại reset)
      window.postMessage({ __caulong: "fill", items: payload }, "*");
      const res = await resP;
      if (!res) { toast("Không nhận được phản hồi khi điền. Thử lại hoặc dùng Tải PNG.", "err"); return; }
      const ok = (res.results || []).filter((r) => r.okM && r.okD).length;
      const bad = (res.results || []).filter((r) => !(r.okM && r.okD));
      if (ok === payload.length) toast(`✅ Đã điền ${ok}/${payload.length} item (Mockup + Design). Kiểm tra rồi lưu đơn.`, "ok");
      else toast(`Điền được ${ok}/${payload.length} item. Lỗi: ${bad.map((b) => b.label + (b.why ? " (" + b.why + ")" : "")).join(" | ")}. Có thể dùng Tải PNG.`, "err");
    } catch (e) { toast("Lỗi điền: " + e.message, "err"); }
  }

  /* ------------------------- Nút mở popup ------------------------- */
  function ensureButton() {
    const onOrder = /\/orders?\//i.test(location.pathname);
    let btn = document.getElementById("caulong-open-btn");
    if (!onOrder) { if (btn) btn.remove(); return; }
    if (btn) return;
    btn = document.createElement("button"); btn.id = "caulong-open-btn"; btn.type = "button";
    btn.innerHTML = "🏸 Tạo Mockup Cầu Lông";
    btn.title = "Lấy tên ở External note + mẫu theo Màu của từng item";
    btn.onclick = openModal; document.body.appendChild(btn);
  }
  new MutationObserver(() => ensureButton()).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(ensureButton, 1500); ensureButton(); loadFonts();

  /* ---------------- API cho luồng tự động (auto.js) ---------------- */
  window.__CAULONG_API__ = {
    loadFonts, renderMockup, renderDesign, canvasToFile, loadBitmap,
    noteNames, cleanName, colorFromText, colorFromSku, isCauLongText, noAccent,
    TPL, TPL_ORDER, DESIGN,
  };
})();
