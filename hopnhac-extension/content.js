/* =========================================================================
   Hộp Nhạc – Tạo Mockup & Design (cendo.work)
   Logic mới: đọc mã "Cá nhân hóa: MBxx" -> tự chọn 1 trong 5 layout + font.
   External note 3 dòng: lời chúc / tên / ngày.
   ========================================================================= */
(() => {
  "use strict";
  if (window.__HN_LOADED__) return;
  window.__HN_LOADED__ = true;

  const EXT = (p) => chrome.runtime.getURL(p);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* --------------------------- Template hộp --------------------------- */
  const TPL = {
    gomoc: {
      name: "Gỗ mộc", img: "assets/mockup-gomoc.png", natW: 640, natH: 637,
      quad: [[99, 225], [272, 225], [272, 384], [98, 384]], // khung ảnh khách
      lidBox: [352, 104, 592, 344],                         // vùng khắc (vuông) trên nắp
      inkColor: "#2a1e12",
    },
    occho: {
      name: "Nâu óc chó", img: "assets/mockup-occho.png", natW: 641, natH: 638,
      quad: [[133, 279], [292, 279], [298, 437], [140, 437]],
      lidBox: [382, 66, 618, 302],
      inkColor: "#140e0a",
    },
  };
  const MOCK = 1000;

  const DESIGN = {
    w: 1500, h: 2492, bg: null /* null = nền trong suốt; đặt mã màu (vd "#2a2e3a") nếu muốn nền đặc */, inkColor: "#12141b",
    // Khổ 12.7 × 21.1 cm @300dpi = 1500 × 2492 px  (1 cm = 118.11 px)
    // Khung khắc (khung đỏ): X 1.16 · Y 1.16 · W 10.38 · H 9.54 cm
    layoutBox: [137, 137, 1363, 1264],
    // Mica 3mm (khung bo góc phía dưới) – theo file mẫu 1078 × 944 px (~9.13 × 7.99 cm), bo góc ~100 px, canh giữa ngang
    photoBox: [211, 1509, 1289, 2453],
    photoRadius: 100,
  };

  /* ------------------------------ Fonts ------------------------------ */
  const FONT = { med: "HN-Med", ita: "HN-MedIt", script: "HN-Script" };
  const MB = {
    MB01: { label: "Happy Birthday to [tên]", font: FONT.med, draw: "mb01" },
    MB02: { label: "[tên] & [tên] / ngày", font: FONT.med, draw: "mb02" },
    MB03: { label: "Happy Birthday! / [tên] / ngày", font: FONT.ita, draw: "mb03" },
    MB04: { label: "SAVE the DATE", font: FONT.med, draw: "mb04" },
    MB05: { label: "Happy Birthday / [tên] / ngày (script)", font: FONT.script, draw: "mb05" },
  };

  let fontsReady = null;
  function loadFonts() {
    if (fontsReady) return fontsReady;
    const faces = [
      new FontFace(FONT.med, `url(${EXT("assets/BeautiqueDisplay-Medium.otf")})`),
      new FontFace(FONT.ita, `url(${EXT("assets/BeautiqueDisplay-MediumItalic.otf")})`),
      new FontFace(FONT.script, `url(${EXT("assets/MTD-Great-Vibes.otf")})`),
    ];
    fontsReady = Promise.all(faces.map((f) => f.load())).then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
    });
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
  function findAttachmentUrls() {
    const a = [...document.querySelectorAll('[class*="attachments_inner"] a[href]')].map((x) => x.href);
    if (a.length) return a;
    return [...document.querySelectorAll('[class*="attachments_inner"] img[src]')].map((x) => x.src);
  }
  // độ bão hoà trung bình (ảnh thật nhiều màu > thẻ reference đen trắng)
  function meanSaturation(bm) {
    const c = document.createElement("canvas"); c.width = 40; c.height = 40;
    const x = c.getContext("2d"); x.drawImage(bm, 0, 0, 40, 40);
    const d = x.getImageData(0, 0, 40, 40).data; let s = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      s += mx === 0 ? 0 : (mx - mn) / mx; n++;
    }
    return s / n;
  }

  /* --------------------- Phối cảnh + cắt ảnh --------------------- */
  function bilerp(q, u, v) {
    const [tl, tr, br, bl] = q;
    const tx = tl[0] + (tr[0] - tl[0]) * u, ty = tl[1] + (tr[1] - tl[1]) * u;
    const bx = bl[0] + (br[0] - bl[0]) * u, by = bl[1] + (br[1] - bl[1]) * u;
    return [tx + (bx - tx) * v, ty + (by - ty) * v];
  }
  function expandTri(p0, p1, p2, k) {
    const cx = (p0[0] + p1[0] + p2[0]) / 3, cy = (p0[1] + p1[1] + p2[1]) / 3;
    const ex = (p) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * k, p[1] + dy / l * k]; };
    return [ex(p0), ex(p1), ex(p2)];
  }
  function drawTri(ctx, img, s0, s1, s2, d0, d1, d2) {
    const [e0, e1, e2] = expandTri(d0, d1, d2, 0.7);
    ctx.save(); ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.clip();
    const x0 = s0[0], y0 = s0[1], x1 = s1[0], y1 = s1[1], x2 = s2[0], y2 = s2[1];
    const u0 = d0[0], v0 = d0[1], u1 = d1[0], v1 = d1[1], u2 = d2[0], v2 = d2[1];
    const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0) || 1e-6;
    const a = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / den;
    const b = ((u2 - u0) * (x1 - x0) - (u1 - u0) * (x2 - x0)) / den;
    const c = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) / den;
    const d = ((v2 - v0) * (x1 - x0) - (v1 - v0) * (x2 - x0)) / den;
    ctx.setTransform(a, c, b, d, u0 - a * x0 - b * y0, v0 - c * x0 - d * y0);
    ctx.drawImage(img, 0, 0); ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function drawImageQuad(ctx, img, quad, grid = 16) {
    const iw = img.width, ih = img.height;
    for (let i = 0; i < grid; i++) for (let j = 0; j < grid; j++) {
      const u0 = i / grid, u1 = (i + 1) / grid, v0 = j / grid, v1 = (j + 1) / grid;
      const d00 = bilerp(quad, u0, v0), d10 = bilerp(quad, u1, v0), d11 = bilerp(quad, u1, v1), d01 = bilerp(quad, u0, v1);
      drawTri(ctx, img, [u0 * iw, v0 * ih], [u1 * iw, v0 * ih], [u1 * iw, v1 * ih], d00, d10, d11);
      drawTri(ctx, img, [u0 * iw, v0 * ih], [u1 * iw, v1 * ih], [u0 * iw, v1 * ih], d00, d11, d01);
    }
  }
  function quadAspect(q) {
    const w = (Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) + Math.hypot(q[2][0] - q[3][0], q[2][1] - q[3][1])) / 2;
    const h = (Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1]) + Math.hypot(q[2][0] - q[1][0], q[2][1] - q[1][1])) / 2;
    return w / h;
  }
  function cropCanvas(img, aspect, rf) {
    rf = rf || {};
    const iw = img.width, ih = img.height, ia = iw / ih;
    let bw, bh; if (ia > aspect) { bh = ih; bw = ih * aspect; } else { bw = iw; bh = iw / aspect; }
    const scale = Math.max(1, rf.scale || 1), cw = bw / scale, ch = bh / scale;
    const sx = Math.max(0, iw - cw) * clamp(rf.offX == null ? 0.5 : rf.offX, 0, 1);
    const sy = Math.max(0, ih - ch) * clamp(rf.offY == null ? 0 : rf.offY, 0, 1);
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(cw)); c.height = Math.max(1, Math.round(ch));
    c.getContext("2d").drawImage(img, sx, sy, cw, ch, 0, 0, c.width, c.height); return c;
  }
  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawPhotoCover(ctx, img, bx, by, bw, bh, radius, rf) {
    const cropped = cropCanvas(img, bw / bh, rf);
    ctx.save(); roundRectPath(ctx, bx, by, bw, bh, radius); ctx.clip();
    ctx.drawImage(cropped, bx, by, bw, bh); ctx.restore();
  }

  /* ============================ LAYOUTS ============================ */
  const SQ = 820;
  const FIT_W = SQ * 0.96; // chữ dài tự thu nhỏ để không tràn/cắt mép ô khắc
  function fitSize(ctx, text, fam, sz, maxW) {
    ctx.font = `${sz}px "${fam}"`;
    const met = ctx.measureText(text);
    // dùng actualBoundingBox nếu có (font nghiêng/script tràn hơn met.width)
    const w = (met.actualBoundingBoxLeft != null && met.actualBoundingBoxRight != null)
      ? Math.max(met.width, met.actualBoundingBoxLeft + met.actualBoundingBoxRight) : met.width;
    return w > maxW ? Math.max(10, Math.floor(sz * maxW / w)) : sz;
  }
  function centeredLines(ctx, lines, cy) {
    lines = lines.filter((l) => l.t && String(l.t).trim());
    const m = lines.map((l) => {
      const sz = fitSize(ctx, l.t, l.fam, l.sz, FIT_W);
      return { ...l, sz, lh: sz * 1.15 };
    });
    let total = 0; m.forEach((l) => { total += l.lh; });
    let y = cy - total / 2;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const l of m) { ctx.font = `${l.sz}px "${l.fam}"`; ctx.fillText(l.t, SQ / 2, y + l.lh / 2); y += l.lh; }
  }
  const CY = SQ * 0.40; // canh giữa lệch lên để bớt khoảng trống phía trên nắp
  const LAYOUTS = {
    mb05(ctx, p) {
      centeredLines(ctx, [{ t: p.greet, fam: FONT.script, sz: 96 }, { t: p.name, fam: FONT.script, sz: 120 }, { t: p.date, fam: FONT.script, sz: 86 }], CY);
    },
    mb03(ctx, p) {
      centeredLines(ctx, [{ t: p.greet, fam: FONT.ita, sz: 78 }, { t: p.name, fam: FONT.ita, sz: 132 }, { t: p.date, fam: FONT.ita, sz: 78 }], CY);
    },
    mb02(ctx, p) {
      const parts = p.name.split("&").map((s) => s.trim()).filter(Boolean);
      const lines = [{ t: p.greet, fam: FONT.med, sz: 74 }]; // lời chúc (bỏ qua nếu trống)
      if (parts.length === 2) lines.push({ t: parts[0], fam: FONT.med, sz: 116 }, { t: "&", fam: FONT.med, sz: 68 }, { t: parts[1], fam: FONT.med, sz: 116 });
      else lines.push({ t: p.name, fam: FONT.med, sz: 116 });
      if (p.date) lines.push({ t: p.date, fam: FONT.med, sz: 64 });
      centeredLines(ctx, lines, CY);
    },
    mb01(ctx, p) {
      let g = (p.greet || "").trim(), smallTo = "";
      if (/\bto$/i.test(g)) { smallTo = g.slice(-2); g = g.slice(0, -2).trim(); }
      const lines = g.split(/\s+/).filter(Boolean).map((w) => ({ t: w, fam: FONT.med, sz: 86 }));
      if (smallTo) lines.push({ t: smallTo, fam: FONT.med, sz: 56 });
      lines.push({ t: p.name, fam: FONT.med, sz: 122 });
      if (p.date) lines.push({ t: p.date, fam: FONT.med, sz: 62 }); // ngày (bỏ qua nếu trống)
      centeredLines(ctx, lines, CY);
    },
    mb04(ctx, p) {
      // Khớp theo ảnh mẫu khắc thật (quy về ô 820): SAVE to, "the" nghiêng nhỏ, DATE, ngày xếp dọc bên phải, tên dưới cùng.
      ctx.textBaseline = "middle"; ctx.textAlign = "left";
      ctx.font = `190px "${FONT.med}"`; ctx.fillText("SAVE", 88, 240);
      ctx.font = `70px "${FONT.ita}"`; ctx.fillText("the", 86, 420);
      ctx.font = `132px "${FONT.med}"`; ctx.fillText("DATE", 200, 398);
      // Ngày: chấp nhận 19.09.23 · 19/09/23 · 19-09-23 · 19 09 2023 · 19/09/2023 -> 19 / 09 / 23
      const dd = parseDateParts(p.date);
      if (dd) {
        ctx.font = `100px "${FONT.med}"`;
        const cy = [190, 305, 420];
        dd.forEach((v, i) => ctx.fillText(v, 632, cy[i]));
      }
      // tên: cỡ 120 nhưng tự thu nếu quá dài
      let nsz = 120; ctx.font = `${nsz}px "${FONT.med}"`;
      const w = ctx.measureText(p.name || "").width, maxW = 740;
      if (w > maxW) nsz = Math.floor(nsz * maxW / w);
      ctx.textAlign = "center"; ctx.font = `${nsz}px "${FONT.med}"`;
      ctx.fillText(p.name || "", SQ / 2, 600);
    },
  };
  function renderLayoutSquare(code, parts, color) {
    const c = document.createElement("canvas"); c.width = SQ; c.height = SQ;
    const ctx = c.getContext("2d"); ctx.fillStyle = color;
    const fn = LAYOUTS[(MB[code] || MB.MB05).draw];
    fn(ctx, parts);
    return c;
  }
  function drawLayoutInto(ctx, code, parts, box, color, sizeScale) {
    const sq = renderLayoutSquare(code, parts, color);
    const [x0, y0, x1, y1] = box, bw = x1 - x0, bh = y1 - y0;
    const side = Math.min(bw, bh) * (sizeScale || 1);
    ctx.drawImage(sq, x0 + (bw - side) / 2, y0 + (bh - side) / 2, side, side);
  }
  // "19.09.23" | "19/09/23" | "19-09-23" | "19 09 2023" | "19/9/2023" -> ["19","09","23"]; không đủ 3 phần -> null
  function parseDateParts(s) {
    const m = String(s || "").match(/\d+/g);
    if (!m || m.length < 3) return null;
    const pad = (v) => (v.length === 1 ? "0" + v : v);
    return [pad(m[0]), pad(m[1]), m[2].slice(-2)];
  }
  function parseNote(note) {
    const L = String(note || "").replace(/\r/g, "").split("\n").map((s) => s.trim());
    return { greet: L[0] || "", name: L[1] || "", date: L[2] || "" };
  }

  /* --------------------------- Render --------------------------- */
  // textOff = {dx, dy}: dịch chữ khắc trên nắp (pixel theo canvas 1000×1000)
  async function renderMockup(canvas, tplKey, code, note, photo, rf, sizeScale, textOff) {
    const t = TPL[tplKey]; canvas.width = MOCK; canvas.height = MOCK;
    const ctx = canvas.getContext("2d");
    const tpl = await loadExtBitmap(t.img);
    ctx.clearRect(0, 0, MOCK, MOCK); ctx.drawImage(tpl, 0, 0, MOCK, MOCK);
    const sx = MOCK / t.natW, sy = MOCK / t.natH;
    const quad = t.quad.map(([x, y]) => [x * sx, y * sy]);
    if (photo) drawImageQuad(ctx, cropCanvas(photo, quadAspect(quad), rf), quad, 16);
    const dx = (textOff && textOff.dx) || 0, dy = (textOff && textOff.dy) || 0;
    const box = [t.lidBox[0] * sx + dx, t.lidBox[1] * sy + dy, t.lidBox[2] * sx + dx, t.lidBox[3] * sy + dy];
    drawLayoutInto(ctx, code, parseNote(note), box, t.inkColor, sizeScale);
    return canvas;
  }
  async function renderDesign(canvas, code, note, photo, rf, sizeScale) {
    canvas.width = DESIGN.w; canvas.height = DESIGN.h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, DESIGN.w, DESIGN.h); // nền trong suốt (PNG có alpha)
    if (DESIGN.bg) { ctx.fillStyle = DESIGN.bg; ctx.fillRect(0, 0, DESIGN.w, DESIGN.h); }
    drawLayoutInto(ctx, code, parseNote(note), DESIGN.layoutBox, DESIGN.inkColor, sizeScale);
    if (photo) { const [bx, by, bx1, by1] = DESIGN.photoBox; drawPhotoCover(ctx, photo, bx, by, bx1 - bx, by1 - by, DESIGN.photoRadius, rf); }
    return canvas;
  }
  const sizeScale = () => (state.fontSize || SIZE_BASE) / SIZE_BASE;
  function canvasToFile(canvas, name) {
    return new Promise((r) => canvas.toBlob((b) => r(new File([b], name, { type: "image/png" })), "image/png"));
  }

  /* ---------------------- Nhận diện đơn ---------------------- */
  function detectColor() {
    const txt = document.body.innerText || "";
    if (/óc\s*ch/i.test(txt) || /-WN-/.test(txt)) return "occho";
    return "gomoc";
  }
  function detectMB() {
    const txt = document.body.innerText || "";
    let m = txt.match(/Cá\s*nhân\s*hóa:\s*(MB\d{2})/i) || txt.match(/-(MB\d{2})\b/);
    const code = m ? m[1].toUpperCase() : null;
    return MB[code] ? code : null;
  }
  function orderId() {
    const m = location.pathname.match(/orders?\/([\w-]+)/i);
    return m ? m[1].slice(0, 12) : "order";
  }
  function cleanNote(s) {
    return String(s || "").replace(/\r/g, "").split("\n").map((l) => l.trim()).filter((l) => l.length).join("\n").trim();
  }
  function getExternalNote() {
    const val = document.querySelector('[class*="external_note"]');
    if (val && val.innerText && val.innerText.trim()) return cleanNote(val.innerText);
    const cont = document.querySelector('[class*="external_container"]');
    if (cont) { const t = (cont.innerText || "").replace(/external note/i, ""); if (t.trim()) return cleanNote(t); }
    return "";
  }

  /* ============================== UI ============================== */
  const state = {
    color: "gomoc", mb: null, note: "", attachs: null, photoIdx: null, photoKey: null,
    scale: 1, offX: 0.5, offY: 0, orderKey: null, fontSize: 25,
    textDX: 0, textDY: 0,      // vị trí chữ khắc trên nắp (px, canvas 1000)
    dragMode: "photo",         // "photo" = kéo ảnh khách · "text" = kéo chữ khắc
  };
  const TEXT_OFF_MAX = 250; // giới hạn dịch chữ (px)
  const textOff = () => ({ dx: state.textDX, dy: state.textDY });
  const SIZE_BASE = 25; // cỡ chữ mặc định (scale = fontSize / SIZE_BASE)
  const MB_SIZE = { MB05: 30 }; // cỡ mặc định riêng theo kiểu MB (còn lại dùng SIZE_BASE = 25)
  const defaultSize = (code) => MB_SIZE[code] || SIZE_BASE;
  const rf = () => ({ scale: state.scale, offX: state.offX, offY: state.offY });
  const curPhoto = () => (state.attachs && state.photoIdx != null ? state.attachs[state.photoIdx].bm : null);
  let els = null;

  function buildModal() {
    const overlay = document.createElement("div");
    overlay.id = "hn-overlay";
    overlay.innerHTML = `
      <div id="hn-modal">
        <div class="hn-head"><h2>🎵 Tạo Mockup &amp; Design – Hộp Nhạc</h2><button class="hn-close" title="Đóng">×</button></div>
        <div class="hn-body">
          <div class="hn-left">
            <div class="hn-field"><label>Kiểu (tự nhận theo mã MB)</label>
              <div id="hn-mb" class="hn-mb"></div>
              <div class="hn-seg" id="hn-seg-mb"></div>
            </div>
            <div class="hn-field"><label>Màu hộp</label><div class="hn-seg" id="hn-seg-color"></div></div>
            <div class="hn-field"><label>Nội dung (dòng 1: lời chúc · dòng 2: tên · dòng 3: ngày)</label>
              <textarea id="hn-text" placeholder="Happy Birthday&#10;Ngọc Hà&#10;23/09/1999"></textarea>
            </div>
            <div class="hn-field"><label>Cỡ chữ khắc (mặc định 25 · MB05: 30)</label>
              <input type="number" id="hn-size" class="hn-num" min="10" max="60" step="1" value="25">
            </div>
            <div class="hn-field"><label>Ảnh khách (chọn ảnh để ghép)</label><div class="hn-attach" id="hn-attach"></div></div>
          </div>
          <div class="hn-right"><div class="hn-previews">
            <div class="hn-pv"><div class="hn-pv-title">Mockup (1000×1000)</div>
              <canvas id="hn-pv-mock" class="hn-draggable"></canvas>
              <div class="hn-reframe">
                <div class="hn-rf-row"><span>Kéo chuột để chỉnh:</span>
                  <div class="hn-seg hn-seg-mini" id="hn-seg-drag"></div></div>
                <span class="hn-rf-hint" id="hn-rf-hint">Kéo ảnh để chỉnh · lăn chuột để zoom</span>
                <div class="hn-rf-row" id="hn-row-photo"><span>Zoom</span><input type="range" id="hn-zoom" min="1" max="3" step="0.02" value="1"><button type="button" id="hn-reset">Đặt lại</button></div>
                <div class="hn-rf-row" id="hn-row-text" style="display:none"><span>Chữ X</span><input type="number" id="hn-tx" class="hn-num hn-num-sm" step="1" value="0"><span>Y</span><input type="number" id="hn-ty" class="hn-num hn-num-sm" step="1" value="0"><button type="button" id="hn-treset">Đặt lại</button></div>
              </div></div>
            <div class="hn-pv"><div class="hn-pv-title">Design (1500×2492) · PNG nền trong suốt (nền tối chỉ để xem)</div><canvas id="hn-pv-design"></canvas></div>
          </div></div>
          <div id="hn-status" class="info"></div>
          <div class="hn-actions"><button class="hn-btn-dl" id="hn-dl">⬇ Tải PNG</button><button class="hn-btn-fill" id="hn-fill">✅ Điền vào Mockup &amp; Design</button></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const $ = (s) => overlay.querySelector(s);
    els = {
      overlay, mbLabel: $("#hn-mb"), segMB: $("#hn-seg-mb"), segColor: $("#hn-seg-color"),
      text: $("#hn-text"), attach: $("#hn-attach"), pvMock: $("#hn-pv-mock"), pvDesign: $("#hn-pv-design"),
      status: $("#hn-status"), btnDl: $("#hn-dl"), btnFill: $("#hn-fill"), zoom: $("#hn-zoom"), reset: $("#hn-reset"),
      sizeInput: $("#hn-size"),
      segDrag: $("#hn-seg-drag"), rfHint: $("#hn-rf-hint"), rowPhoto: $("#hn-row-photo"), rowText: $("#hn-row-text"),
      tx: $("#hn-tx"), ty: $("#hn-ty"), tReset: $("#hn-treset"),
    };
    // chế độ kéo: ảnh khách / chữ khắc
    [["photo", "🖼 Ảnh khách"], ["text", "✒ Chữ khắc"]].forEach(([val, lbl]) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = lbl; b.dataset.val = val;
      b.onclick = () => { state.dragMode = val; refreshDragMode(); };
      els.segDrag.appendChild(b);
    });
    const onTextInput = () => {
      state.textDX = clamp(parseFloat(els.tx.value) || 0, -TEXT_OFF_MAX, TEXT_OFF_MAX);
      state.textDY = clamp(parseFloat(els.ty.value) || 0, -TEXT_OFF_MAX, TEXT_OFF_MAX);
      scheduleMock();
    };
    els.tx.addEventListener("input", onTextInput); els.ty.addEventListener("input", onTextInput);
    els.tReset.onclick = () => { state.textDX = 0; state.textDY = 0; syncTextInputs(); scheduleMock(); };
    // override MB (nếu nhận sai)
    Object.keys(MB).forEach((code) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = code; b.dataset.val = code;
      b.onclick = () => { state.mb = code; state.fontSize = defaultSize(code); if (els.sizeInput) els.sizeInput.value = String(state.fontSize); refreshSeg(); schedule(); };
      els.segMB.appendChild(b);
    });
    [["gomoc", "Gỗ mộc"], ["occho", "Nâu óc chó"]].forEach(([val, lbl]) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = lbl; b.dataset.val = val;
      b.onclick = () => { state.color = val; refreshSeg(); schedule(); };
      els.segColor.appendChild(b);
    });
    els.text.value = state.note;
    els.text.addEventListener("input", () => { state.note = els.text.value; schedule(); });
    els.sizeInput.value = String(state.fontSize);
    els.sizeInput.addEventListener("input", () => { state.fontSize = parseFloat(els.sizeInput.value) || SIZE_BASE; schedule(); });
    $(".hn-close").onclick = closeModal;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    els.btnDl.onclick = doDownload; els.btnFill.onclick = doFill;
    els.zoom.addEventListener("input", () => { state.scale = parseFloat(els.zoom.value) || 1; scheduleMock(); });
    els.reset.onclick = () => { applyFocus().then(scheduleMock); };
    let drag = null;
    els.pvMock.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; els.pvMock.setPointerCapture(e.pointerId); els.pvMock.classList.add("hn-grabbing"); });
    els.pvMock.addEventListener("pointermove", (e) => {
      if (!drag) return; const r = els.pvMock.getBoundingClientRect();
      if (state.dragMode === "text") {
        // dịch chữ theo đúng khoảng chuột (quy về px canvas 1000)
        state.textDX = clamp(state.textDX + (e.clientX - drag.x) / r.width * MOCK, -TEXT_OFF_MAX, TEXT_OFF_MAX);
        state.textDY = clamp(state.textDY + (e.clientY - drag.y) / r.height * MOCK, -TEXT_OFF_MAX, TEXT_OFF_MAX);
        syncTextInputs();
      } else {
        state.offX = clamp(state.offX - (e.clientX - drag.x) / r.width * 1.6, 0, 1);
        state.offY = clamp(state.offY - (e.clientY - drag.y) / r.height * 1.6, 0, 1);
      }
      drag.x = e.clientX; drag.y = e.clientY; scheduleMock();
    });
    const end = () => { if (drag) { drag = null; els.pvMock.classList.remove("hn-grabbing"); } };
    els.pvMock.addEventListener("pointerup", end); els.pvMock.addEventListener("pointercancel", end);
    els.pvMock.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (state.dragMode === "text") {
        // lăn chuột ở chế độ chữ = tăng/giảm cỡ chữ
        state.fontSize = clamp((state.fontSize || SIZE_BASE) + (e.deltaY < 0 ? 1 : -1), 10, 60);
        els.sizeInput.value = String(state.fontSize); schedule();
      } else {
        state.scale = clamp(state.scale + (e.deltaY < 0 ? 0.1 : -0.1), 1, 3); els.zoom.value = String(state.scale); scheduleMock();
      }
    }, { passive: false });
    return overlay;
  }
  function syncTextInputs() {
    if (!els || !els.tx) return;
    els.tx.value = String(Math.round(state.textDX)); els.ty.value = String(Math.round(state.textDY));
  }
  function refreshDragMode() {
    if (!els || !els.segDrag) return;
    const isText = state.dragMode === "text";
    els.segDrag.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.val === state.dragMode));
    els.rowPhoto.style.display = isText ? "none" : ""; els.rowText.style.display = isText ? "" : "none";
    els.rfHint.textContent = isText ? "Kéo để dời chữ khắc trên nắp · lăn chuột để đổi cỡ chữ" : "Kéo ảnh để chỉnh · lăn chuột để zoom";
    els.pvMock.classList.toggle("hn-textmode", isText);
    syncTextInputs();
  }

  function refreshSeg() {
    if (els.mbLabel) {
      const meta = MB[state.mb];
      els.mbLabel.textContent = state.mb ? `${state.mb} — ${meta.label}` : "Không nhận diện được mã MB — hãy chọn bên dưới";
      els.mbLabel.className = "hn-mb" + (state.mb ? " ok" : " err");
    }
    els.segMB.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.val === state.mb));
    els.segColor.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.val === state.color));
  }
  function renderAttachThumbs() {
    els.attach.innerHTML = "";
    if (!state.attachs || !state.attachs.length) { els.attach.innerHTML = '<span class="hn-attach-txt">Không có ảnh trong Attachments</span>'; return; }
    state.attachs.forEach((a, i) => {
      const im = document.createElement("img"); im.src = a.url; im.className = "hn-thumb" + (i === state.photoIdx ? " sel" : "");
      im.title = "Chọn làm ảnh ghép"; im.onclick = () => { state.photoIdx = i; applyFocus().then(() => { renderAttachThumbs(); schedule(); }); };
      els.attach.appendChild(im);
    });
  }
  function setStatus(msg, cls) { els.status.textContent = msg || ""; els.status.className = cls || "info"; }
  function toast(msg, cls) {
    let t = document.getElementById("hn-toast");
    if (!t) { t = document.createElement("div"); t.id = "hn-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.className = cls || "info"; t.style.opacity = "1";
    clearTimeout(t._timer); t._timer = setTimeout(() => { t.style.opacity = "0"; }, 4500);
  }

  let renderTimer = null;
  function schedule() { clearTimeout(renderTimer); renderTimer = setTimeout(renderPreviews, 200); }
  let rendering = false, pending = false;
  async function renderPreviews() {
    if (rendering) { pending = true; return; }
    rendering = true;
    try {
      await fontsReady;
      await renderMockup(els.pvMock, state.color, state.mb || "MB05", state.note, curPhoto(), rf(), sizeScale(), textOff());
      await renderDesign(els.pvDesign, state.mb || "MB05", state.note, curPhoto(), rf(), sizeScale());
    } catch (e) { setStatus("Lỗi render: " + e.message, "err"); }
    rendering = false; if (pending) { pending = false; renderPreviews(); }
  }
  let mockRaf = 0;
  function scheduleMock() {
    if (mockRaf) return;
    mockRaf = requestAnimationFrame(async () => {
      mockRaf = 0;
      try {
        await fontsReady;
        await renderMockup(els.pvMock, state.color, state.mb || "MB05", state.note, curPhoto(), rf(), sizeScale(), textOff());
        await renderDesign(els.pvDesign, state.mb || "MB05", state.note, curPhoto(), rf(), sizeScale());
      } catch (e) {}
    });
  }

  async function ensurePhotos() {
    const urls = findAttachmentUrls();
    const key = urls.join("|");
    if (state.photoKey === key && state.attachs) return;
    state.photoKey = key;
    if (!urls.length) { state.attachs = []; renderAttachThumbs(); return; }
    state.attachs = await Promise.all(urls.map(async (u) => {
      try { const bm = await loadBitmap(u); return { url: u, bm, sat: meanSaturation(bm) }; }
      catch (e) { return { url: u, bm: null, sat: -1 }; }
    }));
    // mặc định chọn ảnh nhiều màu nhất (ảnh khách) thay vì thẻ reference đen trắng
    let best = 0; state.attachs.forEach((a, i) => { if (a.sat > state.attachs[best].sat) best = i; });
    state.photoIdx = best;
    await applyFocus();
    renderAttachThumbs();
  }

  // Tự căn trọng tâm: mặc định GIỮA; nếu trình duyệt có FaceDetector thì căn vào mặt.
  async function applyFocus() {
    state.scale = 1; state.offX = 0.5; state.offY = 0.5;
    if (els && els.zoom) els.zoom.value = "1";
    const bm = curPhoto(); if (!bm) return;
    try {
      if ("FaceDetector" in window) {
        const faces = await new window.FaceDetector({ maxDetectedFaces: 6 }).detect(bm);
        if (faces && faces.length) {
          let cy = 0; faces.forEach((f) => { cy += f.boundingBox.y + f.boundingBox.height / 2; });
          cy = (cy / faces.length) / bm.height; // trọng tâm mặt (0..1)
          const aspect = 1.1, bandFrac = Math.min(1, (bm.width / aspect) / bm.height);
          if (bandFrac < 1) state.offY = clamp((cy - 0.5 * bandFrac) / (1 - bandFrac), 0, 1);
        }
      }
    } catch (e) {}
  }

  function syncOrder() {
    const key = orderId();
    if (state.orderKey === key) return;
    state.orderKey = key;
    state.note = ""; state.attachs = null; state.photoIdx = null; state.photoKey = null;
    state.scale = 1; state.offX = 0.5; state.offY = 0.5;
    state.textDX = 0; state.textDY = 0; state.dragMode = "photo";
    state.color = detectColor(); state.mb = detectMB();
    state.fontSize = defaultSize(state.mb);
    if (els && els.zoom) els.zoom.value = "1";
  }

  async function openModal() {
    await loadFonts();
    syncOrder();
    if (!state.note) state.note = getExternalNote();
    if (state.mb == null) state.mb = detectMB();
    if (!els) buildModal(); else els.overlay.style.display = "flex";
    els.text.value = state.note; els.zoom.value = String(state.scale);
    if (els.sizeInput) els.sizeInput.value = String(state.fontSize);
    refreshSeg(); refreshDragMode(); setStatus("", "info");
    await ensurePhotos();
    renderPreviews();
  }
  function closeModal() { if (els) els.overlay.style.display = "none"; }

  async function doDownload() {
    try {
      setStatus("Đang tạo file…", "info"); await fontsReady;
      const [mf, df] = await Promise.all([
        renderMockup(document.createElement("canvas"), state.color, state.mb || "MB05", state.note, curPhoto(), rf(), sizeScale(), textOff()).then((c) => canvasToFile(c, `mockup-${orderId()}.png`)),
        renderDesign(document.createElement("canvas"), state.mb || "MB05", state.note, curPhoto(), rf(), sizeScale()).then((c) => canvasToFile(c, `design-${orderId()}.png`)),
      ]);
      [mf, df].forEach((f) => { const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
      setStatus("Đã tải Mockup + Design.", "ok");
    } catch (e) { setStatus("Lỗi tải: " + e.message, "err"); }
  }

  function waitFillResult(timeout = 9000) {
    return new Promise((resolve) => {
      const on = (ev) => { if (ev.source !== window || !ev.data || ev.data.__hn !== "result") return; window.removeEventListener("message", on); clearTimeout(tm); resolve(ev.data); };
      const tm = setTimeout(() => { window.removeEventListener("message", on); resolve(null); }, timeout);
      window.addEventListener("message", on);
    });
  }
  async function doFill() {
    try {
      setStatus("Đang tạo ảnh…", "info"); await fontsReady;
      const mock = await canvasToFile(await renderMockup(document.createElement("canvas"), state.color, state.mb || "MB05", state.note, curPhoto(), rf(), sizeScale(), textOff()), `mockup-${orderId()}.png`);
      const design = await canvasToFile(await renderDesign(document.createElement("canvas"), state.mb || "MB05", state.note, curPhoto(), rf(), sizeScale()), `design-${orderId()}.png`);
      const mockUrl = URL.createObjectURL(mock), designUrl = URL.createObjectURL(design);
      const mockData = await blobToDataURL(mock), designData = await blobToDataURL(design);
      URL.revokeObjectURL(mockUrl); URL.revokeObjectURL(designUrl);
      closeModal();
      const resP = waitFillResult();
      window.postMessage({ __hn: "fill", mockUrl: mockData, mockName: mock.name, designUrl: designData, designName: design.name }, "*");
      const res = await resP;
      if (!res) { toast("Không nhận được phản hồi khi điền. Thử lại hoặc dùng Tải PNG.", "err"); return; }
      if (res.found < 2) toast(`Chỉ thấy ${res.found} ô Upload. Mở lại popup và bấm Tải PNG.`, "err");
      else if (res.okM && res.okD) toast("✅ Đã điền Mockup + Design. Kiểm tra rồi lưu đơn.", "ok");
      else toast(`Mockup ${res.okM ? "OK" : "lỗi"} · Design ${res.okD ? "OK" : "lỗi"}. Có thể dùng Tải PNG.`, "err");
    } catch (e) { toast("Lỗi điền: " + e.message, "err"); }
  }
  function blobToDataURL(blob) { return new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); }

  /* ------------------------- Nút mở popup ------------------------- */
  function ensureButton() {
    const onOrder = /\/orders?\//i.test(location.pathname);
    let btn = document.getElementById("hn-open-btn");
    if (!onOrder) { if (btn) btn.remove(); return; }
    if (btn) return;
    btn = document.createElement("button"); btn.id = "hn-open-btn"; btn.type = "button";
    btn.innerHTML = "🎵 Tạo Mockup Hộp Nhạc"; btn.title = "Tự nhận mã MB → chọn layout + font";
    btn.onclick = openModal; document.body.appendChild(btn);
  }
  new MutationObserver(() => ensureButton()).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(ensureButton, 1500); ensureButton(); loadFonts();

  /* ---------------- API cho luồng tự động (auto.js) ---------------- */
  window.__HN_API__ = {
    loadFonts, renderMockup, renderDesign, canvasToFile, loadBitmap, meanSaturation,
    parseNote, parseDateParts, defaultSize, SIZE_BASE, MB, TPL,
  };
})();
