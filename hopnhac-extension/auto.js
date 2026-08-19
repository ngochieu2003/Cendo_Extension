/* =========================================================================
   Hộp Nhạc – LUỒNG TỰ ĐỘNG (chạy trong tab cendo.work, isolated world)
   - Nhận lệnh từ bg.js (alarm hằng ngày / nút "Chạy ngay").
   - Quét đơn có tag "Up đủ thông tin" qua API /api/orders/search (theo trang),
     lấy items qua /api/orders/{id}/items, chỉ xử lý item Hộp Nhạc mà
     CẢ mockup và design đều trống. Đơn khác tuyệt đối không đụng.
   - Render bằng API của content.js (window.__HN_API__), upload qua
     POST /api/orders/{orderId}/items/{itemId}/upload-media (field=mockup|design).
   - Kết quả gửi về bg.js -> báo Lark.
   ========================================================================= */
(() => {
  "use strict";
  if (window.__HN_AUTO_LOADED__) return;
  window.__HN_AUTO_LOADED__ = true;

  const REQUIRED_TAG = "Up đủ thông tin";
  const PAGE_LIMIT = 20;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const orderUrl = (id) => `https://cendo.work/orders/${id}`;

  /* ----------------------------- API cendo ----------------------------- */
  async function api(path, opts = {}) {
    const res = await fetch("/api" + path, { credentials: "include", ...opts });
    let j = null;
    try { j = await res.json(); } catch (e) {}
    if (!res.ok || !j || j.success === false) {
      throw new Error(`API ${path} -> HTTP ${res.status}${j && j.message ? " · " + j.message : ""}`);
    }
    return j.data;
  }
  const searchOrders = (page) => api("/orders/search", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ page, limit: PAGE_LIMIT, sort_by: "created_at_desc", order_id: "", tags: [REQUIRED_TAG], tags_condition: "include" }),
  });
  const getItems = (orderId) => api(`/orders/${orderId}/items`).then((d) => d.items || []);
  async function uploadMedia(orderId, itemId, field, file) {
    const fd = new FormData(); fd.append("file", file); fd.append("field", field);
    return api(`/orders/${orderId}/items/${itemId}/upload-media`, { method: "POST", body: fd });
  }

  /* --------------------------- Nhận diện item --------------------------- */
  const isMusicBox = (it) => /h[ộo]p\s*nh[ạa]c/i.test(it.product_name || "") || /-SMB-/i.test(it.sku_id || "");
  function detectMB(it) {
    const s = `${it.sku_id || ""} ${it.variant_name || ""}`;
    const m = s.match(/\bMB(\d{2})\b/i);
    return m ? "MB" + m[1] : null;
  }
  const detectColor = (it) => (/óc\s*ch/i.test(it.variant_name || "") || /-WN-/i.test(it.sku_id || "") ? "occho" : "gomoc");
  const hasMedia = (m) => !!(m && (m._id || m.path_file || m.status));

  /* --------------------------- Xử lý 1 đơn --------------------------- */
  // Trả về { status: "done"|"skip"|"error"|"already", ... }
  async function processOrder(order, H) {
    const oid = order._id, label = `#${order.pancake_system_id || order.order_id || oid}`;
    const base = { oid, label, url: orderUrl(oid) };
    if (!(order.tags || []).includes(REQUIRED_TAG)) return { ...base, status: "skip", why: `trạng thái không phải "${REQUIRED_TAG}"` };

    const items = await getItems(oid);
    const hn = items.filter(isMusicBox);
    if (!hn.length) return null; // không phải đơn Hộp Nhạc -> bỏ qua im lặng

    // Đã có ảnh (cả 2) -> không đụng
    const empty = hn.filter((it) => !hasMedia(it.mockup) && !hasMedia(it.design));
    const partial = hn.filter((it) => hasMedia(it.mockup) !== hasMedia(it.design));
    if (partial.length) return { ...base, status: "skip", why: `item ${partial.map((i) => i.sku_id).join(", ")} chỉ có 1 trong 2 ảnh (Mockup/Design) — cần kiểm tra tay` };
    if (!empty.length) return { ...base, status: "already" };
    if (hn.length > 1) return { ...base, status: "skip", why: `đơn có ${hn.length} item Hộp Nhạc, không xác định được note cho từng item — làm tay` };

    const it = empty[0];
    const mb = detectMB(it);
    if (!mb || !H.MB[mb]) return { ...base, status: "skip", why: `không nhận diện được mã MB (SKU ${it.sku_id || "?"})` };
    const color = detectColor(it);
    const noteRaw = String(order.external_note || it.external_note || "").replace(/\r/g, "");
    const parts = H.parseNote(noteRaw);
    if (!noteRaw.trim()) return { ...base, status: "skip", why: "External note trống" };
    if (!parts.name) return { ...base, status: "skip", why: `External note không đủ dòng (cần: lời chúc / tên / ngày) — note: "${noteRaw.replace(/\n/g, " | ").slice(0, 80)}"` };
    if (mb === "MB04" && !H.parseDateParts(parts.date)) return { ...base, status: "skip", why: `MB04 nhưng không đọc được ngày ở dòng 3 — note: "${noteRaw.replace(/\n/g, " | ").slice(0, 80)}"` };

    // Ảnh khách
    const urls = (order.attachments || []).filter((a) => !a.type || /image/i.test(a.type)).map((a) => a.url).filter(Boolean);
    if (!urls.length) return { ...base, status: "skip", why: "không có ảnh khách trong Attachments" };
    const bms = [];
    for (const u of urls) { try { const bm = await H.loadBitmap(u); bms.push({ bm, sat: H.meanSaturation(bm) }); } catch (e) {} }
    if (!bms.length) return { ...base, status: "error", why: "không tải được ảnh khách (content.pancake.vn)" };
    bms.sort((a, b) => b.sat - a.sat);
    const photo = bms[0].bm;

    // Render
    await H.loadFonts();
    const sizeScale = H.defaultSize(mb) / H.SIZE_BASE;
    const rf = { scale: 1, offX: 0.5, offY: 0.5 };
    const mockC = await H.renderMockup(document.createElement("canvas"), color, mb, noteRaw, photo, rf, sizeScale, { dx: 0, dy: 0 });
    const desC = await H.renderDesign(document.createElement("canvas"), mb, noteRaw, photo, rf, sizeScale);
    const mockF = await H.canvasToFile(mockC, `mockup-${oid.slice(0, 12)}.png`);
    const desF = await H.canvasToFile(desC, `design-${oid.slice(0, 12)}.png`);

    // Kiểm tra lại ngay trước khi upload (tránh đè nếu ai đó vừa up tay)
    const fresh = (await getItems(oid)).find((x) => x._id === it._id);
    if (!fresh) return { ...base, status: "error", why: "item biến mất khi kiểm tra lại" };
    if (hasMedia(fresh.mockup) || hasMedia(fresh.design)) return { ...base, status: "skip", why: "ảnh vừa được người khác up trong lúc xử lý — bỏ qua" };

    // Upload
    let okM = false, okD = false, err = "";
    try { await uploadMedia(oid, it._id, "mockup", mockF); okM = true; } catch (e) { err = "mockup: " + e.message; }
    if (okM) { try { await uploadMedia(oid, it._id, "design", desF); okD = true; } catch (e) { err = "design: " + e.message; } }
    // Xác nhận
    let verified = false;
    try { const v = (await getItems(oid)).find((x) => x._id === it._id); verified = !!(v && hasMedia(v.mockup) && hasMedia(v.design)); } catch (e) {}

    if (okM && okD && verified) return { ...base, status: "done", mb, color, sku: it.sku_id, qty: it.quantity, name: parts.name, note: (it.quantity > 1 ? `SL ${it.quantity}` : "") };
    if (okM && !okD) return { ...base, status: "error", why: `Mockup đã lên nhưng Design lỗi (${err}) — cần up Design tay` };
    if (okM && okD && !verified) return { ...base, status: "error", why: "upload báo OK nhưng kiểm tra lại chưa thấy đủ 2 ảnh — cần kiểm tra" };
    return { ...base, status: "error", why: `upload lỗi (${err})` };
  }

  /* --------------------------- Chạy cả luồng --------------------------- */
  let running = false;
  async function runFlow(cfg, progress) {
    if (running) throw new Error("Luồng đang chạy, bỏ qua lệnh mới.");
    running = true;
    const H = window.__HN_API__;
    const started = Date.now();
    const rep = { pagesScanned: 0, ordersScanned: 0, musicBox: 0, done: [], skipped: [], errors: [], already: 0, fatal: null, scope: cfg.pages };
    try {
      if (!H) throw new Error("content.js chưa nạp (window.__HN_API__ trống). Reload trang cendo.work.");
      let page = 1, totalPages = 1;
      while (page <= totalPages && (cfg.pages === 0 || page <= cfg.pages)) {
        progress && progress(`Đang quét trang ${page}${cfg.pages ? "/" + cfg.pages : "/" + totalPages}…`);
        const d = await searchOrders(page);
        totalPages = d.pages || 1;
        rep.pagesScanned = page;
        for (const o of d.items || []) {
          rep.ordersScanned++;
          let r = null;
          try { r = await processOrder(o, H); }
          catch (e) { r = { oid: o._id, label: `#${o.pancake_system_id || o.order_id || o._id}`, url: orderUrl(o._id), status: "error", why: e.message }; }
          if (!r) continue;
          rep.musicBox++;
          if (r.status === "done") rep.done.push(r);
          else if (r.status === "skip") rep.skipped.push(r);
          else if (r.status === "error") rep.errors.push(r);
          else if (r.status === "already") rep.already++;
          progress && progress(`Trang ${page} · đã làm ${rep.done.length} · bỏ qua ${rep.skipped.length} · lỗi ${rep.errors.length}`);
          await sleep(400);
        }
        page++;
        await sleep(300);
      }
      rep.totalPages = totalPages;
    } catch (e) {
      rep.fatal = e.message;
    }
    rep.durationSec = Math.round((Date.now() - started) / 1000);
    running = false;
    return rep;
  }

  /* --------------------------- Toast nhỏ --------------------------- */
  function toast(msg, cls) {
    let t = document.getElementById("hn-toast");
    if (!t) { t = document.createElement("div"); t.id = "hn-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.className = cls || "info"; t.style.opacity = "1";
    clearTimeout(t._timer); t._timer = setTimeout(() => { t.style.opacity = "0"; }, 6000);
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg) return;
    if (msg.type === "HN_PROGRESS_UI") { setWidgetStatus("⏳ " + msg.text); return; }
    if (msg.type === "HN_DONE" && msg.log) { const l = msg.log; setWidgetStatus(`Xong: ✅ ${l.done} · ⚠️ ${l.skipped} · ❌ ${l.errors}${l.fatal ? " · DỪNG: " + l.fatal : ""} · Lark: ${l.lark}`, l.errors || l.fatal ? "err" : "ok"); refreshWidget(); return; }
    if (msg.type !== "HN_RUN") return;
    if (msg.ping) { sendResponse({ ok: true, running }); return; }
    if (running) { sendResponse({ ok: false, error: "Luồng đang chạy" }); return; }
    sendResponse({ ok: true, started: true });
    toast("🎵 Hộp Nhạc: bắt đầu chạy tự động…", "info");
    const runId = msg.runId || String(Date.now());
    const send = (m) => { try { chrome.runtime.sendMessage({ ...m, runId }); } catch (e) {} };
    runFlow(msg.cfg || { pages: 1 }, (p) => { toast("🎵 " + p, "info"); setWidgetStatus("⏳ " + p); send({ type: "HN_PROGRESS", text: p }); })
      .then((rep) => {
        toast(`🎵 Xong: làm ${rep.done.length} · bỏ qua ${rep.skipped.length} · lỗi ${rep.errors.length}`, rep.errors.length || rep.fatal ? "err" : "ok");
        send({ type: "HN_REPORT", report: rep, trigger: msg.trigger || "manual" });
      })
      .catch((e) => send({ type: "HN_REPORT", report: { fatal: e.message, done: [], skipped: [], errors: [], already: 0, pagesScanned: 0, ordersScanned: 0, musicBox: 0, scope: (msg.cfg || {}).pages }, trigger: msg.trigger || "manual" }));
  });

  /* ================= Widget góc trái dưới: lịch + chạy ngay ================= */
  const DEFAULTS = { enabled: false, hour: 8, minute: 0, pages: 1 };
  const pad2 = (n) => String(n).padStart(2, "0");
  const PAGE_OPTS = [[1, "1 trang đầu (20 đơn)"], [2, "2 trang đầu (40 đơn)"], [3, "3 trang đầu (60 đơn)"], [5, "5 trang đầu (100 đơn)"], [10, "10 trang đầu (200 đơn)"], [0, "Tất cả đơn chưa làm"]];
  const scopeLabel = (p) => (Number(p) === 0 ? "tất cả" : `${p} trang`);
  const getCfg = () => new Promise((r) => chrome.storage.local.get(DEFAULTS, r));
  const setCfg = (patch) => new Promise((r) => chrome.storage.local.set(patch, r));
  const bgSend = (m) => new Promise((r) => { try { chrome.runtime.sendMessage(m, r); } catch (e) { r(null); } });
  let W = null;

  function buildWidget() {
    if (document.getElementById("hn-auto-fab")) return;
    const fab = document.createElement("button"); fab.id = "hn-auto-fab"; fab.type = "button";
    fab.innerHTML = "🎵 Auto Hộp Nhạc: …";
    const panel = document.createElement("div"); panel.id = "hn-auto-panel"; panel.style.display = "none";
    panel.innerHTML = `
      <div class="hn-ap-head"><b>🎵 Tự động làm đơn Hộp Nhạc</b><button type="button" class="hn-ap-close" title="Đóng">×</button></div>
      <label class="hn-ap-switch"><input type="checkbox" id="hn-ap-enabled"><span>Bật chạy tự động hằng ngày</span></label>
      <div class="hn-ap-row"><span>Giờ chạy</span><input type="time" id="hn-ap-time" value="08:00"></div>
      <div class="hn-ap-row"><span>Quy mô</span><select id="hn-ap-pages">${PAGE_OPTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>
      <div class="hn-ap-hint" id="hn-ap-next"></div>
      <div class="hn-ap-actions">
        <button type="button" class="hn-ap-save" id="hn-ap-save">Lưu</button>
        <button type="button" class="hn-ap-run" id="hn-ap-run">▶ Chạy ngay</button>
        <button type="button" class="hn-ap-more" id="hn-ap-more" title="Webhook Lark, lịch sử chạy…">Cài đặt đầy đủ</button>
      </div>
      <div class="hn-ap-status info" id="hn-ap-status">Chỉ làm đơn "Up đủ thông tin" có Mockup & Design trống.</div>`;
    document.body.appendChild(fab); document.body.appendChild(panel);
    const $ = (s) => panel.querySelector(s);
    W = { fab, panel, enabled: $("#hn-ap-enabled"), time: $("#hn-ap-time"), pages: $("#hn-ap-pages"), next: $("#hn-ap-next"), status: $("#hn-ap-status"), run: $("#hn-ap-run") };
    fab.onclick = () => { const open = panel.style.display !== "none"; panel.style.display = open ? "none" : "block"; if (!open) refreshWidget(); };
    $(".hn-ap-close").onclick = () => { panel.style.display = "none"; };
    const save = async () => {
      const [h, m] = (W.time.value || "08:00").split(":").map(Number);
      await setCfg({ enabled: W.enabled.checked, hour: h || 0, minute: m || 0, pages: Number(W.pages.value) });
      await bgSend({ type: "HN_RESCHEDULE" });
      setWidgetStatus("Đã lưu cài đặt.", "ok"); refreshWidget();
    };
    $("#hn-ap-save").onclick = save;
    W.enabled.onchange = save; W.time.onchange = save; W.pages.onchange = save;
    $("#hn-ap-run").onclick = async () => {
      await save();
      const label = scopeLabel(W.pages.value);
      if (!confirm(`Chạy ngay luồng tự động Hộp Nhạc với quy mô: ${label}?\n(Chỉ làm đơn "Up đủ thông tin" có Mockup & Design trống. Xong sẽ báo Lark.)`)) return;
      W.run.disabled = true; setWidgetStatus("⏳ Đang khởi động…");
      const r = await bgSend({ type: "HN_RUN_NOW" });
      if (!r || !r.ok) { setWidgetStatus("Không chạy được: " + (r && r.error), "err"); W.run.disabled = false; }
    };
    $("#hn-ap-more").onclick = () => bgSend({ type: "HN_OPEN_OPTIONS" });
    refreshWidget();
  }
  async function refreshWidget() {
    if (!W) return;
    const cfg = await getCfg();
    W.enabled.checked = !!cfg.enabled; W.time.value = `${pad2(cfg.hour)}:${pad2(cfg.minute)}`; W.pages.value = String(cfg.pages);
    W.fab.innerHTML = `🎵 Auto Hộp Nhạc: <b>${cfg.enabled ? "BẬT " + pad2(cfg.hour) + ":" + pad2(cfg.minute) : "TẮT"}</b> · ${scopeLabel(cfg.pages)}`;
    W.fab.classList.toggle("on", !!cfg.enabled);
    const st = await bgSend({ type: "HN_STATUS" });
    if (st) {
      const d = st.nextAlarm ? new Date(st.nextAlarm) : null;
      W.next.textContent = d ? `Lần chạy kế tiếp: ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())} (Chrome phải đang mở)` : "Chưa bật lịch tự động.";
      W.run.disabled = !!st.current;
      if (st.current) setWidgetStatus("⏳ " + (st.current.progress || "Đang chạy…"));
    }
  }
  function setWidgetStatus(t, cls) { if (W) { W.status.textContent = t; W.status.className = "hn-ap-status " + (cls || "info"); } }
  chrome.storage.onChanged.addListener((ch, area) => { if (area === "local") refreshWidget(); });
  const ensureWidget = () => { if (!document.getElementById("hn-auto-fab")) { W = null; buildWidget(); } };
  ensureWidget(); setInterval(ensureWidget, 2000);
})();
