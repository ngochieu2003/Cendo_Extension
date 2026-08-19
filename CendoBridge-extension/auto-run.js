// ============================================================================
// auto-run.js — BOT 8H30: tu quet & xu ly don "Hop quay anh ki niem - Flip
// Photo Book" tren cendo.work, roi bao cao vao nhom Lark.
// Chay trong service worker (duoc importScripts tu background.js — DUNG CHUNG
// global scope, nen dung duoc bien `sessions` cua background.js luc runtime).
//
// Luong 1 lan chay:
//   1. Mo tab nen cendo.work/orders (KHONG dung Filter tags).
//   2. Quet N trang dau (1/2/.../tat ca — chon trong widget), gom cac don Flip
//      Photo Book CO badge "Up đủ thông tin" hien duoi ID (doc tren dong).
//   3. Mo tung don: da co Mockup+Design -> bo qua; khong co Attachments ->
//      "don dang link" (chua tu lam); Attachments != 12/16 -> "can xem lai";
//      du dieu kien -> chay luong embed che do AUTO (tu bam Dien vao don).
//   4. Gui bao cao Lark (keyword "Thông báo").
// ============================================================================

const AUTO = {
  ORDERS_URL: "https://cendo.work/orders",
  ORIGIN: "https://cendo.work",
  TAG: "Up đủ thông tin",
  PRODUCT_RE: /Flip Photo Book/i,
  LARK_HOOK:
    "https://open.larksuite.com/open-apis/bot/v2/hook/a856a164-f31b-4d9d-98e8-40449b17436e",
  RUN_HOUR: 8,    // mac dinh — gio thuc te lay tu storage (chinh trong popup)
  RUN_MINUTE: 30,
  MAX_PROCESS: 25,        // tran so don xu ly moi luot (an toan)
  MAX_PAGES_ALL: 200,     // tran cung khi chon "tat ca" (chong lap vo han)
  DEFAULT_PAGES: 2,       // mac dinh: 2 trang dau (0 = tat ca) — chinh trong widget
  ORDER_TIMEOUT_MS: 210000, // tran thoi gian 1 don
  FILL_POLL_MS: 4000,
  FILL_TIMEOUT_MS: 90000,
};

const autoSleep = (ms) => new Promise((r) => setTimeout(r, ms));

function todayKey() {
  // Ngay theo gio may (may o VN)
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function nowHM() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
async function getRunTime() {
  const st = await chrome.storage.local.get({
    autoRunHour: AUTO.RUN_HOUR,
    autoRunMinute: AUTO.RUN_MINUTE,
  });
  return { hour: st.autoRunHour, minute: st.autoRunMinute };
}
// So trang quet: 1, 2, ... hoac 0 = tat ca
async function getScanPages() {
  const st = await chrome.storage.local.get({ autoScanPages: AUTO.DEFAULT_PAGES });
  const n = parseInt(st.autoScanPages, 10);
  return isNaN(n) || n < 0 ? AUTO.DEFAULT_PAGES : n;
}
async function nextRunTime() {
  const { hour, minute } = await getRunTime();
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

// ---------- alarm ----------
async function autoEnsureAlarm() {
  const st = await chrome.storage.local.get({ autoEnabled: true });
  if (st.autoEnabled) {
    chrome.alarms.create("cendo-daily", { when: await nextRunTime(), periodInMinutes: 1440 });
  } else {
    chrome.alarms.clear("cendo-daily");
  }
}
chrome.runtime.onInstalled.addListener(() => {
  autoEnsureAlarm();
});
chrome.runtime.onStartup.addListener(async () => {
  autoEnsureAlarm();
  // Chay bu: mo Chrome sau 8h30 ma hom nay chua chay
  const st = await chrome.storage.local.get({ autoEnabled: true, lastRunDate: "" });
  if (!st.autoEnabled || st.lastRunDate === todayKey()) return;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const rt = await getRunTime();
  if (mins >= rt.hour * 60 + rt.minute) {
    // doi 20s cho trinh duyet/on dinh phien dang nhap
    setTimeout(() => autoRunDaily("catchup"), 20000);
  }
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "cendo-daily") autoRunDaily("alarm");
});

// ---------- tien ich tab/message ----------
async function autoWaitTabComplete(tabId, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      const t = await chrome.tabs.get(tabId);
      if (t.status === "complete") return true;
    } catch (_) {
      return false;
    }
    await autoSleep(250);
  }
  return false;
}
async function autoSendTab(tabId, payload, tries = 20, delay = 400) {
  for (let i = 0; i < tries; i++) {
    try {
      return await chrome.tabs.sendMessage(tabId, payload);
    } catch (_) {
      await autoSleep(delay);
    }
  }
  return null;
}

// ---------- trang thai phien AUTO (nhan tu content-source trong iframe) ----------
// sessionId -> {resolve} dang cho su kien mockup_ready / error
const autoWaiters = new Map();
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg) return;
  if (msg.type === "CENDO_AUTO_STATUS") {
    const w = autoWaiters.get(msg.sessionId);
    if (w) {
      autoWaiters.delete(msg.sessionId);
      w.resolve({ state: msg.state, warnings: msg.warnings || [], error: msg.error });
    }
    return; // khong sendResponse
  }
  if (msg.type === "CENDO_AUTO_RUN_NOW") {
    autoRunDaily("manual");
    return;
  }
  if (msg.type === "CENDO_AUTO_SET_ENABLED") {
    chrome.storage.local.set({ autoEnabled: !!msg.enabled }).then(autoEnsureAlarm);
    return;
  }
  if (msg.type === "CENDO_AUTO_SET_PAGES") {
    const n = Math.max(0, parseInt(msg.pages, 10) || 0);
    chrome.storage.local.set({ autoScanPages: n });
    return;
  }
  if (msg.type === "CENDO_AUTO_SET_TIME") {
    const h = Math.min(23, Math.max(0, parseInt(msg.hour, 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(msg.minute, 10) || 0));
    chrome.storage.local.set({ autoRunHour: h, autoRunMinute: m }).then(autoEnsureAlarm);
    return;
  }
});
function waitAutoStatus(sessionId, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      autoWaiters.delete(sessionId);
      resolve({ state: "timeout" });
    }, timeoutMs);
    autoWaiters.set(sessionId, {
      resolve: (v) => {
        clearTimeout(timer);
        resolve(v);
      },
    });
  });
}

// ---------- xu ly 1 don (tab da o trang don) ----------
async function autoProcessOrder(tabId, order, log) {
  // 1. kiem tra dieu kien
  const chk = await autoSendTab(tabId, { type: "AUTO_CHECK_ORDER" }, 25, 400);
  if (!chk) return { kind: "error", reason: "Không đọc được trang đơn (content script không phản hồi)" };
  const { att, media } = chk;
  if (media.mockup === null || media.design === null)
    return { kind: "error", reason: "Không thấy khu Media (Mockup/Design) trên trang đơn" };
  if (media.mockup && media.design) return { kind: "already_done" };
  if (media.mockup !== media.design)
    return { kind: "review", reason: "Media điền dở (chỉ 1 trong 2 ô có ảnh) — cần người kiểm tra" };
  if (att === 0) return { kind: "link" };
  if (att !== 12 && att !== 16)
    return { kind: "review", reason: "Attachments có " + att + " ảnh (tool cần đúng 12 hoặc 16)" };

  // 2. khoi dong luong embed AUTO
  const start = await autoSendTab(tabId, { type: "AUTO_PROCESS_START" }, 5, 400);
  if (!start || !start.ok)
    return { kind: "error", reason: "Không mở được popup xử lý: " + ((start && start.error) || "không rõ") };
  const sessionId = start.sessionId;

  // 3. doi ket qua xu ly trong iframe (mockup_ready / error)
  const status = await waitAutoStatus(sessionId, AUTO.ORDER_TIMEOUT_MS);
  if (status.state !== "mockup_ready") {
    await autoSendTab(tabId, { type: "AUTO_CLOSE_MODAL" }, 3, 300);
    try { sessions.delete(sessionId); } catch (_) {}
    return {
      kind: "error",
      reason: status.state === "timeout" ? "Quá " + AUTO.ORDER_TIMEOUT_MS / 1000 + "s chưa xử lý xong" : (status.error || "Lỗi xử lý ảnh"),
    };
  }
  const warnings = status.warnings || [];

  // 4. content-source tu bam "Dien vao don" -> background dien Media.
  //    Poll den khi ca 2 o co anh.
  const t0 = Date.now();
  while (Date.now() - t0 < AUTO.FILL_TIMEOUT_MS) {
    await autoSleep(AUTO.FILL_POLL_MS);
    const c = await autoSendTab(tabId, { type: "AUTO_CHECK_ORDER" }, 3, 300);
    if (c && c.media && c.media.mockup && c.media.design) {
      return { kind: "done", warnings };
    }
  }
  await autoSendTab(tabId, { type: "AUTO_CLOSE_MODAL" }, 3, 300);
  return { kind: "error", reason: "Đã xử lý xong ảnh nhưng chưa thấy Mockup/Design vào ô Media sau " + AUTO.FILL_TIMEOUT_MS / 1000 + "s" };
}

// ---------- bao cao Lark ----------
function buildLarkText(log) {
  const L = [];
  L.push("Thông báo — Bot xử lý đơn Flip Photo Book (" + nowHM() + " " + todayKey() + ")");
  L.push("Các đơn Hộp quay ảnh kỉ niệm - Flip Photo Book trên hệ thống đã tự động làm, các con vợ vào check nhé");
  const fmt = (arr) => (arr.length ? arr.join("\n") : null);

  L.push("✅ Đã làm (" + log.done.length + "): " + (log.done.length ? log.done.map((d) => d.id).join(", ") : "Không có"));

  const review = [];
  for (const d of log.done) if (d.warnings && d.warnings.length) review.push(d.id + " — " + d.warnings.join("; "));
  for (const r of log.review) review.push(r.id + " — " + r.reason);
  L.push("⚠️ Cần xem lại (" + review.length + "):" + (review.length ? "\n" + fmt(review) : " Không có"));

  L.push("🔗 Đơn dạng link, chưa tự làm (" + log.links.length + "): " + (log.links.length ? log.links.join(", ") : "Không có"));

  const errs = log.errors.map((e) => e.id + " — " + e.reason);
  L.push("❌ Lỗi (" + errs.length + "):" + (errs.length ? "\n" + fmt(errs) : " Không có"));

  const scope = log.scanPages === 0 ? "tất cả các trang" : log.scanPages + " trang đầu";
  L.push("(Phạm vi: " + scope + " — đã rà " + log.scanned + " đơn Flip có tag Up đủ thông tin, " + log.skippedDone + " đơn đã làm từ trước" + (log.capped ? "; đạt trần " + AUTO.MAX_PROCESS + " đơn/lượt, còn lại để lượt sau" : "") + ")");
  if (log.fatal) L.push("⛔ Bot dừng giữa chừng: " + log.fatal);
  return L.join("\n");
}
async function sendLark(text) {
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(AUTO.LARK_HOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ msg_type: "text", content: { text } }),
      });
      const body = await res.text();
      if (res.ok && /success/i.test(body)) return true;
      console.warn("[Cendo AUTO] Lark tra ve:", res.status, body);
    } catch (e) {
      console.warn("[Cendo AUTO] Lark loi:", e);
    }
    await autoSleep(3000);
  }
  return false;
}

// ---------- luot chay chinh ----------
let autoRunning = false;
async function autoRunDaily(source) {
  if (autoRunning) {
    console.log("[Cendo AUTO] dang chay, bo qua trigger", source);
    return;
  }
  const st = await chrome.storage.local.get({ lastRunDate: "", autoEnabled: true });
  if (source !== "manual") {
    if (!st.autoEnabled) return;
    if (st.lastRunDate === todayKey()) {
      console.log("[Cendo AUTO] hom nay da chay roi, bo qua", source);
      return;
    }
  }
  autoRunning = true;
  // MV3: service worker bi tat sau ~30s khong co hoat dong chrome API.
  // Heartbeat 20s/lan de giu SW song suot luot chay (keepalive chuan cho MV3).
  const keepAlive = setInterval(() => {
    try { chrome.runtime.getPlatformInfo(() => {}); } catch (_) {}
  }, 20000);
  const log = {
    source,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    running: true,
    scanned: 0,
    skippedDone: 0,
    capped: false,
    done: [],    // {id, warnings[]}
    review: [],  // {id, reason}
    links: [],   // id
    errors: [],  // {id, reason}
    fatal: null,
  };
  await chrome.storage.local.set({ lastRunLog: log, lastRunDate: todayKey() });
  let workTab = null;
  try {
    console.log("[Cendo AUTO] bat dau, nguon:", source);
    workTab = await chrome.tabs.create({ url: AUTO.ORDERS_URL, active: false });
    await autoWaitTabComplete(workTab.id);
    await autoSleep(1800);

    const ping = await autoSendTab(workTab.id, { type: "AUTO_PING" }, 20, 500);
    if (!ping) throw new Error("cendo.work không phản hồi (chưa đăng nhập? mạng?)");

    // KHONG loc tag nua (yeu cau 14/08): cu thay don Flip Photo Book chua co
    // Mockup/Design la lam. Danh sach de nguyen mac dinh (moi nhat truoc).

    // quet cac trang, gom don Flip CO badge "Up đủ thông tin" (doc tren dong,
    // khong dung Filter tags). So trang do nguoi dung chon (0 = tat ca).
    const scanPages = await getScanPages();
    const pageLimit = scanPages === 0 ? AUTO.MAX_PAGES_ALL : scanPages;
    log.scanPages = scanPages;
    const seen = new Set();
    const candidates = [];
    for (let p = 1; p <= pageLimit; p++) {
      const pageData = await autoSendTab(workTab.id, { type: "AUTO_LIST_PAGE", tag: AUTO.TAG }, 5, 400);
      if (pageData && pageData.orders) {
        for (const o of pageData.orders) {
          if (!o.href || seen.has(o.href)) continue;
          seen.add(o.href);
          candidates.push(o);
        }
      }
      const nx = await autoSendTab(workTab.id, { type: "AUTO_NEXT_PAGE" }, 3, 400);
      if (!nx || !nx.changed) break;
    }
    console.log("[Cendo AUTO] tong don Flip tim thay:", candidates.length);
    log.scanned = candidates.length;

    // xu ly tung don
    let processed = 0;
    for (const order of candidates) {
      if (processed >= AUTO.MAX_PROCESS) {
        log.capped = true;
        break;
      }
      const url = new URL(order.href, AUTO.ORIGIN).href;
      try {
        await chrome.tabs.update(workTab.id, { url });
        await autoWaitTabComplete(workTab.id);
        await autoSleep(1500);
        let r = await autoProcessOrder(workTab.id, order, log);
        if (r.kind === "error") {
          // thu lai 1 lan
          console.warn("[Cendo AUTO] don", order.id, "loi:", r.reason, "-> thu lai");
          await chrome.tabs.update(workTab.id, { url });
          await autoWaitTabComplete(workTab.id);
          await autoSleep(2000);
          r = await autoProcessOrder(workTab.id, order, log);
        }
        if (r.kind === "already_done") log.skippedDone++;
        else if (r.kind === "link") log.links.push(order.id);
        else if (r.kind === "review") log.review.push({ id: order.id, reason: r.reason });
        else if (r.kind === "done") {
          log.done.push({ id: order.id, warnings: r.warnings });
          processed++;
        } else if (r.kind === "error") log.errors.push({ id: order.id, reason: r.reason });
      } catch (e) {
        log.errors.push({ id: order.id, reason: String((e && e.message) || e) });
      }
      await chrome.storage.local.set({ lastRunLog: log });
    }
  } catch (e) {
    log.fatal = String((e && e.message) || e);
    console.error("[Cendo AUTO] loi nghiem trong:", e);
  } finally {
    if (workTab) {
      try { await chrome.tabs.remove(workTab.id); } catch (_) {}
    }
    log.finishedAt = new Date().toISOString();
    log.running = false;
    // bao cao Lark (luon gui, ke ca 0 don / loi)
    let text;
    if (log.fatal && !log.done.length && !log.review.length && !log.errors.length && !log.links.length) {
      text = "Thông báo — Bot xử lý đơn Flip Photo Book (" + nowHM() + " " + todayKey() + "): KHÔNG chạy được — " + log.fatal + ". Nhờ người vào xử lý tay.";
    } else if (!log.done.length && !log.review.length && !log.errors.length && !log.links.length) {
      text = "Thông báo — Bot xử lý đơn Flip Photo Book (" + nowHM() + " " + todayKey() + "): không có đơn Flip Photo Book mới cần làm (đã rà " + log.scanned + " đơn, " + log.skippedDone + " đơn đã làm từ trước).";
    } else {
      text = buildLarkText(log);
    }
    log.larkOk = await sendLark(text);
    await chrome.storage.local.set({ lastRunLog: log });
    clearInterval(keepAlive);
    autoRunning = false;
    console.log("[Cendo AUTO] xong:", JSON.stringify({ done: log.done.length, review: log.review.length, links: log.links.length, errors: log.errors.length, larkOk: log.larkOk }));
  }
}
