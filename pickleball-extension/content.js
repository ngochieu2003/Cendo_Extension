/* =========================================================================
   Móc Khoá Pickleball 3D – Tạo Mockup & Design (cendo.work)
   Dùng chung cho 2 sản phẩm (cùng 1 output):
     • "Móc Khóa 3D Clicky Pickleball"        – variant "Mẫu: Móc Khóa Clicky Pickleball - Yellow"
                                                (màu TIẾNG ANH), fulfillment_sku P-3D-K04-{Color}-N
     • "Móc Khoá Pickleball Bóng Xoay Tròn 3D" – variant "Màu: Màu Vàng, Phân loại: In tên"
                                                (màu TIẾNG VIỆT), fulfillment_sku P-3D-K08-{Color}-N
   - 1 đơn có thể có NHIỀU item: mỗi item 1 màu + 1 tên.
   - Tên khách: External note, dòng thứ n -> item thứ n (theo thứ tự hiển thị).
   - Màu (mẫu mockup): Đen · Đỏ · Vàng · Xanh Bạc Hà · Xanh Lá · Hồng · Cam — 7 mẫu.
   - Mockup 1500×1500: ảnh mẫu theo màu + tên khách IN HOA, font Lemonada Bold,
     kiểu sticker (chữ TRẮNG trên blob ĐỎ ôm theo chữ + vòng tròn đỏ) giống
     Cầu lông / Tennis nhưng XOAY DỌC 90° NGƯỢC chiều kim đồng hồ (đọc từ DƯỚI
     LÊN, đầu chữ quay sang TRÁI, vòng tròn đỏ ở TRÊN cùng = sau chữ) đặt bên
     TRÁI móc khoá. Mỗi màu 1 toạ độ riêng (đo từ 7 ảnh mẫu).
   - Design 1254×1254: nền trắng, chữ đen Arial Bold, canh giữa (giống TKB).
   ========================================================================= */
(() => {
  "use strict";
  if (window.__PICKLE_LOADED__) return;
  window.__PICKLE_LOADED__ = true;

  const EXT = (p) => chrome.runtime.getURL(p);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ======================= Thông số 7 mẫu màu =======================
     Template = ảnh "chưa điền tên" 1500×1500 (assets/*.jpg). Toạ độ đo bằng
     cách khớp 7 ảnh mẫu ĐÃ điền THUYTHU (thư mục "Pickeball/ví dụ") với bản
     chưa điền (match ≥0.98). MỖI MÀU một vị trí riêng (móc khoá mỗi ảnh nằm
     hơi khác nhau):
       size  = cỡ chữ Lemonada Bold mặc định (px)
       baseX = toạ độ X của đường chân chữ (chữ xoay dọc nên baseline là đường
               THẲNG ĐỨNG; đầu chữ quay sang TRÁI, tức mực chữ nằm ở x < baseX)
       cy    = tâm của chữ theo chiều đọc (trục Y canvas)
       maxL  = chiều dài tối đa CẢ sticker (ring+blob) theo chiều đọc; dài hơn
               tự thu nhỏ
     Muốn xê dịch chữ về sau, chỉ cần sửa mấy con số dưới đây.
     ================================================================== */
  /* Style sticker (giống hệt Cầu lông/Tennis, tỷ lệ theo cỡ chữ `size`):
     - chữ TRẮNG, nền blob ĐỎ ôm theo chữ (stroke đỏ dày, bo tròn),
     - vòng tròn đỏ trang trí nằm SAU chữ (bên phải trong hệ chữ = phía TRÊN
       sau khi xoay dọc ngược chiều kim đồng hồ),
     - rim = viền trắng ngoài cùng (ảnh mẫu = 0, chỉnh được). */
  const RED = "#d01a2c";        // màu blob (đo từ ảnh mẫu: rgb(208,26,44))
  const WHITE = "#ffffff";
  const STICKER = {
    strokeR: 0.27,  // độ dày blob đỏ toả ra ngoài chữ (× size)
    rimR: 0,        // viền trắng ngoài cùng (× size); 0 = không vẽ
    trackEm: 0.025, // letter-spacing (× size, khớp ảnh mẫu)
    ring: { gap: 0.62, dy: 0.345, midR: 0.36, width: 0.29, on: true, side: "after" },
    // ring: tâm cách mép chữ `gap`×size, cao hơn baseline `dy`×size,
    //       bán kính giữa `midR`×size, dày nét `width`×size;
    //       side "after" = nằm sau chữ (bên phải trong hệ chữ) — Pickleball;
    //       "before" = trước chữ (bên trái) như Cầu lông/Tennis.
    rotate: -Math.PI / 2, // xoay 90° NGƯỢC chiều kim đồng hồ (đọc từ dưới lên)
  };
  const SIZE = 72, MAXL = 900; // cỡ chữ & chiều dài tối đa dùng chung (đo bằng sweep IoU với 7 ảnh mẫu)
  const TPL = {
    black:  { key: "black",  label: "Đen",          img: "assets/black.jpg",  size: SIZE, maxL: MAXL, baseX: 318, cy: 826 },
    red:    { key: "red",    label: "Đỏ",           img: "assets/red.jpg",    size: SIZE, maxL: MAXL, baseX: 343, cy: 958 },
    yellow: { key: "yellow", label: "Vàng",         img: "assets/yellow.jpg", size: SIZE, maxL: MAXL, baseX: 384, cy: 810 },
    mint:   { key: "mint",   label: "Xanh Bạc Hà",  img: "assets/mint.jpg",   size: SIZE, maxL: MAXL, baseX: 337, cy: 896 },
    green:  { key: "green",  label: "Xanh Lá",      img: "assets/green.jpg",  size: SIZE, maxL: MAXL, baseX: 329, cy: 968 },
    pink:   { key: "pink",   label: "Hồng",         img: "assets/pink.jpg",   size: SIZE, maxL: MAXL, baseX: 302, cy: 944 },
    orange: { key: "orange", label: "Cam",          img: "assets/orange.jpg", size: SIZE, maxL: MAXL, baseX: 320, cy: 927 },
  };
  const TPL_ORDER = ["black", "red", "yellow", "mint", "green", "pink", "orange"];
  // Mặc định theo tỷ lệ canvas khi chưa đo toạ độ (w,h = kích thước template)
  function tplCoords(t, w, h) {
    return {
      size: t.size != null ? t.size : Math.round(h * 0.06),
      baseX: t.baseX != null ? t.baseX : Math.round(w * 0.23),
      cy: t.cy != null ? t.cy : Math.round(h * 0.6),
      maxL: t.maxL != null ? t.maxL : Math.round(h * 0.47),
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
  const FONT_LEMONADA = "PICKLE-Lemonada";
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
    return {
      w,
      left: m.actualBoundingBoxLeft != null ? m.actualBoundingBoxLeft : w / 2,
      right: m.actualBoundingBoxRight != null ? m.actualBoundingBoxRight : w / 2,
    };
  }
  // Vẽ sticker trong HỆ TOẠ ĐỘ CHỮ (chữ nằm ngang, tâm chữ tại cx, baseline y):
  // (rim trắng nếu có) -> blob đỏ + vòng tròn đỏ -> chữ trắng
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
      x: S.ring.side === "after" ? cx + ink.right + S.ring.gap * size : cx - ink.left - S.ring.gap * size,
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
  // Vẽ sticker XOAY DỌC: baseline là đường thẳng đứng x = baseX, tâm chữ theo
  // chiều đọc tại y = cy. Sau khi rotate(-90°): trục đọc của chữ -> trục Y canvas
  // hướng LÊN (đọc từ dưới lên), đầu chữ (phía trên baseline) -> quay sang TRÁI,
  // vòng tròn (sau chữ) -> nằm TRÊN cùng.
  function drawStickerRotated(ctx, text, baseX, cy, size) {
    ctx.save();
    ctx.translate(baseX, cy);
    ctx.rotate(STICKER.rotate);
    drawSticker(ctx, text, 0, 0, size);
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
    // Thu nhỏ khi dài: tổng chiều dài = ring (đầu) + blob (2 đầu) + ink
    let size = base;
    const extraPerSize = STICKER.strokeR * 2 + (STICKER.ring.on ? (STICKER.ring.gap + STICKER.ring.midR + STICKER.ring.width / 2) : 0);
    const w0 = inkMetrics(ctx, txt, size).w + extraPerSize * size;
    if (w0 > C.maxL) size = Math.max(10, Math.floor(size * C.maxL / w0));
    const dx = (off && off.dx) || 0, dy = (off && off.dy) || 0;
    drawStickerRotated(ctx, txt, C.baseX + dx, C.cy + dy, size);
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
  // Variant thật (soi 27/08/2026):
  //   "Màu: Màu Xanh Bạc Hà, Phân loại: In tên"                 (Bóng Xoay Tròn – tiếng Việt)
  //   "Mẫu: Móc Khóa Clicky Pickleball - Mint, Phân loại: In tên" (Clicky – tiếng Anh)
  // Trả về key màu; màu có tên nhưng KHÔNG có mẫu (xanh dương, tím…) trả về
  // chuỗi "no-tpl:<tên>" để báo lý do rõ ràng; không đọc được -> null.
  function colorFromText(s) {
    const t = noAccent(s);
    if (/bac\s*ha|\bmint\b/.test(t)) return "mint";
    if (/xanh\s*la|\bgreen\b/.test(t)) return "green";
    if (/xanh\s*(duong|bien|nuoc)|\bblue\b|\bnavy\b/.test(t)) return "no-tpl:Xanh Dương";
    if (/\bden\b|\bblack\b/.test(t)) return "black";
    if (/\bdo\b|\bred\b/.test(t)) return "red";
    if (/\bvang\b|\byellow\b/.test(t)) return "yellow";
    if (/\bhong\b|\bpink\b/.test(t)) return "pink";
    if (/\bcam\b|\borange\b/.test(t)) return "orange";
    if (/\btim\b|\bpurple\b|\bviolet\b/.test(t)) return "no-tpl:Tím";
    if (/\btrang\b|\bwhite\b/.test(t)) return "no-tpl:Trắng";
    return null;
  }
  // Fulfillment SKU: P-3D-K04-{Black|Red|Yellow|Mint|Green|Pink|Orange}-N (Clicky)
  //                  P-3D-K08-{…}-N (Bóng Xoay Tròn) — có đơn để trống
  function colorFromSku(s) {
    const t = noAccent(s);
    const m = t.match(/[-_](black|red|yellow|mint|green|pink|orange)(?:[-_]|$)/);
    return m ? m[1] : null;
  }
  const hasTpl = (c) => !!(c && TPL[c]);
  // Item Pickleball: product_name "Móc Khóa 3D Clicky Pickleball" hoặc
  // "Móc Khoá Pickleball Bóng Xoay Tròn 3D" (đơn thật 6a7d39f5… #71244, 27/08/2026).
  // Nhận theo chữ "pickle" (bỏ dấu) — cả 2 SP cùng 1 output nên gom chung.
  const isPickleText = (s) => /pickle/.test(noAccent(s));

  // Quét các item Pickleball trên trang đơn (theo đúng thứ tự hiển thị).
  // rowIndex = vị trí trong danh sách TẤT CẢ media_row của trang (injected.js dùng để tìm đúng 2 nút Upload).
  function scanItems() {
    const rows = [...document.querySelectorAll('[class*="media_row"]')];
    const out = [];
    rows.forEach((row, i) => {
      const box = row.closest('[class*="item_container"]') || row.parentElement;
      if (!box) return;
      const raw = (box.innerText || "").replace(/\n/g, " | ");
      if (!isPickleText(raw)) return;
      const sku = (raw.match(/SKU ID:\s*([\w.-]+)/i) || [])[1] || "";
      // "Màu: Màu Đen" (Bóng Xoay Tròn) hoặc "Mẫu: Móc Khóa Clicky Pickleball - Black" (Clicky)
      const mauTxt = ((raw.match(/M(?:àu|ẫu|au)\s*:\s*([^,|]+)/i) || [])[1] || "").trim();
      let c = colorFromText(mauTxt);
      if (!hasTpl(c)) c = colorFromSku(raw) || c;
      if (!hasTpl(c) && !c) c = colorFromText(raw);
      out.push({ rowIndex: i, sku, mauTxt, color: hasTpl(c) ? c : "black", detected: hasTpl(c), colorNote: c && !hasTpl(c) ? c.replace(/^no-tpl:/, "") : "", name: "", sizePct: 100, dx: 0, dy: 0 });
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
  const OFF_MAX = 500;
  let els = null;
  const cur = () => state.items[state.active] || null;

  function buildModal() {
    const overlay = document.createElement("div");
    overlay.id = "pickle-overlay";
    overlay.innerHTML = `
      <div id="pickle-modal">
        <div class="pickle-head"><h2>🥒 Tạo Mockup &amp; Design – Móc Khoá Pickleball 3D</h2><button class="pickle-close" title="Đóng">×</button></div>
        <div class="pickle-body">
          <div class="pickle-left">
            <div id="pickle-warn" class="pickle-warn" style="display:none"></div>
            <div class="pickle-field"><label>Các item trong đơn (tên lấy theo thứ tự dòng của External note)</label>
              <div id="pickle-items" class="pickle-items"></div>
            </div>
            <div class="pickle-field"><label>Chỉnh chữ cho item đang chọn</label>
              <div class="pickle-rf-row"><span>Cỡ %</span><input type="number" id="pickle-size" class="pickle-num pickle-num-sm" min="40" max="200" step="5" value="100">
                <span>X</span><input type="number" id="pickle-tx" class="pickle-num pickle-num-sm" step="1" value="0">
                <span>Y</span><input type="number" id="pickle-ty" class="pickle-num pickle-num-sm" step="1" value="0">
                <button type="button" id="pickle-treset">Đặt lại</button></div>
              <div class="pickle-hint">Kéo thẳng trên ảnh preview để dời chữ · lăn chuột để đổi cỡ. Chữ xoay dọc (đọc từ dưới lên) bên trái móc khoá, luôn IN HOA, tên quá dài tự thu nhỏ.</div>
            </div>
          </div>
          <div class="pickle-right"><div class="pickle-previews">
            <div class="pickle-pv"><div class="pickle-pv-title" id="pickle-pv-label">Mockup</div>
              <canvas id="pickle-pv-mock" class="pickle-draggable"></canvas></div>
            <div class="pickle-pv"><div class="pickle-pv-title">Design (1254×1254) · nền trắng, chữ đen Arial Bold</div>
              <canvas id="pickle-pv-design"></canvas></div>
          </div></div>
          <div id="pickle-status" class="info"></div>
          <div class="pickle-actions">
            <button class="pickle-btn-dl" id="pickle-dl">⬇ Tải PNG (tất cả)</button>
            <button class="pickle-btn-fill" id="pickle-fill">✅ Điền vào Mockup &amp; Design</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const $ = (s) => overlay.querySelector(s);
    els = {
      overlay, warn: $("#pickle-warn"), list: $("#pickle-items"), size: $("#pickle-size"),
      tx: $("#pickle-tx"), ty: $("#pickle-ty"), tReset: $("#pickle-treset"), pvLabel: $("#pickle-pv-label"),
      pvMock: $("#pickle-pv-mock"), pvDesign: $("#pickle-pv-design"), status: $("#pickle-status"),
      btnDl: $("#pickle-dl"), btnFill: $("#pickle-fill"),
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
    $(".pickle-close").onclick = closeModal;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    els.btnDl.onclick = doDownload; els.btnFill.onclick = doFill;

    let drag = null;
    els.pvMock.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; els.pvMock.setPointerCapture(e.pointerId); els.pvMock.classList.add("pickle-grabbing"); });
    els.pvMock.addEventListener("pointermove", (e) => {
      if (!drag) return; const it = cur(); if (!it) return;
      const r = els.pvMock.getBoundingClientRect();
      it.dx = clamp(it.dx + (e.clientX - drag.x) / r.width * els.pvMock.width, -OFF_MAX, OFF_MAX);
      it.dy = clamp(it.dy + (e.clientY - drag.y) / r.height * els.pvMock.height, -OFF_MAX, OFF_MAX);
      drag.x = e.clientX; drag.y = e.clientY; syncTools(); schedule();
    });
    const end = () => { if (drag) { drag = null; els.pvMock.classList.remove("pickle-grabbing"); } };
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
      card.className = "pickle-item" + (i === state.active ? " sel" : "") + (it.name ? "" : " empty");
      const tk = it.detected ? "Màu: " + TPL[it.color].label : (it.colorNote ? `không có mẫu màu ${it.colorNote}` : "không đọc được Màu");
      card.innerHTML = `
        <div class="pickle-item-head">
          <b>Item ${i + 1}</b>
          <span class="pickle-item-tk ${it.detected ? "ok" : "err"}">${tk}</span>
          <span class="pickle-item-sku">${it.sku || ""}</span>
        </div>
        <div class="pickle-item-row">
          <input class="pickle-item-name" type="text" placeholder="Tên khách…" value="">
          <select class="pickle-item-color">${TPL_ORDER.map((k) => `<option value="${k}">${TPL[k].label}</option>`).join("")}</select>
        </div>`;
      const input = card.querySelector(".pickle-item-name");
      input.value = it.name || "";
      input.addEventListener("input", () => { it.name = input.value; card.classList.toggle("empty", !it.name); refreshWarn(); if (i === state.active) schedule(); });
      input.addEventListener("focus", () => select(i));
      const sel = card.querySelector(".pickle-item-color");
      sel.value = it.color;
      sel.addEventListener("change", (e) => { e.stopPropagation(); it.color = sel.value; it.detected = true; it.colorNote = ""; renderItemList(); select(i); schedule(); });
      sel.addEventListener("focus", () => select(i));
      card.addEventListener("click", () => select(i));
      els.list.appendChild(card);
    });
    if (!state.items.length) els.list.innerHTML = '<div class="pickle-hint">Không thấy item Móc Khoá Pickleball nào trên trang này.</div>';
  }
  function select(i) {
    if (i === state.active) { syncTools(); return; }
    state.active = i;
    els.list.querySelectorAll(".pickle-item").forEach((c, k) => c.classList.toggle("sel", k === i));
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
    if (n && m && m !== n) msgs.push(`⚠️ External note có ${m} dòng tên nhưng đơn có ${n} item Pickleball — kiểm tra lại rồi điền tay cho khớp.`);
    if (missing) msgs.push(`⚠️ Còn ${missing} item chưa có tên.`);
    const bad = state.items.filter((i) => !i.detected).length;
    if (bad) msgs.push(`⚠️ ${bad} item không đọc được mục “Màu” hoặc màu chưa có mẫu — chọn màu bên dưới.`);
    els.warn.innerHTML = msgs.join("<br>");
    els.warn.style.display = msgs.length ? "block" : "none";
  }
  function setStatus(msg, cls) { if (els) { els.status.textContent = msg || ""; els.status.className = cls || "info"; } }
  function toast(msg, cls) {
    let t = document.getElementById("pickle-toast");
    if (!t) { t = document.createElement("div"); t.id = "pickle-toast"; document.body.appendChild(t); }
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
    const mock = await canvasToFile(await renderMockup(document.createElement("canvas"), it.color, it.name, { dx: it.dx, dy: it.dy }, it.sizePct / 100), `mockup-pickle-${tag}.png`);
    const des = await canvasToFile(await renderDesign(document.createElement("canvas"), it.name), `design-pickle-${tag}.png`);
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
        if (ev.data.__pickle === "progress") { // còn chạy -> gia hạn chờ
          const st = ev.data.step ? ` – ${ev.data.step}` : "";
          toast(`⏳ Đang điền ${Math.min(ev.data.done + 1, ev.data.total)}/${ev.data.total} · ${ev.data.label || ""}${st}…`, "info");
          clearTimeout(tm); tm = setTimeout(done, timeout || 15000);
          return;
        }
        if (ev.data.__pickle === "result") done(ev.data);
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
      window.postMessage({ __pickle: "fill", items: payload }, "*");
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
    let btn = document.getElementById("pickle-open-btn");
    if (!onOrder) { if (btn) btn.remove(); return; }
    if (btn) return;
    btn = document.createElement("button"); btn.id = "pickle-open-btn"; btn.type = "button";
    btn.innerHTML = "🥒 Tạo Mockup Pickleball";
    btn.title = "Lấy tên ở External note + mẫu theo Màu của từng item";
    btn.onclick = openModal; document.body.appendChild(btn);
  }
  new MutationObserver(() => ensureButton()).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(ensureButton, 1500); ensureButton(); loadFonts();

  /* ---------------- API cho luồng tự động (auto.js) ---------------- */
  window.__PICKLE_API__ = {
    loadFonts, renderMockup, renderDesign, canvasToFile, loadBitmap,
    noteNames, cleanName, colorFromText, colorFromSku, hasTpl, isPickleText, noAccent,
    TPL, TPL_ORDER, DESIGN, STICKER,
  };
})();
