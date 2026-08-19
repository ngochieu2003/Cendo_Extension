// ============================================================================
// content-order.js — chay tren cendo.work (top frame)
//  - Nut "Xu ly & dien Mockup/Design" tren trang chi tiet don (nhu cu).
//  - Bo lenh AUTO_* phuc vu bot 8h30 (auto-run.js dieu khien qua message):
//      AUTO_PING / AUTO_FILTER / AUTO_LIST_PAGE / AUTO_NEXT_PAGE /
//      AUTO_CHECK_ORDER / AUTO_PROCESS_START / AUTO_CLOSE_MODAL
// ============================================================================

const EMBED_URL = "https://cendoauto.art/tools/photo-line";
const ATTACH_SELECTOR = 'a[class*="attachments_item__"]';
const EXPECTED = [12, 16];
const sleepA = (ms) => new Promise((r) => setTimeout(r, ms));

function collectAttachmentUrls() {
  const links = document.querySelectorAll(ATTACH_SELECTOR);
  const urls = [];
  const seen = new Set();
  for (const a of links) {
    const u = a.href || a.getAttribute("download");
    if (u && !seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  }
  return urls;
}

// Tim link folder Google Drive (khi Attachments khong gan anh truc tiep,
// nhan vien dan link Drive vao note). Quet anchor, input/textarea, roi text.
function findDriveFolderUrl() {
  const re =
    /https?:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9_-]+[^\s"'<>]*/;
  for (const a of document.querySelectorAll('a[href*="drive.google.com"]')) {
    if (/\/folders\//.test(a.href)) return a.href;
  }
  for (const el of document.querySelectorAll("input, textarea")) {
    const m = (el.value || "").match(re);
    if (m) return m[0];
  }
  const m = (document.body.innerText || "").match(re);
  return m ? m[0] : null;
}

// ---- modal iframe ----
let overlayEl = null;
function openModal(sessionId, manual, auto) {
  closeModal();
  overlayEl = document.createElement("div");
  overlayEl.id = "cendo-embed-overlay";
  overlayEl.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;background:rgba(20,12,8,.62);" +
    "display:flex;align-items:center;justify-content:center;";

  const card = document.createElement("div");
  card.style.cssText =
    "width:94vw;height:94vh;background:#fff;border-radius:14px;overflow:hidden;" +
    "display:flex;flex-direction:column;box-shadow:0 12px 48px rgba(0,0,0,.4);";

  const bar = document.createElement("div");
  bar.style.cssText =
    "flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;" +
    "padding:8px 14px;background:#2b1d16;color:#fff;font-family:system-ui,Arial;font-size:14px;";
  const title = document.createElement("span");
  title.textContent = auto
    ? "Bot dang xu ly anh tu dong — cendoauto.art"
    : "Xu ly anh — cendoauto.art (dang nhung)";
  const close = document.createElement("button");
  close.textContent = "✕ Dong";
  close.style.cssText =
    "cursor:pointer;border:none;border-radius:7px;padding:6px 12px;font-weight:600;" +
    "background:#e8552d;color:#fff;";
  close.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "CENDO_EMBED_CANCEL", sessionId });
    closeModal();
  });
  bar.appendChild(title);
  bar.appendChild(close);

  const iframe = document.createElement("iframe");
  iframe.src =
    EMBED_URL +
    "?cendo_embed=" +
    encodeURIComponent(sessionId) +
    (manual ? "&mode=upload" : "") +
    (auto ? "&cendo_auto=1" : "");
  iframe.style.cssText = "flex:1 1 auto;width:100%;height:100%;border:0;";
  iframe.setAttribute("allow", "clipboard-read; clipboard-write");

  card.appendChild(bar);
  card.appendChild(iframe);
  overlayEl.appendChild(card);
  document.body.appendChild(overlayEl);
}
function closeModal() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

async function onClickProcess() {
  const urls = collectAttachmentUrls();

  // Nguon 2: don khong gan anh o Attachments (anh nam o link external note)
  //  -> KHONG tu tai ve nua. Mo thang popup de nhan vien TU UP anh (ZIP/thu muc).
  if (urls.length === 0) {
    setBtnState("Đang mở cửa sổ upload...");
    chrome.runtime.sendMessage({ type: "CENDO_EMBED_START", manual: true }, (resp) => {
      setBtnState(null);
      if (chrome.runtime.lastError) {
        alert("Loi extension: " + chrome.runtime.lastError.message);
        return;
      }
      if (!resp || !resp.ok) {
        alert("Khong mo duoc cua so: " + (resp && resp.error ? resp.error : "khong ro"));
        return;
      }
      openModal(resp.sessionId, true); // che do upload thu cong
    });
    return;
  }

  // Nguon 1: anh gan truc tiep o Attachments -> tu dong tai ve nhu cu
  if (!EXPECTED.includes(urls.length)) {
    const go = confirm(
      "Attachments co " +
        urls.length +
        " anh (yeu cau " +
        EXPECTED.join(" hoac ") +
        "). Van tiep tuc?"
    );
    if (!go) return;
  }
  setBtnState("Đang tải " + urls.length + " ảnh input...");
  chrome.runtime.sendMessage(
    { type: "CENDO_EMBED_START", attachmentUrls: urls },
    (resp) => {
      setBtnState(null);
      if (chrome.runtime.lastError) {
        alert("Loi extension: " + chrome.runtime.lastError.message);
        return;
      }
      if (!resp || !resp.ok) {
        alert("Khong tai duoc anh input: " + (resp && resp.error ? resp.error : "khong ro"));
        return;
      }
      openModal(resp.sessionId);
    }
  );
}

// ---- nut noi ----
let btnEl = null;
const BTN_LABEL = "⚡ Xử lý đơn Flip Photo Book";
function setBtnState(text) {
  if (!btnEl) return;
  btnEl.disabled = !!text;
  btnEl.textContent = text || BTN_LABEL;
  btnEl.style.opacity = text ? "0.7" : "1";
}
function injectButton() {
  // chi hien tren trang co Attachments (trang chi tiet don)
  if (document.getElementById("cendo-order-btn")) return;
  if (!isOrderDetail()) return;
  btnEl = document.createElement("button");
  btnEl.id = "cendo-order-btn";
  btnEl.textContent = BTN_LABEL;
  // Dat o goc phai, ngay TREN nut hong "Tao mockup Raccoonie"
  btnEl.style.cssText =
    "position:fixed;right:24px;bottom:76px;z-index:2147483646;cursor:pointer;" +
    "border:none;border-radius:10px;padding:12px 18px;font-size:14px;font-weight:700;" +
    "color:#fff;background:#e8552d;box-shadow:0 3px 12px rgba(0,0,0,.3);" +
    "font-family:system-ui,Arial,sans-serif;";
  btnEl.addEventListener("click", () => onClickProcess());
  document.body.appendChild(btnEl);
}

// Trang chi tiet don? (co khu Media/Upload, hoac Attachments, hoac .OrderPage)
// -> hien nut du don co Attachments hay chi co link Google Drive.
function isOrderDetail() {
  return !!(
    document.querySelector('[class*="controller_container__"]') ||
    document.querySelector(ATTACH_SELECTOR) ||
    document.querySelector(".OrderPage")
  );
}

// ---- Widget BOT tren trang DANH SACH don (/orders) ----
// Pill kieu "Auto: BAT 08:30" -> bam mo panel: bat/tat, chinh gio, chay ngay.
function isOrdersList() {
  return /^\/orders\/?$/.test(location.pathname);
}
const BOT_LABEL = "Tự động làm đơn Hộp quay ảnh kỉ niệm - Flip Photo Book";
function fmtHM(h, m) {
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}
async function refreshBotWidget() {
  const w = document.getElementById("cendo-bot-widget");
  if (!w) return;
  let st;
  try {
    st = await chrome.storage.local.get({
      autoEnabled: true,
      autoRunHour: 8,
      autoRunMinute: 30,
      autoScanPages: 2,
      lastRunLog: null,
    });
  } catch (_) {
    return; // extension vua reload, context cu — bo qua
  }
  const pill = w.querySelector("#cendo-bot-pill");
  if (pill) {
    pill.style.background = st.autoEnabled ? "#2e9e5b" : "#8a7a6f";
    pill.textContent =
      "🤖 " + BOT_LABEL + ": " +
      (st.autoEnabled ? "BẬT " + fmtHM(st.autoRunHour, st.autoRunMinute) : "TẮT");
  }
  const chk = w.querySelector("#cendo-bot-enabled");
  if (chk && document.activeElement !== chk) chk.checked = !!st.autoEnabled;
  const t = w.querySelector("#cendo-bot-time");
  if (t && document.activeElement !== t) t.value = fmtHM(st.autoRunHour, st.autoRunMinute);
  const sp = w.querySelector("#cendo-bot-pages");
  if (sp && document.activeElement !== sp) sp.value = String(st.autoScanPages);
  const run = w.querySelector("#cendo-bot-run");
  if (run && st.lastRunLog && st.lastRunLog.running) {
    run.disabled = true;
    run.textContent = "🤖 Bot đang chạy (tab riêng)...";
  }
}
function injectBotWidget() {
  if (document.getElementById("cendo-bot-widget")) return;
  if (!isOrdersList()) return;
  const w = document.createElement("div");
  w.id = "cendo-bot-widget";
  w.style.cssText =
    "position:fixed;left:24px;bottom:24px;z-index:2147483646;display:flex;" +
    "flex-direction:column;gap:8px;align-items:flex-start;" +
    "font-family:system-ui,Arial,sans-serif;";

  const panel = document.createElement("div");
  panel.id = "cendo-bot-panel";
  panel.style.cssText =
    "display:none;background:#fff;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.25);" +
    "padding:14px;width:300px;color:#2b1d16;";
  panel.innerHTML =
    '<div style="font-weight:700;font-size:13px;margin-bottom:10px;">' + BOT_LABEL + "</div>" +
    '<label style="display:flex;align-items:center;justify-content:space-between;font-size:13px;margin-bottom:8px;cursor:pointer;">' +
    "Tự động chạy hằng ngày" +
    '<input type="checkbox" id="cendo-bot-enabled" style="width:18px;height:18px;accent-color:#2e9e5b;cursor:pointer;"></label>' +
    '<label style="display:flex;align-items:center;justify-content:space-between;font-size:13px;margin-bottom:10px;">' +
    "Giờ chạy" +
    '<input type="time" id="cendo-bot-time" value="08:30" style="font-family:inherit;font-size:13px;padding:4px 6px;border:1px solid #d8cfc8;border-radius:8px;background:#fff;"></label>' +
    '<label style="display:flex;align-items:center;justify-content:space-between;font-size:13px;margin-bottom:10px;">' +
    "Phạm vi quét" +
    '<select id="cendo-bot-pages" style="font-family:inherit;font-size:13px;padding:4px 6px;border:1px solid #d8cfc8;border-radius:8px;background:#fff;">' +
    '<option value="1">1 trang đầu</option>' +
    '<option value="2">2 trang đầu</option>' +
    '<option value="3">3 trang đầu</option>' +
    '<option value="5">5 trang đầu</option>' +
    '<option value="0">Tất cả các trang</option>' +
    "</select></label>" +
    '<div style="font-size:11px;color:#8a7a6f;margin:-4px 0 10px;">Chỉ làm đơn Flip Photo Book có tag <b>Up đủ thông tin</b> và Mockup/Design còn trống.</div>' +
    '<button id="cendo-bot-run" style="width:100%;cursor:pointer;border:none;border-radius:99px;padding:9px 14px;font-size:13px;font-weight:700;color:#fff;background:#e8552d;">▶ Chạy ngay bây giờ</button>' +
    '<div style="font-size:11px;color:#8a7a6f;margin-top:8px;">Kết quả báo vào nhóm Lark. Nếu đến giờ mà Chrome chưa mở, bot chạy bù khi bạn mở Chrome.</div>';

  const pill = document.createElement("button");
  pill.id = "cendo-bot-pill";
  pill.style.cssText =
    "cursor:pointer;border:none;border-radius:99px;padding:10px 16px;font-size:13px;" +
    "font-weight:700;color:#fff;background:#2e9e5b;box-shadow:0 3px 12px rgba(0,0,0,.3);";
  pill.textContent = "🤖 " + BOT_LABEL;

  w.appendChild(panel);
  w.appendChild(pill);
  document.body.appendChild(w);

  pill.addEventListener("click", () => {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
    refreshBotWidget();
  });
  panel.querySelector("#cendo-bot-enabled").addEventListener("change", (e) => {
    chrome.runtime.sendMessage({ type: "CENDO_AUTO_SET_ENABLED", enabled: e.target.checked });
    setTimeout(refreshBotWidget, 400);
  });
  panel.querySelector("#cendo-bot-pages").addEventListener("change", (e) => {
    chrome.runtime.sendMessage({ type: "CENDO_AUTO_SET_PAGES", pages: e.target.value });
    setTimeout(refreshBotWidget, 400);
  });
  panel.querySelector("#cendo-bot-time").addEventListener("change", (e) => {
    const parts = (e.target.value || "08:30").split(":");
    chrome.runtime.sendMessage({ type: "CENDO_AUTO_SET_TIME", hour: parts[0], minute: parts[1] });
    setTimeout(refreshBotWidget, 400);
  });
  panel.querySelector("#cendo-bot-run").addEventListener("click", (e) => {
    e.target.disabled = true;
    e.target.textContent = "🤖 Bot đang chạy (tab riêng)...";
    chrome.runtime.sendMessage({ type: "CENDO_AUTO_RUN_NOW" });
    setTimeout(() => {
      e.target.disabled = false;
      e.target.textContent = "▶ Chạy ngay bây giờ";
      refreshBotWidget();
    }, 12000);
  });
  refreshBotWidget();
}
// cap nhat pill khi doi cai dat tu popup / bot dang chay
try {
  chrome.storage.onChanged.addListener(() => refreshBotWidget());
} catch (_) {}

// gan lai nut khi SPA doi trang (roi khoi trang don -> go nut)
function refreshButton() {
  const onOrder = isOrderDetail();
  const existing = document.getElementById("cendo-order-btn");
  if (onOrder && !existing) injectButton();
  if (!onOrder && existing) {
    existing.remove();
    btnEl = null;
  }
  const botW = document.getElementById("cendo-bot-widget");
  if (isOrdersList() && !botW) injectBotWidget();
  if (!isOrdersList() && botW) botW.remove();
}
refreshButton();
new MutationObserver(() => refreshButton()).observe(document.documentElement, {
  childList: true,
  subtree: true,
});

// ============================================================================
// BOT AUTO — cac lenh do auto-run.js (service worker) goi
// ============================================================================

// Trang thai 2 o Media: null = chua thay controller, true/false = co/khong co anh
function mediaState() {
  const cs = document.querySelectorAll('[class*="controller_container__"]');
  const st = { mockup: null, design: null };
  for (const c of cs) {
    const head = c.querySelector('[class*="controller_header__"]');
    const h = ((head ? head.textContent : c.textContent) || "").trim().toLowerCase();
    const has = !!c.querySelector("img");
    if (h.startsWith("mockup")) st.mockup = has;
    else if (h.startsWith("design")) st.design = has;
  }
  return st;
}

// Ap filter tag tren trang /orders
async function autoApplyFilter(tagName) {
  const open = Array.from(document.querySelectorAll("button, span, div")).find(
    (e) =>
      e.childElementCount <= 1 &&
      /Filter tags/i.test(e.textContent || "") &&
      (e.textContent || "").length < 20
  );
  if (!open) return { ok: false, error: "Không thấy nút Filter tags (đang ở trang /orders?)" };
  open.click();
  await sleepA(700);
  const chip = Array.from(document.querySelectorAll("div,button,span")).find(
    (e) =>
      e.childElementCount === 0 &&
      e.textContent.trim() === tagName &&
      e.closest('[class*="modal"], .modal, [role="dialog"]')
  );
  if (!chip) return { ok: false, error: 'Không thấy tag "' + tagName + '" trong hộp Filter by tags' };
  chip.click();
  await sleepA(300);
  const search = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent.trim() === "Search"
  );
  if (!search) return { ok: false, error: "Không thấy nút Search trong hộp filter" };
  search.click();
  await sleepA(2500);
  return { ok: true, rows: document.querySelectorAll("tbody tr[data-id]").length };
}

// Doc trang danh sach hien tai -> cac don Flip Photo Book
// Cau truc bang: moi don = 3 <tr>: tr[data-id] (row) + tr meta (tags) + tr items (san pham)
// requiredTag: chi lay don co badge tag nay (vd "Up đủ thông tin") o dong meta
// duoi ID — badge la element class chua "tags_tag__". Bo trong = khong doi tag.
function autoListPage(requiredTag) {
  const orders = [];
  const rows = Array.from(document.querySelectorAll("tbody tr[data-id]"));
  for (const tr of rows) {
    let sib = tr.nextElementSibling;
    let txt = "";
    const tags = [];
    while (sib && !sib.getAttribute("data-id")) {
      txt += (sib.innerText || "") + " ";
      for (const t of sib.querySelectorAll('[class*="tags_tag__"]')) tags.push((t.textContent || "").trim());
      sib = sib.nextElementSibling;
    }
    if (!/Flip Photo Book/i.test(txt)) continue;
    if (requiredTag && !tags.includes(requiredTag)) continue;
    const a = tr.querySelector("a[href]");
    if (!a) continue;
    orders.push({ id: (a.textContent || "").trim(), href: a.getAttribute("href"), tags });
  }
  return { orders, rowCount: rows.length };
}

// Sang trang ke tiep (nut ›). Tra {changed:false} neu het trang.
async function autoNextPage() {
  const firstRow = document.querySelector("tbody tr[data-id]");
  const prev = firstRow ? firstRow.getAttribute("data-id") : null;
  const li = Array.from(document.querySelectorAll("ul.pagination li, li")).find(
    (x) => x.textContent.trim() === "›"
  );
  if (!li || /disabled/.test(li.className || "")) return { changed: false };
  (li.querySelector("a,button") || li).click();
  for (let i = 0; i < 28; i++) {
    await sleepA(250);
    const cur = document.querySelector("tbody tr[data-id]");
    const id = cur ? cur.getAttribute("data-id") : null;
    if (id && id !== prev) return { changed: true };
  }
  return { changed: false };
}

// Khoi dong luong embed o che do AUTO (khong alert, khong confirm)
function autoProcessStart(sendResponse) {
  const urls = collectAttachmentUrls();
  if (urls.length === 0) {
    sendResponse({ ok: false, error: "Đơn không có ảnh Attachments" });
    return;
  }
  chrome.runtime.sendMessage(
    { type: "CENDO_EMBED_START", attachmentUrls: urls },
    (resp) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      if (!resp || !resp.ok) {
        sendResponse({ ok: false, error: (resp && resp.error) || "không rõ" });
        return;
      }
      openModal(resp.sessionId, false, true); // auto mode
      sendResponse({ ok: true, sessionId: resp.sessionId });
    }
  );
}

// ---- nhan lenh tu background/auto-run ----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;
  if (msg.type === "CENDO_EMBED_CLOSE") {
    closeModal();
    return;
  }
  if (msg.type === "AUTO_PING") {
    sendResponse({ ok: true, orderPage: isOrderDetail() });
    return;
  }
  if (msg.type === "AUTO_FILTER") {
    autoApplyFilter(msg.tag || "Up đủ thông tin").then(sendResponse);
    return true;
  }
  if (msg.type === "AUTO_LIST_PAGE") {
    sendResponse(autoListPage(msg.tag || ""));
    return;
  }
  if (msg.type === "AUTO_NEXT_PAGE") {
    autoNextPage().then(sendResponse);
    return true;
  }
  if (msg.type === "AUTO_CHECK_ORDER") {
    (async () => {
      // doi React render khu Media (toi da 10s)
      for (let i = 0; i < 40; i++) {
        const m = mediaState();
        if (m.mockup !== null && m.design !== null) break;
        await sleepA(250);
      }
      sendResponse({ att: collectAttachmentUrls().length, media: mediaState() });
    })();
    return true;
  }
  if (msg.type === "AUTO_PROCESS_START") {
    autoProcessStart(sendResponse);
    return true;
  }
  if (msg.type === "AUTO_CLOSE_MODAL") {
    closeModal();
    sendResponse({ ok: true });
    return;
  }
});
