/* =========================================================================
   Móc Khóa Clicky Instax 3D – Tạo Mockup & Design (cendo.work)
   - 1 đơn có thể có NHIỀU item: mỗi item 1 màu vỏ máy + 1 ảnh của khách.
   - Ảnh khách: mục Attachments của đơn, ảnh thứ n -> item Instax thứ n
     (theo thứ tự hiển thị). Lệch số lượng thì báo đỏ, chọn tay từng ảnh.
   - Màu vỏ: variant_name "Màu: Màu Xanh Dương|Xanh Lá|Hồng|Cam"
     (dự phòng fulfillment SKU P-3D-K06-Blue|Green|Pink|Orange).
   - Mockup 1000×1000: ảnh mẫu theo màu, ảnh khách phủ kín vùng đen (tấm
     phim instax), cắt mép thừa, căn giữa.
   - Design 270×330 px = 2,29×2,79 cm @ 300 dpi (có ghi pHYs 300dpi vào PNG):
     ảnh khách phủ kín khung, cắt mép thừa, căn giữa, nền trắng.
   ========================================================================= */
(() => {
  "use strict";
  if (window.__INSTAX_LOADED__) return;
  window.__INSTAX_LOADED__ = true;

  const EXT = (p) => chrome.runtime.getURL(p);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ===================== Thông số 4 mẫu mockup =====================
     Canvas gốc 1000×1000. slot = vùng đen (tấm phim) đo trực tiếp từ
     4 ảnh mẫu bằng phân tích pixel (sai số ≤1px, các vùng gần như
     vuông góc tuyệt đối). Muốn xê dịch về sau chỉ cần sửa số ở đây.
     ================================================================= */
  const MOCK = 1000;
  const TPL = {
    blue:   { key: "blue",   label: "Xanh Dương", img: "assets/MOCKUP_INSTAX_BLUE.png",   slot: { x: 385, y: 155, w: 204, h: 273 } },
    green:  { key: "green",  label: "Xanh Lá",    img: "assets/MOCKUP_INSTAX_GREEN.png",  slot: { x: 385, y: 151, w: 190, h: 285 } },
    pink:   { key: "pink",   label: "Hồng",       img: "assets/MOCKUP_INSTAX_PINK.png",   slot: { x: 388, y: 149, w: 199, h: 295 } },
    orange: { key: "orange", label: "Cam",        img: "assets/MOCKUP_INSTAX_ORANGE.png", slot: { x: 385, y: 137, w: 195, h: 288 } },
  };
  const TPL_ORDER = ["blue", "green", "pink", "orange"];

  /* --------------------------- File Design ---------------------------
     2,29 cm × 2,79 cm @ 300 dpi -> round(2.29/2.54*300) × round(2.79/2.54*300) */
  const DESIGN = { w: 270, h: 330, dpi: 300, bg: "#ffffff" };

  /* ----------------------- PNG pHYs (ghi dpi) ----------------------- */
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8) {
    let c = 0xffffffff;
    for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  // Chèn chunk pHYs (pixels/mét) ngay sau IHDR để Photoshop mở ra đúng 2,29×2,79cm
  async function pngWithDpi(blob, dpi) {
    const u8 = new Uint8Array(await blob.arrayBuffer());
    const ppm = Math.round(dpi / 0.0254); // 300dpi -> 11811 px/m
    const chunk = new Uint8Array(21);     // len(4) + "pHYs"(4) + data(9) + crc(4)
    const dv = new DataView(chunk.buffer);
    dv.setUint32(0, 9);
    chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
    dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1; // unit = mét
    dv.setUint32(17, crc32(chunk.subarray(4, 17)));
    const IHDR_END = 33; // 8 (chữ ký PNG) + 4+4+13+4 (chunk IHDR)
    const out = new Uint8Array(u8.length + chunk.length);
    out.set(u8.subarray(0, IHDR_END));
    out.set(chunk, IHDR_END);
    out.set(u8.subarray(IHDR_END), IHDR_END + chunk.length);
    return new Blob([out], { type: "image/png" });
  }

  /* ---------------------------- Tải ảnh ----------------------------
     Ảnh mẫu: từ extension. Ảnh khách (content.pancake.vn): fetch qua
     bg.js (service worker có host_permissions nên không vướng CORS,
     canvas không bị taint); lỗi thì thử fetch thẳng.               */
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
  const remoteCache = {}; // url -> Promise<{dataUrl, bitmap}>
  function fetchRemote(url) {
    if (!remoteCache[url]) {
      remoteCache[url] = new Promise((resolve, reject) => {
        let done = false;
        const finish = async (dataUrl, err) => {
          if (done) return; done = true;
          if (!dataUrl) {
            // dự phòng: fetch thẳng (nếu CDN cho CORS)
            try {
              const blob = await (await fetch(url)).blob();
              const fr = new FileReader();
              fr.onload = async () => resolve({ dataUrl: fr.result, bitmap: await createImageBitmap(blob) });
              fr.onerror = () => reject(new Error("Không tải được ảnh: " + (err || "đọc blob lỗi")));
              fr.readAsDataURL(blob);
            } catch (e) { reject(new Error("Không tải được ảnh (" + (err || e.message) + ")")); }
            return;
          }
          try {
            const blob = await (await fetch(dataUrl)).blob();
            resolve({ dataUrl, bitmap: await createImageBitmap(blob) });
          } catch (e) { reject(new Error("Ảnh tải về nhưng không đọc được: " + e.message)); }
        };
        try {
          chrome.runtime.sendMessage({ type: "INSTAX_FETCH", url }, (r) => {
            if (chrome.runtime.lastError) return finish(null, chrome.runtime.lastError.message);
            if (r && r.ok && r.dataUrl) finish(r.dataUrl);
            else finish(null, (r && r.error) || "bg không phản hồi");
          });
        } catch (e) { finish(null, e.message); }
      });
      remoteCache[url].catch(() => { delete remoteCache[url]; }); // cho phép thử lại
    }
    return remoteCache[url];
  }

  /* ------------------------- Vẽ ảnh phủ kín -------------------------
     drawCover: phóng ảnh src phủ kín khung (dx,dy,dw,dh), cắt mép thừa,
     căn giữa. adj = { zoom % (100 = vừa khít), dx, dy (px của khung) } */
  function drawCover(ctx, src, dx, dy, dw, dh, adj) {
    const sw = src.width, sh = src.height;
    const s = Math.max(dw / sw, dh / sh) * (((adj && adj.zoom) || 100) / 100);
    const w = sw * s, h = sh * s;
    const x = dx + (dw - w) / 2 + ((adj && adj.dx) || 0);
    const y = dy + (dh - h) / 2 + ((adj && adj.dy) || 0);
    ctx.save();
    ctx.beginPath(); ctx.rect(dx, dy, dw, dh); ctx.clip();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(dx, dy, dw, dh);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, x, y, w, h);
    ctx.restore();
  }

  /* --------------------------- Render --------------------------- */
  // Design 270×330: ảnh khách phủ kín, nền trắng
  function renderDesign(canvas, bitmap, adj) {
    canvas.width = DESIGN.w; canvas.height = DESIGN.h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = DESIGN.bg; ctx.fillRect(0, 0, DESIGN.w, DESIGN.h);
    if (bitmap) drawCover(ctx, bitmap, 0, 0, DESIGN.w, DESIGN.h, adj);
    return canvas;
  }
  // Mockup 1000×1000: nền mẫu theo màu + CHÍNH file Design phủ kín vùng đen
  // (dùng lại canvas design để mockup luôn khớp 100% với ảnh sẽ in)
  async function renderMockup(canvas, tplKey, bitmap, adj) {
    const t = TPL[tplKey] || TPL.blue;
    canvas.width = MOCK; canvas.height = MOCK;
    const ctx = canvas.getContext("2d");
    const bg = await loadExtBitmap(t.img);
    ctx.clearRect(0, 0, MOCK, MOCK);
    ctx.drawImage(bg, 0, 0, MOCK, MOCK);
    if (bitmap) {
      const des = renderDesign(document.createElement("canvas"), bitmap, adj);
      drawCover(ctx, des, t.slot.x, t.slot.y, t.slot.w, t.slot.h, null);
    }
    return canvas;
  }
  function canvasToBlob(canvas) {
    return new Promise((r) => canvas.toBlob(r, "image/png"));
  }
  async function canvasToFile(canvas, fname, dpi) {
    let blob = await canvasToBlob(canvas);
    if (dpi) { try { blob = await pngWithDpi(blob, dpi); } catch (e) { console.warn("[INSTAX] pHYs lỗi:", e); } }
    return new File([blob], fname, { type: "image/png" });
  }

  /* --------------------- Nhận diện màu / item --------------------- */
  const noAccent = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  function colorFromText(s) {
    const t = noAccent(s);
    if (/xanh\s*duong|\bblue\b/.test(t)) return "blue";
    if (/xanh\s*la|\bgreen\b/.test(t)) return "green";
    if (/\bhong\b|\bpink\b/.test(t)) return "pink";
    if (/\bcam\b|\borange\b/.test(t)) return "orange";
    return null;
  }
  // Fulfillment SKU: P-3D-K06-Blue · P-3D-K06-Green · P-3D-K06-Pink · P-3D-K06-Orange
  function colorFromSku(s) {
    const t = noAccent(s);
    if (!/k06/.test(t)) return null;
    if (/blue/.test(t)) return "blue";
    if (/green/.test(t)) return "green";
    if (/pink/.test(t)) return "pink";
    if (/orange/.test(t)) return "orange";
    return null;
  }
  const isInstaxText = (s) => /instax/.test(noAccent(s)) || /k06/.test(noAccent(s));

  // Quét các item Instax trên trang đơn (theo đúng thứ tự hiển thị).
  // rowIndex = vị trí trong danh sách TẤT CẢ media_row (injected.js dùng).
  function scanItems() {
    const rows = [...document.querySelectorAll('[class*="media_row"]')];
    const out = [];
    rows.forEach((row, i) => {
      const box = row.closest('[class*="item_container"]') || row.parentElement;
      if (!box) return;
      const raw = (box.innerText || "").replace(/\n/g, " | ");
      if (!isInstaxText(raw)) return;
      const sku = (raw.match(/SKU ID:\s*([\w.-]+)/i) || [])[1] || "";
      const mau = ((raw.match(/M[aà]u\s*:\s*([^|]+)/i) || [])[1] || "").trim();
      const fsku = (raw.match(/[A-Z0-9]*-?K06[A-Z0-9-]*/i) || [])[0] || "";
      const c = colorFromText(mau) || colorFromSku(fsku) || colorFromSku(raw);
      out.push({ rowIndex: i, sku, mauText: mau, color: c || "blue", detected: !!c, att: -1, zoom: 100, dx: 0, dy: 0 });
    });
    return out;
  }

  function orderMongoId() {
    const m = location.pathname.match(/orders?\/([a-f0-9]{24})/i);
    return m ? m[1] : null;
  }
  function orderId() {
    const m = location.pathname.match(/orders?\/([\w-]+)/i);
    return m ? m[1].slice(0, 12) : "order";
  }
  // Danh sách ảnh Attachments (chỉ type image) qua API — DOM chỉ có thumbnail
  async function getAttachments() {
    const id = orderMongoId();
    if (!id) return [];
    const res = await fetch(`/api/orders/${id}`, { credentials: "include" });
    if (!res.ok) throw new Error("API đơn hàng HTTP " + res.status);
    const j = await res.json();
    if (!j || j.success === false || !j.data) throw new Error("API đơn hàng trả dữ liệu lạ");
    return (j.data.attachments || []).filter((a) => a && a.type === "image" && a.url).map((a) => a.url);
  }

  /* ============================== UI ============================== */
  const state = { items: [], atts: [], attImgs: {}, active: 0, orderKey: null, loading: false };
  const OFF_MAX = 400;
  let els = null;
  const cur = () => state.items[state.active] || null;

  function buildModal() {
    const overlay = document.createElement("div");
    overlay.id = "instax-overlay";
    overlay.innerHTML = `
      <div id="instax-modal">
        <div class="instax-head"><h2>📸 Tạo Mockup &amp; Design – Móc Khóa Clicky Instax 3D</h2><button class="instax-close" title="Đóng">×</button></div>
        <div class="instax-body">
          <div class="instax-left">
            <div id="instax-warn" class="instax-warn" style="display:none"></div>
            <div class="instax-field"><label>Ảnh Attachments của đơn (bấm để gán cho item đang chọn)</label>
              <div id="instax-atts" class="instax-atts"><div class="instax-hint">Đang tải ảnh…</div></div>
            </div>
            <div class="instax-field"><label>Các item trong đơn (ảnh thứ n gán cho item thứ n)</label>
              <div id="instax-items" class="instax-items"></div>
            </div>
            <div class="instax-field"><label>Chỉnh ảnh cho item đang chọn</label>
              <div class="instax-rf-row"><span>Phóng %</span><input type="number" id="instax-zoom" class="instax-num instax-num-sm" min="100" max="400" step="5" value="100">
                <span>X</span><input type="number" id="instax-tx" class="instax-num instax-num-sm" step="1" value="0">
                <span>Y</span><input type="number" id="instax-ty" class="instax-num instax-num-sm" step="1" value="0">
                <button type="button" id="instax-treset">Đặt lại</button></div>
              <div class="instax-hint">Kéo thẳng trên khung Design để dời ảnh · lăn chuột để phóng to/nhỏ. Mặc định ảnh phủ kín khung, cắt đều 2 mép thừa.</div>
            </div>
          </div>
          <div class="instax-right"><div class="instax-previews">
            <div class="instax-pv"><div class="instax-pv-title" id="instax-pv-label">Mockup (1000×1000)</div>
              <canvas id="instax-pv-mock"></canvas></div>
            <div class="instax-pv"><div class="instax-pv-title">Design (270×330 px = 2,29×2,79 cm @ 300 dpi)</div>
              <canvas id="instax-pv-design" class="instax-draggable"></canvas></div>
          </div></div>
          <div id="instax-status" class="info"></div>
          <div class="instax-actions">
            <button class="instax-btn-dl" id="instax-dl">⬇ Tải PNG (tất cả)</button>
            <button class="instax-btn-fill" id="instax-fill">✅ Điền vào Mockup &amp; Design</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const $ = (s) => overlay.querySelector(s);
    els = {
      overlay, warn: $("#instax-warn"), atts: $("#instax-atts"), list: $("#instax-items"),
      zoom: $("#instax-zoom"), tx: $("#instax-tx"), ty: $("#instax-ty"), tReset: $("#instax-treset"),
      pvLabel: $("#instax-pv-label"), pvMock: $("#instax-pv-mock"), pvDesign: $("#instax-pv-design"),
      status: $("#instax-status"), btnDl: $("#instax-dl"), btnFill: $("#instax-fill"),
    };
    els.zoom.addEventListener("input", () => { const it = cur(); if (!it) return; it.zoom = clamp(parseFloat(els.zoom.value) || 100, 100, 400); schedule(); });
    const onOff = () => {
      const it = cur(); if (!it) return;
      it.dx = clamp(parseFloat(els.tx.value) || 0, -OFF_MAX, OFF_MAX);
      it.dy = clamp(parseFloat(els.ty.value) || 0, -OFF_MAX, OFF_MAX);
      schedule();
    };
    els.tx.addEventListener("input", onOff); els.ty.addEventListener("input", onOff);
    els.tReset.onclick = () => { const it = cur(); if (!it) return; it.zoom = 100; it.dx = 0; it.dy = 0; syncTools(); schedule(); };
    $(".instax-close").onclick = closeModal;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    els.btnDl.onclick = doDownload; els.btnFill.onclick = doFill;

    let drag = null;
    els.pvDesign.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; els.pvDesign.setPointerCapture(e.pointerId); els.pvDesign.classList.add("instax-grabbing"); });
    els.pvDesign.addEventListener("pointermove", (e) => {
      if (!drag) return; const it = cur(); if (!it) return;
      const r = els.pvDesign.getBoundingClientRect();
      it.dx = clamp(it.dx + (e.clientX - drag.x) / r.width * DESIGN.w, -OFF_MAX, OFF_MAX);
      it.dy = clamp(it.dy + (e.clientY - drag.y) / r.height * DESIGN.h, -OFF_MAX, OFF_MAX);
      drag.x = e.clientX; drag.y = e.clientY; syncTools(); schedule();
    });
    const end = () => { if (drag) { drag = null; els.pvDesign.classList.remove("instax-grabbing"); } };
    els.pvDesign.addEventListener("pointerup", end); els.pvDesign.addEventListener("pointercancel", end);
    els.pvDesign.addEventListener("wheel", (e) => {
      e.preventDefault(); const it = cur(); if (!it) return;
      it.zoom = clamp(it.zoom + (e.deltaY < 0 ? 5 : -5), 100, 400);
      els.zoom.value = String(it.zoom); schedule();
    }, { passive: false });
    return overlay;
  }

  function renderAttStrip() {
    if (!els) return;
    els.atts.innerHTML = "";
    if (state.loading) { els.atts.innerHTML = '<div class="instax-hint">Đang tải ảnh Attachments…</div>'; return; }
    if (!state.atts.length) { els.atts.innerHTML = '<div class="instax-hint">Đơn này không có ảnh trong Attachments.</div>'; return; }
    state.atts.forEach((url, i) => {
      const d = document.createElement("div");
      d.className = "instax-att";
      const usedBy = state.items.map((it, k) => (it.att === i ? k + 1 : 0)).filter(Boolean);
      d.innerHTML = `<span class="instax-att-n">${i + 1}</span>` +
        (state.attImgs[url] ? `<img src="${state.attImgs[url]}">` : `<div class="instax-att-ph">…</div>`) +
        (usedBy.length ? `<span class="instax-att-used">→ item ${usedBy.join(",")}</span>` : "");
      d.title = "Gán ảnh " + (i + 1) + " cho item đang chọn";
      d.onclick = () => { const it = cur(); if (!it) return; it.att = i; renderItemList(); renderAttStrip(); refreshWarn(); schedule(); };
      els.atts.appendChild(d);
    });
  }

  function renderItemList() {
    els.list.innerHTML = "";
    state.items.forEach((it, i) => {
      const card = document.createElement("div");
      card.className = "instax-item" + (i === state.active ? " sel" : "") + (it.att >= 0 ? "" : " empty");
      card.innerHTML = `
        <div class="instax-item-head">
          <b>Item ${i + 1}</b>
          <span class="instax-item-mau ${it.detected ? "ok" : "err"}">${it.detected ? (it.mauText || TPL[it.color].label) : "không đọc được Màu"}</span>
          <span class="instax-item-sku">${it.sku || ""}</span>
        </div>
        <div class="instax-item-row">
          <select class="instax-item-att"></select>
          <div class="instax-seg instax-seg-mini instax-item-seg"></div>
        </div>`;
      const sel = card.querySelector(".instax-item-att");
      const opt0 = document.createElement("option"); opt0.value = "-1"; opt0.textContent = "— chưa gán ảnh —"; sel.appendChild(opt0);
      state.atts.forEach((u, k) => {
        const o = document.createElement("option"); o.value = String(k); o.textContent = `Ảnh ${k + 1}`; sel.appendChild(o);
      });
      sel.value = String(it.att);
      sel.addEventListener("change", () => { it.att = parseInt(sel.value, 10); card.classList.toggle("empty", it.att < 0); renderAttStrip(); refreshWarn(); if (i === state.active) schedule(); });
      sel.addEventListener("focus", () => select(i));
      const seg = card.querySelector(".instax-item-seg");
      TPL_ORDER.forEach((k) => {
        const b = document.createElement("button"); b.type = "button"; b.textContent = TPL[k].label; b.dataset.val = k;
        b.classList.toggle("active", k === it.color);
        b.onclick = (e) => { e.stopPropagation(); it.color = k; it.detected = true; renderItemList(); select(i); };
        seg.appendChild(b);
      });
      card.addEventListener("click", () => select(i));
      els.list.appendChild(card);
    });
    if (!state.items.length) els.list.innerHTML = '<div class="instax-hint">Không thấy item Móc Khóa Clicky Instax nào trên trang này.</div>';
  }
  function select(i) {
    if (i === state.active) { syncTools(); return; }
    state.active = i;
    els.list.querySelectorAll(".instax-item").forEach((c, k) => c.classList.toggle("sel", k === i));
    syncTools(); schedule();
  }
  function syncTools() {
    const it = cur(); if (!it || !els) return;
    els.zoom.value = String(it.zoom);
    els.tx.value = String(Math.round(it.dx)); els.ty.value = String(Math.round(it.dy));
    els.pvLabel.textContent = `Mockup (1000×1000) – Item ${state.active + 1} · ${TPL[it.color].label}`;
  }
  function refreshWarn() {
    if (!els) return;
    const n = state.items.length, m = state.atts.length;
    const missing = state.items.filter((i) => i.att < 0).length;
    const msgs = [];
    if (n && m && m !== n) msgs.push(`⚠️ Attachments có ${m} ảnh nhưng đơn có ${n} item Instax — kiểm tra rồi gán tay cho khớp.`);
    if (missing) msgs.push(`⚠️ Còn ${missing} item chưa gán ảnh.`);
    const dup = {};
    state.items.forEach((it, i) => { if (it.att >= 0) (dup[it.att] = dup[it.att] || []).push(i + 1); });
    const dups = Object.entries(dup).filter(([, v]) => v.length > 1);
    if (dups.length) msgs.push(`⚠️ Trùng ảnh: ${dups.map(([k, v]) => `ảnh ${+k + 1} đang gán cho item ${v.join(" & ")}`).join(" · ")}.`);
    const bad = state.items.filter((i) => !i.detected).length;
    if (bad) msgs.push(`⚠️ ${bad} item không đọc được mục “Màu” — chọn màu bên dưới.`);
    els.warn.innerHTML = msgs.join("<br>");
    els.warn.style.display = msgs.length ? "block" : "none";
  }
  function setStatus(msg, cls) { if (els) { els.status.textContent = msg || ""; els.status.className = cls || "info"; } }
  function toast(msg, cls) {
    let t = document.getElementById("instax-toast");
    if (!t) { t = document.createElement("div"); t.id = "instax-toast"; document.body.appendChild(t); }
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
        let bmp = null;
        if (it.att >= 0 && state.atts[it.att]) bmp = (await fetchRemote(state.atts[it.att])).bitmap;
        renderDesign(els.pvDesign, bmp, it);
        await renderMockup(els.pvMock, it.color, bmp, it);
      } catch (e) { setStatus("Lỗi render: " + e.message, "err"); }
    });
  }

  async function syncOrder(force) {
    const key = orderId();
    if (!force && state.orderKey === key && state.items.length) return;
    state.orderKey = key;
    state.items = scanItems(); state.active = 0;
    state.atts = []; state.attImgs = {}; state.loading = true;
    renderAttStrip && els && renderAttStrip();
    try {
      state.atts = await getAttachments();
    } catch (e) { setStatus("Không đọc được Attachments: " + e.message, "err"); }
    state.loading = false;
    // Gán mặc định: ảnh thứ n -> item thứ n (chỉ khi đủ ảnh cho vị trí đó)
    state.items.forEach((it, i) => { it.att = i < state.atts.length ? i : -1; });
    if (els) { renderAttStrip(); renderItemList(); refreshWarn(); schedule(); }
    // Tải thumbnail dần
    state.atts.forEach((url) => {
      fetchRemote(url).then((r) => { state.attImgs[url] = r.dataUrl; if (els) { renderAttStrip(); } schedule(); })
        .catch((e) => setStatus("Ảnh lỗi: " + e.message, "err"));
    });
  }

  async function openModal() {
    if (!els) buildModal(); else els.overlay.style.display = "flex";
    renderItemList(); renderAttStrip(); syncTools(); refreshWarn(); setStatus("", "info");
    await syncOrder(false);
    schedule();
  }
  function closeModal() { if (els) els.overlay.style.display = "none"; }

  async function buildFiles(it, i) {
    const tag = `${orderId()}-${i + 1}-${it.color}`;
    const bmp = (await fetchRemote(state.atts[it.att])).bitmap;
    const desC = renderDesign(document.createElement("canvas"), bmp, it);
    const mockC = await renderMockup(document.createElement("canvas"), it.color, bmp, it);
    const mock = await canvasToFile(mockC, `mockup-instax-${tag}.png`);
    const des = await canvasToFile(desC, `design-instax-${tag}.png`, DESIGN.dpi);
    return { mock, des };
  }

  async function doDownload() {
    try {
      setStatus("Đang tạo file…", "info");
      for (let i = 0; i < state.items.length; i++) {
        const it = state.items[i];
        if (it.att < 0) continue;
        const { mock, des } = await buildFiles(it, i);
        [mock, des].forEach((f) => {
          const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name;
          document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        });
      }
      setStatus("Đã tải Mockup + Design cho các item đã gán ảnh.", "ok");
    } catch (e) { setStatus("Lỗi tải: " + e.message, "err"); }
  }

  function waitFillResult(timeout) {
    return new Promise((resolve) => {
      let tm = setTimeout(done, timeout || 15000);
      function done(data) { window.removeEventListener("message", on); clearTimeout(tm); resolve(data || null); }
      const on = (ev) => {
        if (ev.source !== window || !ev.data) return;
        if (ev.data.__instax === "progress") { // còn chạy -> gia hạn chờ
          const st = ev.data.step ? ` – ${ev.data.step}` : "";
          toast(`⏳ Đang điền ${Math.min(ev.data.done + 1, ev.data.total)}/${ev.data.total} · ${ev.data.label || ""}${st}…`, "info");
          clearTimeout(tm); tm = setTimeout(done, timeout || 15000);
          return;
        }
        if (ev.data.__instax === "result") done(ev.data);
      };
      window.addEventListener("message", on);
    });
  }
  const blobToDataURL = (blob) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });

  async function doFill() {
    try {
      const ready = state.items.filter((it) => it.att >= 0);
      if (!ready.length) { setStatus("Chưa item nào được gán ảnh.", "err"); return; }
      const missing = state.items.length - ready.length;
      if (missing && !confirm(`Còn ${missing} item chưa gán ảnh sẽ bị bỏ qua. Vẫn điền ${ready.length} item?`)) return;
      setStatus("Đang tạo ảnh…", "info");
      const payload = [];
      for (let i = 0; i < state.items.length; i++) {
        const it = state.items[i];
        if (it.att < 0) continue;
        const { mock, des } = await buildFiles(it, i);
        payload.push({
          rowIndex: it.rowIndex, sku: it.sku, label: `Item ${i + 1}`,
          mockUrl: await blobToDataURL(mock), mockName: mock.name,
          designUrl: await blobToDataURL(des), designName: des.name,
        });
      }
      closeModal();
      toast(`⏳ Đang điền ${payload.length} item, chờ chút đừng bấm gì thêm…`, "info");
      const resP = waitFillResult(120000); // 120s KHÔNG có tín hiệu mới coi là treo
      window.postMessage({ __instax: "fill", items: payload }, "*");
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
    let btn = document.getElementById("instax-open-btn");
    if (!onOrder) { if (btn) btn.remove(); return; }
    if (btn) return;
    btn = document.createElement("button"); btn.id = "instax-open-btn"; btn.type = "button";
    btn.innerHTML = "📸 Tạo Mockup Instax";
    btn.title = "Lấy ảnh ở Attachments (ảnh thứ n → item thứ n) + mẫu mockup theo Màu của từng item";
    btn.onclick = openModal; document.body.appendChild(btn);
  }
  new MutationObserver(() => ensureButton()).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(ensureButton, 1500); ensureButton();

  /* ---------------- API cho luồng tự động (auto.js) ---------------- */
  window.__INSTAX_API__ = {
    renderMockup, renderDesign, canvasToFile, fetchRemote, loadBitmap,
    colorFromText, colorFromSku, isInstaxText, noAccent,
    TPL, TPL_ORDER, DESIGN,
  };
})();
