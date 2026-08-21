/* =========================================================================
   Móc Khóa Clicky Instax 3D – Service worker: đặt lịch (chrome.alarms), mở
   tab cendo.work, ra lệnh chạy cho auto.js, nhận báo cáo và gửi Lark.
   Kiêm luôn việc tải ảnh khách từ content.pancake.vn (INSTAX_FETCH) để
   content script không vướng CORS và canvas không bị taint.
   ========================================================================= */
const ALARM = "instax-daily";
const DEFAULTS = {
  enabled: false, hour: 8, minute: 0, pages: 1,          // pages: 0 = tất cả
  // Webhook group Lark: NHẬP Ở TRANG CÀI ĐẶT (repo public — không hardcode webhook vào code).
  larkWebhook: "",
  larkKeyword: "Thông báo",
  lastRunDate: "", logs: [],
};
const getCfg = () => new Promise((r) => chrome.storage.local.get(DEFAULTS, r));
const setCfg = (patch) => new Promise((r) => chrome.storage.local.set(patch, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pad2 = (n) => String(n).padStart(2, "0");
const localDate = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtTime = (d = new Date()) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/* ---------------------- Tải ảnh hộ content script ---------------------- */
async function fetchAsDataUrl(url) {
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const type = res.headers.get("content-type") || "image/jpeg";
  const buf = await res.arrayBuffer();
  const u8 = new Uint8Array(buf);
  let bin = "";
  const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) bin += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
  return `data:${type};base64,${btoa(bin)}`;
}

/* ------------------------------ Lịch ------------------------------ */
async function scheduleAlarm() {
  const cfg = await getCfg();
  await chrome.alarms.clear(ALARM);
  if (!cfg.enabled) return;
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), cfg.hour, cfg.minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  chrome.alarms.create(ALARM, { when: next.getTime(), periodInMinutes: 24 * 60 });
}
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
chrome.runtime.onInstalled.addListener(scheduleAlarm);
chrome.runtime.onStartup.addListener(scheduleAlarm);
chrome.storage.onChanged.addListener((ch, area) => {
  if (area === "local" && (ch.enabled || ch.hour || ch.minute)) scheduleAlarm();
});
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== ALARM) return;
  const cfg = await getCfg();
  if (!cfg.enabled) return;
  if (cfg.lastRunDate === localDate()) return; // chống chạy 2 lần/ngày
  await setCfg({ lastRunDate: localDate() });
  startRun("schedule");
});

/* --------------------------- Khởi động chạy --------------------------- */
async function ping(tabId) {
  try { const r = await chrome.tabs.sendMessage(tabId, { type: "INSTAX_RUN", ping: true }); return !!(r && r.ok); } catch (e) { return false; }
}
async function waitReady(tabId, tries) {
  for (let i = 0; i < tries; i++) { if (await ping(tabId)) return true; await sleep(500); }
  return false;
}
async function findOrOpenTab() {
  const tabs = (await chrome.tabs.query({ url: "https://cendo.work/*" })).filter((t) => !t.discarded);
  const sorted = [...tabs].sort((a, b) => (/\/orders/.test(b.url) ? 1 : 0) - (/\/orders/.test(a.url) ? 1 : 0));
  for (const t of sorted) if (await ping(t.id)) return t;
  if (sorted.length) {
    const t = sorted[0];
    try { await chrome.tabs.reload(t.id); } catch (e) {}
    if (await waitReady(t.id, 60)) return t;
  }
  const nt = await chrome.tabs.create({ url: "https://cendo.work/orders", active: false });
  if (await waitReady(nt.id, 60)) return nt;
  throw new Error("Không kết nối được content script trên tab cendo.work (đã đăng nhập cendo.work chưa? Sau khi Reload extension hãy F5 lại trang cendo).");
}
let current = null; // { runId, trigger, startedAt, progress }
async function startRun(trigger) {
  const cfg = await getCfg();
  if (current) return { ok: false, error: "Đang có lượt chạy khác." };
  const runId = String(Date.now());
  current = { runId, trigger, startedAt: Date.now(), progress: "Đang mở tab cendo.work…" };
  try {
    const tab = await findOrOpenTab();
    const r = await chrome.tabs.sendMessage(tab.id, { type: "INSTAX_RUN", runId, trigger, cfg: { pages: Number(cfg.pages) || 0 } });
    if (!r || !r.ok) throw new Error((r && r.error) || "Tab không nhận lệnh");
    return { ok: true, runId };
  } catch (e) {
    current = null;
    const rep = { fatal: e.message, done: [], skipped: [], errors: [], already: 0, pagesScanned: 0, ordersScanned: 0, instax: 0, scope: cfg.pages };
    await finishRun(rep, trigger);
    return { ok: false, error: e.message };
  }
}

/* --------------------------- Báo cáo + Lark --------------------------- */
function buildLarkText(rep, trigger, cfg) {
  const scope = rep.scope === 0 || rep.scope === "0" ? "tất cả các trang" : `${rep.scope} trang đầu`;
  const L = [];
  L.push(`${cfg.larkKeyword} 📸 Móc Khóa Clicky Instax 3D – tự động làm Mockup/Design`);
  L.push(`⏰ ${fmtTime()} · ${trigger === "schedule" ? "chạy theo lịch" : "chạy tay"} · phạm vi: ${scope}`);
  if (rep.fatal) L.push(`❌ LỖI DỪNG LUỒNG: ${rep.fatal}`);
  L.push(`📄 Đã quét ${rep.pagesScanned} trang / ${rep.ordersScanned} đơn "Up đủ thông tin" · đơn Instax: ${rep.instax} (đã làm từ trước: ${rep.already})`);
  const itemLine = (x) => `Màu ${x.color} · ảnh #${x.att}${x.qty > 1 ? " · SL " + x.qty : ""}`;

  L.push(``);
  L.push(`✅ ĐÃ LÀM: ${rep.done.length} đơn / ${rep.done.reduce((s, r) => s + (r.count || 1), 0)} item`);
  rep.done.forEach((r) => {
    L.push(`• ${r.label} (${r.count || 1} item) – ${r.url}`);
    (r.items || []).forEach((x) => L.push(`   ${x.i}. ${itemLine(x)}`));
  });

  L.push(``);
  L.push(`❌ LỖI: ${rep.errors.length}${rep.errors.length ? " — kiểm tra ngay" : ""}`);
  rep.errors.forEach((r) => {
    L.push(`• ${r.label}: ${r.why}\n   ${r.url}`);
    if (r.partialDone && r.partialDone.length) L.push(`   (đã lên trước khi lỗi: ${r.partialDone.map((x) => x.i + ". " + itemLine(x)).join(" · ")})`);
  });

  L.push(``);
  L.push(`👀 CẦN XEM (bỏ qua, làm tay): ${rep.skipped.length}`);
  rep.skipped.forEach((r) => L.push(`• ${r.label}: ${r.why}\n   ${r.url}`));

  if (rep.durationSec != null) L.push(`\n⏱ ${rep.durationSec}s`);
  return L.join("\n");
}
async function sendLark(webhook, text) {
  if (!webhook) return { ok: false, error: "Chưa cấu hình webhook" };
  try {
    const res = await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ msg_type: "text", content: { text } }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || (j.code && j.code !== 0) || (j.StatusCode && j.StatusCode !== 0)) return { ok: false, error: `Lark HTTP ${res.status} ${JSON.stringify(j).slice(0, 200)}` };
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}
async function finishRun(rep, trigger) {
  const cfg = await getCfg();
  const text = buildLarkText(rep, trigger, cfg);
  const lark = await sendLark(cfg.larkWebhook, text);
  const logs = [{ at: Date.now(), trigger, done: rep.done.length, skipped: rep.skipped.length, errors: rep.errors.length, already: rep.already, fatal: rep.fatal || "", lark: lark.ok ? "OK" : lark.error, text }, ...(cfg.logs || [])].slice(0, 20);
  await setCfg({ logs });
  current = null;
  broadcast({ type: "INSTAX_DONE", log: logs[0] });
}

/* --------------------------- Message hub --------------------------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;
  if (msg.type === "INSTAX_FETCH") {
    fetchAsDataUrl(msg.url)
      .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "INSTAX_PROGRESS") { if (current) current.progress = msg.text; broadcast({ type: "INSTAX_PROGRESS_UI", text: msg.text }); return; }
  if (msg.type === "INSTAX_REPORT") { finishRun(msg.report, msg.trigger || (current && current.trigger) || "manual").then(() => sendResponse({ ok: true })); return true; }
  if (msg.type === "INSTAX_RUN_NOW") { startRun("manual").then(sendResponse); return true; }
  if (msg.type === "INSTAX_STATUS") { chrome.alarms.get(ALARM).then((a) => sendResponse({ current, nextAlarm: a ? a.scheduledTime : null })); return true; }
  if (msg.type === "INSTAX_TEST_LARK") {
    getCfg().then((cfg) => sendLark(cfg.larkWebhook, `${cfg.larkKeyword} 📸 Móc Khóa Clicky Instax 3D – tin nhắn thử từ extension (${fmtTime()}). Kết nối Lark OK.`)).then(sendResponse);
    return true;
  }
  if (msg.type === "INSTAX_RESCHEDULE") { scheduleAlarm().then(() => sendResponse({ ok: true })); return true; }
  if (msg.type === "INSTAX_OPEN_OPTIONS") { chrome.runtime.openOptionsPage(); sendResponse({ ok: true }); return; }
});

async function broadcast(m) {
  try { chrome.runtime.sendMessage(m); } catch (e) {}
  try { const tabs = await chrome.tabs.query({ url: "https://cendo.work/*" }); for (const t of tabs) { try { chrome.tabs.sendMessage(t.id, m).catch(() => {}); } catch (e) {} } } catch (e) {}
}
