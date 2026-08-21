/* =========================================================================
   Móc Khóa Clicky Instax 3D – LUỒNG TỰ ĐỘNG (chạy trong tab cendo.work)
   - Nhận lệnh từ bg.js (alarm hằng ngày / nút "Chạy ngay").
   - Quét đơn có tag "Up đủ thông tin" qua /api/orders/search, lấy items qua
     /api/orders/{id}/items, chỉ xử lý item Instax mà CẢ mockup và design
     đều trống. Đơn khác tuyệt đối không đụng.
   - Ảnh khách: attachments (type image) của đơn, ảnh thứ n -> item Instax
     thứ n. Lệch số lượng -> bỏ qua cả đơn và báo lý do lên Lark.
   - Render bằng window.__INSTAX_API__ (content.js), upload qua
     POST /api/orders/{orderId}/items/{itemId}/upload-media (field=mockup|design).
   ========================================================================= */
(() => {
  "use strict";
  if (window.__INSTAX_AUTO_LOADED__) return;
  window.__INSTAX_AUTO_LOADED__ = true;

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
  const getOrder = (orderId) => api(`/orders/${orderId}`);
  async function uploadMedia(orderId, itemId, field, file) {
    const fd = new FormData(); fd.append("file", file); fd.append("field", field);
    return api(`/orders/${orderId}/items/${itemId}/upload-media`, { method: "POST", body: fd });
  }

  /* --------------------------- Nhận diện item --------------------------- */
  const itemText = (it) => `${it.product_name || ""} ${it.variant_name || ""} ${it.sku_id || ""} ${it.fulfillment_sku || ""}`;
  const isInstax = (it, H) => H.isInstaxText(itemText(it));
  // Màu: variant_name "Màu: Màu Xanh Dương" hoặc fulfillment SKU P-3D-K06-Blue…
  function detectColor(it, H) {
    let c = H.colorFromText(it.variant_name || "");
    if (!c) c = H.colorFromSku(it.fulfillment_sku || "");
    if (!c) c = H.colorFromSku(it.sku_id || "");
    return c;
  }
  const hasMedia = (m) => !!(m && (m._id || m.path_file || m.status));

  /* --------------------------- Xử lý 1 đơn --------------------------- */
  async function processOrder(order, H) {
    const oid = order._id, label = `#${order.pancake_system_id || order.order_id || oid}`;
    const base = { oid, label, url: orderUrl(oid) };
    if (!(order.tags || []).includes(REQUIRED_TAG)) return { ...base, status: "skip", why: `trạng thái không phải "${REQUIRED_TAG}"` };

    const items = await getItems(oid);
    const instax = items.filter((it) => isInstax(it, H));
    if (!instax.length) return null; // không phải đơn Instax -> bỏ qua im lặng

    const partial = instax.filter((it) => hasMedia(it.mockup) !== hasMedia(it.design));
    if (partial.length) return { ...base, status: "skip", why: `item ${partial.map((i) => i.sku_id).join(", ")} chỉ có 1 trong 2 ảnh (Mockup/Design) — cần kiểm tra tay` };
    const empty = instax.filter((it) => !hasMedia(it.mockup) && !hasMedia(it.design));
    if (!empty.length) return { ...base, status: "already" };

    // Ảnh khách: attachments (type image) của đơn — thứ n -> item Instax thứ n
    let atts = (order.attachments || []).filter((a) => a && a.type === "image" && a.url).map((a) => a.url);
    if (!atts.length) {
      try { const full = await getOrder(oid); atts = (full.attachments || []).filter((a) => a && a.type === "image" && a.url).map((a) => a.url); } catch (e) {}
    }
    if (!atts.length) return { ...base, status: "skip", why: "đơn không có ảnh trong Attachments" };
    if (atts.length !== instax.length) {
      return { ...base, status: "skip", why: `lệch số lượng: Attachments có ${atts.length} ảnh nhưng đơn có ${instax.length} item Instax — làm tay` };
    }

    // Đủ điều kiện: kiểm tra màu của từng item cần làm
    const jobs = [];
    for (let i = 0; i < instax.length; i++) {
      const it = instax[i];
      if (!empty.includes(it)) continue; // item này đã có đủ 2 ảnh -> giữ nguyên
      const color = detectColor(it, H);
      if (!color) return { ...base, status: "skip", why: `không đọc được mục "Màu" của item ${i + 1} (SKU ${it.sku_id || "?"} · ${it.variant_name || ""})` };
      jobs.push({ it, i, color, attUrl: atts[i] });
    }

    const doneItems = [];
    for (const j of jobs) {
      const tag = `${oid.slice(0, 12)}-${j.i + 1}-${j.color}`;
      let bmp;
      try { bmp = (await H.fetchRemote(j.attUrl)).bitmap; }
      catch (e) { return { ...base, status: "error", why: `item ${j.i + 1}: không tải được ảnh khách (${e.message})`, partialDone: doneItems }; }
      const desC = H.renderDesign(document.createElement("canvas"), bmp, null);
      const mockC = await H.renderMockup(document.createElement("canvas"), j.color, bmp, null);
      const mockF = await H.canvasToFile(mockC, `mockup-instax-${tag}.png`);
      const desF = await H.canvasToFile(desC, `design-instax-${tag}.png`, H.DESIGN.dpi);

      // Kiểm tra lại ngay trước khi upload (tránh đè nếu ai đó vừa up tay)
      const fresh = (await getItems(oid)).find((x) => x._id === j.it._id);
      if (!fresh) return { ...base, status: "error", why: `item ${j.i + 1} biến mất khi kiểm tra lại`, partialDone: doneItems };
      if (hasMedia(fresh.mockup) || hasMedia(fresh.design)) return { ...base, status: "skip", why: `ảnh item ${j.i + 1} vừa được người khác up trong lúc xử lý — bỏ qua đơn`, partialDone: doneItems };

      let okM = false, okD = false, err = "";
      try { await uploadMedia(oid, j.it._id, "mockup", mockF); okM = true; } catch (e) { err = "mockup: " + e.message; }
      if (okM) { try { await uploadMedia(oid, j.it._id, "design", desF); okD = true; } catch (e) { err = "design: " + e.message; } }
      let verified = false;
      try { const v = (await getItems(oid)).find((x) => x._id === j.it._id); verified = !!(v && hasMedia(v.mockup) && hasMedia(v.design)); } catch (e) {}

      if (!(okM && okD && verified)) {
        const why = okM && !okD ? `item ${j.i + 1}: Mockup đã lên nhưng Design lỗi (${err}) — cần up Design tay`
          : okM && okD && !verified ? `item ${j.i + 1}: upload báo OK nhưng kiểm tra lại chưa thấy đủ 2 ảnh`
          : `item ${j.i + 1}: upload lỗi (${err})`;
        return { ...base, status: "error", why, partialDone: doneItems };
      }
      doneItems.push({ i: j.i + 1, color: (H.TPL[j.color] || {}).label || j.color, att: j.i + 1, sku: j.it.sku_id, qty: j.it.quantity });
      await sleep(300);
    }

    return { ...base, status: "done", items: doneItems, count: doneItems.length };
  }

  /* --------------------------- Chạy cả luồng --------------------------- */
  let running = false;
  async function runFlow(cfg, progress) {
    if (running) throw new Error("Luồng đang chạy, bỏ qua lệnh mới.");
    running = true;
    const H = window.__INSTAX_API__;
    const started = Date.now();
    const rep = { pagesScanned: 0, ordersScanned: 0, instax: 0, done: [], skipped: [], errors: [], already: 0, fatal: null, scope: cfg.pages };
    try {
      if (!H) throw new Error("content.js chưa nạp (window.__INSTAX_API__ trống). Reload trang cendo.work.");
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
          rep.instax++;
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
    let t = document.getElementById("instax-toast");
    if (!t) { t = document.createElement("div"); t.id = "instax-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.className = cls || "info"; t.style.opacity = "1";
    clearTimeout(t._timer); t._timer = setTimeout(() => { t.style.opacity = "0"; }, 6000);
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg) return;
    if (msg.type === "INSTAX_PROGRESS_UI") { setWidgetStatus("⏳ " + msg.text); return; }
    if (msg.type === "INSTAX_DONE" && msg.log) { const l = msg.log; setWidgetStatus(`Xong: ✅ ${l.done} · ⚠️ ${l.skipped} · ❌ ${l.errors}${l.fatal ? " · DỪNG: " + l.fatal : ""} · Lark: ${l.lark}`, l.errors || l.fatal ? "err" : "ok"); refreshWidget(); return; }
    if (msg.type !== "INSTAX_RUN") return;
    if (msg.ping) { sendResponse({ ok: true, running }); return; }
    if (running) { sendResponse({ ok: false, error: "Luồng đang chạy" }); return; }
    sendResponse({ ok: true, started: true });
    toast("📸 Instax: bắt đầu chạy tự động…", "info");
    const runId = msg.runId || String(Date.now());
    const send = (m) => { try { chrome.runtime.sendMessage({ ...m, runId }); } catch (e) {} };
    runFlow(msg.cfg || { pages: 1 }, (p) => { toast("📸 " + p, "info"); setWidgetStatus("⏳ " + p); send({ type: "INSTAX_PROGRESS", text: p }); })
      .then((rep) => {
        toast(`📸 Xong: làm ${rep.done.length} · bỏ qua ${rep.skipped.length} · lỗi ${rep.errors.length}`, rep.errors.length || rep.fatal ? "err" : "ok");
        send({ type: "INSTAX_REPORT", report: rep, trigger: msg.trigger || "manual" });
      })
      .catch((e) => send({ type: "INSTAX_REPORT", report: { fatal: e.message, done: [], skipped: [], errors: [], already: 0, pagesScanned: 0, ordersScanned: 0, instax: 0, scope: (msg.cfg || {}).pages }, trigger: msg.trigger || "manual" }));
  });

  /* ============= Widget góc trái dưới: lịch + chạy ngay ============= */
  const DEFAULTS = { enabled: false, hour: 8, minute: 0, pages: 1 };
  const pad2 = (n) => String(n).padStart(2, "0");
  const PAGE_OPTS = [[1, "1 trang đầu (20 đơn)"], [2, "2 trang đầu (40 đơn)"], [3, "3 trang đầu (60 đơn)"], [5, "5 trang đầu (100 đơn)"], [10, "10 trang đầu (200 đơn)"], [0, "Tất cả đơn chưa làm"]];
  const scopeLabel = (p) => (Number(p) === 0 ? "tất cả" : `${p} trang`);
  const getCfg = () => new Promise((r) => chrome.storage.local.get(DEFAULTS, r));
  const setCfg = (patch) => new Promise((r) => chrome.storage.local.set(patch, r));
  const bgSend = (m) => new Promise((r) => { try { chrome.runtime.sendMessage(m, r); } catch (e) { r(null); } });
  let W = null;

  function buildWidget() {
    if (document.getElementById("instax-auto-fab")) return;
    const fab = document.createElement("button"); fab.id = "instax-auto-fab"; fab.type = "button";
    fab.innerHTML = "📸 Auto Instax: …";
    const panel = document.createElement("div"); panel.id = "instax-auto-panel"; panel.style.display = "none";
    panel.innerHTML = `
      <div class="instax-ap-head"><b>📸 Tự động làm đơn Móc Khóa Instax</b><button type="button" class="instax-ap-close" title="Đóng">×</button></div>
      <label class="instax-ap-switch"><input type="checkbox" id="instax-ap-enabled"><span>Bật chạy tự động hằng ngày</span></label>
      <div class="instax-ap-row"><span>Giờ chạy</span><input type="time" id="instax-ap-time" value="08:00"></div>
      <div class="instax-ap-row"><span>Quy mô</span><select id="instax-ap-pages">${PAGE_OPTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>
      <div class="instax-ap-hint" id="instax-ap-next"></div>
      <div class="instax-ap-actions">
        <button type="button" class="instax-ap-save" id="instax-ap-save">Lưu</button>
        <button type="button" class="instax-ap-run" id="instax-ap-run">▶ Chạy ngay</button>
        <button type="button" class="instax-ap-more" id="instax-ap-more" title="Webhook Lark, lịch sử chạy…">Cài đặt đầy đủ</button>
      </div>
      <div class="instax-ap-status info" id="instax-ap-status">Chỉ làm đơn "Up đủ thông tin" có Mockup & Design trống và số ảnh = số item.</div>`;
    document.body.appendChild(fab); document.body.appendChild(panel);
    const $ = (s) => panel.querySelector(s);
    W = { fab, panel, enabled: $("#instax-ap-enabled"), time: $("#instax-ap-time"), pages: $("#instax-ap-pages"), next: $("#instax-ap-next"), status: $("#instax-ap-status"), run: $("#instax-ap-run") };
    fab.onclick = () => { const open = panel.style.display !== "none"; panel.style.display = open ? "none" : "block"; if (!open) refreshWidget(); };
    $(".instax-ap-close").onclick = () => { panel.style.display = "none"; };
    const save = async () => {
      const [h, m] = (W.time.value || "08:00").split(":").map(Number);
      await setCfg({ enabled: W.enabled.checked, hour: h || 0, minute: m || 0, pages: Number(W.pages.value) });
      await bgSend({ type: "INSTAX_RESCHEDULE" });
      setWidgetStatus("Đã lưu cài đặt.", "ok"); refreshWidget();
    };
    $("#instax-ap-save").onclick = save;
    W.enabled.onchange = save; W.time.onchange = save; W.pages.onchange = save;
    $("#instax-ap-run").onclick = async () => {
      await save();
      const label = scopeLabel(W.pages.value);
      if (!confirm(`Chạy ngay luồng tự động Móc Khóa Instax với quy mô: ${label}?\n(Chỉ làm đơn "Up đủ thông tin" có Mockup & Design trống. Xong sẽ báo Lark.)`)) return;
      W.run.disabled = true; setWidgetStatus("⏳ Đang khởi động…");
      const r = await bgSend({ type: "INSTAX_RUN_NOW" });
      if (!r || !r.ok) { setWidgetStatus("Không chạy được: " + (r && r.error), "err"); W.run.disabled = false; }
    };
    $("#instax-ap-more").onclick = () => bgSend({ type: "INSTAX_OPEN_OPTIONS" });
    refreshWidget();
  }
  async function refreshWidget() {
    if (!W) return;
    const cfg = await getCfg();
    W.enabled.checked = !!cfg.enabled; W.time.value = `${pad2(cfg.hour)}:${pad2(cfg.minute)}`; W.pages.value = String(cfg.pages);
    W.fab.innerHTML = `📸 Auto Instax: <b>${cfg.enabled ? "BẬT " + pad2(cfg.hour) + ":" + pad2(cfg.minute) : "TẮT"}</b> · ${scopeLabel(cfg.pages)}`;
    W.fab.classList.toggle("on", !!cfg.enabled);
    const st = await bgSend({ type: "INSTAX_STATUS" });
    if (st) {
      const d = st.nextAlarm ? new Date(st.nextAlarm) : null;
      W.next.textContent = d ? `Lần chạy kế tiếp: ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())} (Chrome phải đang mở)` : "Chưa bật lịch tự động.";
      W.run.disabled = !!st.current;
      if (st.current) setWidgetStatus("⏳ " + (st.current.progress || "Đang chạy…"));
    }
  }
  function setWidgetStatus(t, cls) { if (W) { W.status.textContent = t; W.status.className = "instax-ap-status " + (cls || "info"); } }
  chrome.storage.onChanged.addListener((ch, area) => { if (area === "local") refreshWidget(); });
  const ensureWidget = () => { if (!document.getElementById("instax-auto-fab")) { W = null; buildWidget(); } };
  ensureWidget(); setInterval(ensureWidget, 2000);
})();
