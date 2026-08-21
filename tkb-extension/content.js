/* =========================================================================
   Thời Khoá Biểu 3D – Tạo Mockup & Design (cendo.work)
   - 1 đơn có thể có NHIỀU item: mỗi item 1 mẫu bảng + 1 tên.
   - Tên khách: External note, dòng thứ n -> item thứ n (theo thứ tự hiển thị).
   - Mẫu bảng: mục "Thiết kế" trong từng item
     (Cấp 1 Cơ Bản · Cấp 1 Thỏ Hồng · Cấp 1 Vũ Trụ).
   - Mockup 1254×1254: chữ Lobster có viền, đặt ở chân bảng.
   - Design 1254×1254: nền trắng, chữ đen Arial Bold, canh giữa.
   ========================================================================= */
(() => {
  "use strict";
  if (window.__TKB_LOADED__) return;
  window.__TKB_LOADED__ = true;

  const EXT = (p) => chrome.runtime.getURL(p);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ======================= Thông số 3 mẫu bảng =======================
     Toạ độ đo trực tiếp từ 3 ảnh mockup mẫu (canvas gốc 1254×1254):
       size    = cỡ chữ Lobster mặc định
       stroke  = độ dày viền chữ (px, toả ra ngoài)
       baseY   = đường chân chữ (baseline) – giữ nguyên dù tên dài/ngắn
       cx      = tâm ngang của chữ
       maxW    = bề ngang tối đa (tên dài hơn sẽ tự thu nhỏ)
     Muốn xê dịch chữ về sau, chỉ cần sửa mấy con số dưới đây.
     ================================================================== */
  const MOCK = 1254;
  const TPL = {
    coban: {
      key: "coban", label: "Cấp 1 Cơ Bản", img: "assets/tkb-coban.jpg",
      size: 53, stroke: 6, baseY: 977, cx: 627, maxW: 640,
      fill: "#ffffff", ink: "#1240c2", shadow: "rgba(12,40,120,0.30)", shadowBlur: 6,
    },
    thohong: {
      key: "thohong", label: "Cấp 1 Thỏ Hồng", img: "assets/tkb-thohong.jpg",
      size: 47, stroke: 5, baseY: 1000, cx: 627, maxW: 700,
      fill: "#ffffff", ink: "#f86a99", shadow: "rgba(190,80,120,0.28)", shadowBlur: 6,
    },
    vutru: {
      key: "vutru", label: "Cấp 1 Vũ Trụ", img: "assets/tkb-vutru.jpg",
      size: 47, stroke: 5, baseY: 960, cx: 627, maxW: 700,
      fill: "#ffffff", ink: "#093283", shadow: "rgba(3,18,56,0.40)", shadowBlur: 7,
    },
  };
  const TPL_ORDER = ["coban", "thohong", "vutru"];

  /* --------------------------- File Design --------------------------- */
  const DESIGN = {
    w: 1254, h: 1254, bg: "#ffffff", ink: "#000000",
    size: 102, baseY: 646, cx: 627, maxW: 1130,
    font: 'Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif',
    weight: "bold",
  };

  /* ------------------------------ Font ------------------------------ */
  const FONT_LOBSTER = "TKB-Lobster";
  let fontsReady = null;
  function loadFonts() {
    if (fontsReady) return fontsReady;
    const f = new FontFace(FONT_LOBSTER, `url(${EXT("assets/Lobster-Regular.ttf")})`);
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
  async function renderMockup(canvas, tplKey, name, off, sizeScale) {
    const t = TPL[tplKey] || TPL.coban;
    canvas.width = MOCK; canvas.height = MOCK;
    const ctx = canvas.getContext("2d");
    const bg = await loadExtBitmap(t.img);
    ctx.clearRect(0, 0, MOCK, MOCK);
    ctx.drawImage(bg, 0, 0, MOCK, MOCK);
    const txt = String(name || "").trim();
    if (!txt) return canvas;
    const base = Math.max(10, Math.round(t.size * (sizeScale || 1)));
    const stroke0 = Math.max(1, Math.round(t.stroke * base / t.size));
    const size = fitSize(ctx, txt, `"${FONT_LOBSTER}"`, base, stroke0, t.maxW);
    const st = Math.max(1, Math.round(t.stroke * size / t.size));
    const dx = (off && off.dx) || 0, dy = (off && off.dy) || 0;
    drawOutlined(ctx, txt, t.cx + dx, t.baseY + dy, `"${FONT_LOBSTER}"`, size, st, t.fill, t.ink, t.shadow, t.shadowBlur);
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
  function designFromText(s) {
    const t = noAccent(s);
    if (/tho\s*hong/.test(t)) return "thohong";
    if (/vu\s*tru/.test(t)) return "vutru";
    if (/co\s*ban/.test(t)) return "coban";
    return null;
  }
  // Fulfillment SKU: P-3D-TKB-01-N (cơ bản) · P-3D-TKB-VT-01-N (vũ trụ) · P-3D-TKB-TH-01-N (thỏ hồng)
  function designFromSku(s) {
    const t = noAccent(s);
    if (!/tkb/.test(t)) return null;
    if (/tkb-vt/.test(t)) return "vutru";
    if (/tkb-th/.test(t)) return "thohong";
    if (/tkb-\d/.test(t)) return "coban";
    return null;
  }
  const isTKBText = (s) => /thoi\s*kho?a\s*bieu/.test(noAccent(s)) || /tkb/.test(noAccent(s));

  // Quét các item Thời khoá biểu trên trang đơn (theo đúng thứ tự hiển thị).
  // rowIndex = vị trí trong danh sách TẤT CẢ media_row của trang (injected.js dùng để tìm đúng 2 nút Upload).
  function scanItems() {
    const rows = [...document.querySelectorAll('[class*="media_row"]')];
    const out = [];
    rows.forEach((row, i) => {
      const box = row.closest('[class*="item_container"]') || row.parentElement;
      if (!box) return;
      const raw = (box.innerText || "").replace(/\n/g, " | ");
      if (!isTKBText(raw)) return;
      const sku = (raw.match(/SKU ID:\s*([\w.-]+)/i) || [])[1] || "";
      const tk = ((raw.match(/Thi[eế]t\s*k[eế]\s*:\s*([^,|]+)/i) || [])[1] || "").trim();
      const fsku = (raw.match(/[A-Z0-9]*-?TKB[A-Z0-9-]*/i) || [])[0] || "";
      const d = designFromText(tk) || designFromSku(fsku);
      out.push({ rowIndex: i, sku, tkText: tk, design: d || "coban", detected: !!d, name: "", sizePct: 100, dx: 0, dy: 0 });
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
  const OFF_MAX = 320;
  let els = null;
  const cur = () => state.items[state.active] || null;

  function buildModal() {
    const overlay = document.createElement("div");
    overlay.id = "tkb-overlay";
    overlay.innerHTML = `
      <div id="tkb-modal">
        <div class="tkb-head"><h2>🗓 Tạo Mockup &amp; Design – Thời Khoá Biểu 3D</h2><button class="tkb-close" title="Đóng">×</button></div>
        <div class="tkb-body">
          <div class="tkb-left">
            <div id="tkb-warn" class="tkb-warn" style="display:none"></div>
            <div class="tkb-field"><label>Các item trong đơn (tên lấy theo thứ tự dòng của External note)</label>
              <div id="tkb-items" class="tkb-items"></div>
            </div>
            <div class="tkb-field"><label>Chỉnh chữ cho item đang chọn</label>
              <div class="tkb-rf-row"><span>Cỡ %</span><input type="number" id="tkb-size" class="tkb-num tkb-num-sm" min="40" max="200" step="5" value="100">
                <span>X</span><input type="number" id="tkb-tx" class="tkb-num tkb-num-sm" step="1" value="0">
                <span>Y</span><input type="number" id="tkb-ty" class="tkb-num tkb-num-sm" step="1" value="0">
                <button type="button" id="tkb-treset">Đặt lại</button></div>
              <div class="tkb-hint">Kéo thẳng trên ảnh preview để dời chữ · lăn chuột để đổi cỡ. Tên quá dài tự thu nhỏ cho vừa bảng.</div>
            </div>
          </div>
          <div class="tkb-right"><div class="tkb-previews">
            <div class="tkb-pv"><div class="tkb-pv-title" id="tkb-pv-label">Mockup (1254×1254)</div>
              <canvas id="tkb-pv-mock" class="tkb-draggable"></canvas></div>
            <div class="tkb-pv"><div class="tkb-pv-title">Design (1254×1254) · nền trắng, chữ đen Arial Bold</div>
              <canvas id="tkb-pv-design"></canvas></div>
          </div></div>
          <div id="tkb-status" class="info"></div>
          <div class="tkb-actions">
            <button class="tkb-btn-dl" id="tkb-dl">⬇ Tải PNG (tất cả)</button>
            <button class="tkb-btn-fill" id="tkb-fill">✅ Điền vào Mockup &amp; Design</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const $ = (s) => overlay.querySelector(s);
    els = {
      overlay, warn: $("#tkb-warn"), list: $("#tkb-items"), size: $("#tkb-size"),
      tx: $("#tkb-tx"), ty: $("#tkb-ty"), tReset: $("#tkb-treset"), pvLabel: $("#tkb-pv-label"),
      pvMock: $("#tkb-pv-mock"), pvDesign: $("#tkb-pv-design"), status: $("#tkb-status"),
      btnDl: $("#tkb-dl"), btnFill: $("#tkb-fill"),
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
    $(".tkb-close").onclick = closeModal;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    els.btnDl.onclick = doDownload; els.btnFill.onclick = doFill;

    let drag = null;
    els.pvMock.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; els.pvMock.setPointerCapture(e.pointerId); els.pvMock.classList.add("tkb-grabbing"); });
    els.pvMock.addEventListener("pointermove", (e) => {
      if (!drag) return; const it = cur(); if (!it) return;
      const r = els.pvMock.getBoundingClientRect();
      it.dx = clamp(it.dx + (e.clientX - drag.x) / r.width * MOCK, -OFF_MAX, OFF_MAX);
      it.dy = clamp(it.dy + (e.clientY - drag.y) / r.height * MOCK, -OFF_MAX, OFF_MAX);
      drag.x = e.clientX; drag.y = e.clientY; syncTools(); schedule();
    });
    const end = () => { if (drag) { drag = null; els.pvMock.classList.remove("tkb-grabbing"); } };
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
      card.className = "tkb-item" + (i === state.active ? " sel" : "") + (it.name ? "" : " empty");
      card.innerHTML = `
        <div class="tkb-item-head">
          <b>Item ${i + 1}</b>
          <span class="tkb-item-tk ${it.detected ? "ok" : "err"}">${it.detected ? (it.tkText || TPL[it.design].label) : "không đọc được Thiết kế"}</span>
          <span class="tkb-item-sku">${it.sku || ""}</span>
        </div>
        <div class="tkb-item-row">
          <input class="tkb-item-name" type="text" placeholder="Tên khách…" value="">
          <div class="tkb-seg tkb-seg-mini tkb-item-seg"></div>
        </div>`;
      const input = card.querySelector(".tkb-item-name");
      input.value = it.name || "";
      input.addEventListener("input", () => { it.name = input.value; card.classList.toggle("empty", !it.name); refreshWarn(); if (i === state.active) schedule(); });
      input.addEventListener("focus", () => select(i));
      const seg = card.querySelector(".tkb-item-seg");
      TPL_ORDER.forEach((k) => {
        const b = document.createElement("button"); b.type = "button"; b.textContent = TPL[k].label.replace("Cấp 1 ", ""); b.dataset.val = k;
        b.classList.toggle("active", k === it.design);
        b.onclick = (e) => { e.stopPropagation(); it.design = k; it.detected = true; renderItemList(); select(i); };
        seg.appendChild(b);
      });
      card.addEventListener("click", () => select(i));
      els.list.appendChild(card);
    });
    if (!state.items.length) els.list.innerHTML = '<div class="tkb-hint">Không thấy item Thời khoá biểu nào trên trang này.</div>';
  }
  function select(i) {
    if (i === state.active) { syncTools(); return; }
    state.active = i;
    els.list.querySelectorAll(".tkb-item").forEach((c, k) => c.classList.toggle("sel", k === i));
    syncTools(); schedule();
  }
  function syncTools() {
    const it = cur(); if (!it || !els) return;
    els.size.value = String(it.sizePct);
    els.tx.value = String(Math.round(it.dx)); els.ty.value = String(Math.round(it.dy));
    els.pvLabel.textContent = `Mockup (1254×1254) – Item ${state.active + 1} · ${TPL[it.design].label}`;
  }
  function refreshWarn() {
    if (!els) return;
    const n = state.items.length, m = state.names.length;
    const missing = state.items.filter((i) => !String(i.name || "").trim()).length;
    const msgs = [];
    if (n && m && m !== n) msgs.push(`⚠️ External note có ${m} dòng tên nhưng đơn có ${n} item Thời khoá biểu — kiểm tra lại rồi điền tay cho khớp.`);
    if (missing) msgs.push(`⚠️ Còn ${missing} item chưa có tên.`);
    const bad = state.items.filter((i) => !i.detected).length;
    if (bad) msgs.push(`⚠️ ${bad} item không đọc được mục “Thiết kế” — chọn mẫu bên dưới.`);
    els.warn.innerHTML = msgs.join("<br>");
    els.warn.style.display = msgs.length ? "block" : "none";
  }
  function setStatus(msg, cls) { if (els) { els.status.textContent = msg || ""; els.status.className = cls || "info"; } }
  function toast(msg, cls) {
    let t = document.getElementById("tkb-toast");
    if (!t) { t = document.createElement("div"); t.id = "tkb-toast"; document.body.appendChild(t); }
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
        await renderMockup(els.pvMock, it.design, it.name, { dx: it.dx, dy: it.dy }, it.sizePct / 100);
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
    const mock = await canvasToFile(await renderMockup(document.createElement("canvas"), it.design, it.name, { dx: it.dx, dy: it.dy }, it.sizePct / 100), `mockup-tkb-${tag}.png`);
    const des = await canvasToFile(await renderDesign(document.createElement("canvas"), it.name), `design-tkb-${tag}.png`);
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
        if (ev.data.__tkb === "progress") { // còn chạy -> gia hạn chờ
          const st = ev.data.step ? ` – ${ev.data.step}` : "";
          toast(`⏳ Đang điền ${Math.min(ev.data.done + 1, ev.data.total)}/${ev.data.total} · ${ev.data.label || ""}${st}…`, "info");
          clearTimeout(tm); tm = setTimeout(done, timeout || 15000);
          return;
        }
        if (ev.data.__tkb === "result") done(ev.data);
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
      window.postMessage({ __tkb: "fill", items: payload }, "*");
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
    let btn = document.getElementById("tkb-open-btn");
    if (!onOrder) { if (btn) btn.remove(); return; }
    if (btn) return;
    btn = document.createElement("button"); btn.id = "tkb-open-btn"; btn.type = "button";
    btn.innerHTML = "🗓 Tạo Mockup Thời Khoá Biểu";
    btn.title = "Lấy tên ở External note + mẫu bảng ở mục Thiết kế của từng item";
    btn.onclick = openModal; document.body.appendChild(btn);
  }
  new MutationObserver(() => ensureButton()).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(ensureButton, 1500); ensureButton(); loadFonts();

  /* ---------------- API cho luồng tự động (auto.js) ---------------- */
  window.__TKB_API__ = {
    loadFonts, renderMockup, renderDesign, canvasToFile, loadBitmap,
    noteNames, cleanName, designFromText, designFromSku, isTKBText, noAccent,
    TPL, TPL_ORDER, DESIGN,
  };
})();
