// ============================================================================
// content-source.js — chay tren cendoauto.art (ke ca trong iframe, all_frames)
//  - CHE DO EMBED (URL co ?cendo_embed=<sid>): tu do anh input vao dropzone,
//    bam "Bat dau xu ly", roi hien nut "Dien vao don" -> gui ket qua ve background.
//  - CHE DO AUTO (them &cendo_auto=1, bot 8h30): khong can nguoi bam — tu doi
//    Mockup xong, gom canh bao, tu goi embedFill(); loi thi bao ve background
//    bang CENDO_AUTO_STATUS (KHONG alert — alert lam treo tu dong hoa).
//  - CHE DO STANDALONE (mo cendoauto.art truc tiep): nut "Gui sang cendo.work"
//    tu tim don + dien (luong v1).
// ============================================================================

const CONFIG = {
  MOCKUP_IMG_SELECTOR: 'img[src*="Mockup.png"]',
  MOCKUP_FILE: "Mockup.png",
  DESIGN_FILE: "Design.png",
  START_BUTTON_TEXT: "Bắt đầu xử lý",
  FOLDER_INPUT_SELECTOR: 'input[type="file"][webkitdirectory]',
};

const EMBED_SID = new URLSearchParams(location.search).get("cendo_embed");
const IS_EMBED = !!EMBED_SID;
// Che do TU UP anh: nhan vien tu keo/tha ZIP/thu muc, KHONG auto lay anh ve.
const IS_MANUAL = new URLSearchParams(location.search).get("mode") === "upload";
// Che do BOT: khong co nguoi ngoi truoc man hinh.
const IS_AUTO = new URLSearchParams(location.search).get("cendo_auto") === "1";

// Bao loi/trang thai ve bot. Che do thuong thi van alert nhu cu.
function autoReport(state, extra) {
  chrome.runtime.sendMessage(
    Object.assign({ type: "CENDO_AUTO_STATUS", sessionId: EMBED_SID, state }, extra || {})
  );
}
function failUser(message) {
  if (IS_AUTO) autoReport("error", { error: message });
  else alert(message);
}

// ---------------- tien ich chung ----------------
async function urlToDataUrl(url) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("HTTP " + res.status + " khi tai " + url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
function dataUrlToFile(dataUrl, name) {
  const [head, b64] = dataUrl.split(",");
  const mime = (head.match(/data:([^;]+)/) || [])[1] || "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name || "image.jpg", { type: mime });
}
function setInputFiles(input, files) {
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);
  input.files = dt.files;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
function waitFor(fn, timeout = 15000, interval = 150) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const id = setInterval(() => {
      let v = null;
      try {
        v = fn();
      } catch (_) {}
      if (v) {
        clearInterval(id);
        resolve(v);
      } else if (Date.now() - t0 > timeout) {
        clearInterval(id);
        resolve(null);
      }
    }, interval);
  });
}
function findMockupUrl() {
  const img = document.querySelector(CONFIG.MOCKUP_IMG_SELECTOR);
  return img ? img.currentSrc || img.src : null;
}

// ================= CHE DO EMBED =================
let embedFed = false;
async function embedAutoFeed() {
  if (embedFed) return;
  embedFed = true;
  console.log("[Cendo Bridge] embed: lay anh input, sid=", EMBED_SID);
  const resp = await chrome.runtime.sendMessage({ type: "CENDO_EMBED_GET", sessionId: EMBED_SID });
  if (!resp || !resp.ok || !resp.images) {
    failUser("Khong lay duoc anh input (" + (resp && resp.error ? resp.error : "loi") + ").");
    return;
  }
  const files = resp.images.map((im, i) => dataUrlToFile(im.dataUrl, im.name || "input_" + (i + 1) + ".jpg"));
  console.log("[Cendo Bridge] embed: so anh =", files.length);

  const input = await waitFor(() => document.querySelector(CONFIG.FOLDER_INPUT_SELECTOR), 15000);
  if (!input) {
    failUser("Khong thay o chon thu muc tren trang cendoauto.art.");
    return;
  }
  setInputFiles(input, files);

  const startBtn = await waitFor(
    () =>
      Array.from(document.querySelectorAll("button")).find(
        (b) => (b.textContent || "").includes(CONFIG.START_BUTTON_TEXT) && !b.disabled
      ),
    8000
  );
  if (startBtn) {
    console.log("[Cendo Bridge] embed: bam Bat dau xu ly");
    startBtn.click();
  } else {
    console.warn("[Cendo Bridge] embed: khong thay nut Bat dau xu ly (kiem tra so luong anh 12/16?)");
    if (IS_AUTO) autoReport("error", { error: "Không bấm được nút Bắt đầu xử lý (số ảnh không hợp lệ?)" });
  }
}

async function embedFill() {
  const mockupUrl = findMockupUrl();
  if (!mockupUrl) {
    failUser("Chua co ket qua Mockup. Doi xu ly xong (man hinh mockup) roi bam lai.");
    return;
  }
  const designUrl = mockupUrl.replace(CONFIG.MOCKUP_FILE, CONFIG.DESIGN_FILE);
  setStatus("Dang lay ket qua...");
  const items = [];
  try {
    items.push({ slot: "mockup", name: CONFIG.MOCKUP_FILE, dataUrl: await urlToDataUrl(mockupUrl) });
  } catch (e) {
    setStatus(null);
    failUser("Loi tai Mockup: " + (e && e.message ? e.message : e));
    return;
  }
  try {
    items.push({ slot: "design", name: CONFIG.DESIGN_FILE, dataUrl: await urlToDataUrl(designUrl) });
  } catch (_) {}
  setStatus("Dang dien vao don...");
  chrome.runtime.sendMessage({ type: "CENDO_EMBED_RESULT", sessionId: EMBED_SID, items }, () => {
    // modal se dong & Media duoc dien o phia cendo.work
  });
}

// ================= CHE DO AUTO (bot 8h30) =================
// Gom cac dong canh bao tieng Viet tren man hinh ket qua (anh ghep, can
// designer, line phai mat, anh hong bi bo qua...) de dua vao bao cao Lark.
function collectWarnings() {
  const texts = new Set();
  const re =
    /GHÉP nhiều ảnh|cần designer|nghi đường line|Không đọc được|đã bỏ qua|Thiếu bản|cần tách\/cắt/i;
  for (const el of document.querySelectorAll("p, li, div")) {
    if (el.childElementCount !== 0) continue;
    const t = (el.textContent || "").trim();
    if (t.length < 8 || t.length > 240) continue;
    if (re.test(t)) texts.add(t);
  }
  return Array.from(texts);
}
// Banner loi cua tool hub: div class chua "border-accent" + nut "Thử lại"
function findErrorBanner() {
  for (const div of document.querySelectorAll("div")) {
    if (!/border-accent/.test(String(div.className || ""))) continue;
    const retry = Array.from(div.querySelectorAll("button")).find((b) =>
      /Thử lại/i.test(b.textContent || "")
    );
    if (retry) {
      const p = div.querySelector("p");
      return (p && p.textContent.trim()) || "Lỗi xử lý (không đọc được thông báo)";
    }
  }
  return null;
}
async function autoWatch() {
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    if (findMockupUrl()) {
      await new Promise((r) => setTimeout(r, 1500)); // doi canh bao render du
      autoReport("mockup_ready", { warnings: collectWarnings() });
      await new Promise((r) => setTimeout(r, 600));
      embedFill();
      return;
    }
    const err = findErrorBanner();
    if (err) {
      autoReport("error", { error: err });
      return;
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  autoReport("error", { error: "Quá 150 giây chưa thấy kết quả Mockup" });
}

// ================= CHE DO STANDALONE (v1) =================
function jobIdFromUrl(url) {
  const m = url.match(/\/api\/jobs\/([^/]+)\/files\//);
  return m ? m[1] : null;
}
async function getOrderId(mockupUrl) {
  const jobId = jobIdFromUrl(mockupUrl);
  if (!jobId) return null;
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch("/api/jobs/" + jobId + "/download", { method, credentials: "include" });
      const cd = res.headers.get("content-disposition") || "";
      const m = cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="?([^";]+)"?/i);
      if (m) return decodeURIComponent(m[1]).replace(/\.zip$/i, "").trim();
    } catch (_) {}
  }
  return null;
}
async function pushStandalone() {
  const mockupUrl = findMockupUrl();
  if (!mockupUrl) {
    alert("Chua thay anh Mockup tren trang.");
    return;
  }
  const designUrl = mockupUrl.replace(CONFIG.MOCKUP_FILE, CONFIG.DESIGN_FILE);
  setStatus("Dang lay Order ID...");
  let orderId = await getOrderId(mockupUrl);
  if (!orderId) {
    orderId = (window.prompt("Nhap Order ID (de trong = don dang mo):", "") || "").trim();
  }
  const items = [];
  try {
    setStatus("Dang tai Mockup...");
    items.push({ slot: "mockup", name: CONFIG.MOCKUP_FILE, dataUrl: await urlToDataUrl(mockupUrl) });
  } catch (e) {
    setStatus(null);
    alert("Loi tai Mockup: " + (e && e.message ? e.message : e));
    return;
  }
  try {
    setStatus("Dang tai Design...");
    items.push({ slot: "design", name: CONFIG.DESIGN_FILE, dataUrl: await urlToDataUrl(designUrl) });
  } catch (_) {}
  setStatus(orderId ? "Dang mo don " + orderId + "..." : "Dang gui...");
  chrome.runtime.sendMessage({ type: "CENDO_PUSH", orderId, items }, (resp) => {
    setStatus(null);
    if (chrome.runtime.lastError) return alert("Loi: " + chrome.runtime.lastError.message);
    if (!resp || !resp.ok) return alert("That bai: " + (resp && resp.error ? resp.error : "khong ro"));
    alert("Da gui sang cendo.work. Kiem tra tab cendo.work.");
  });
}

// ================= UI =================
let statusEl;
function setStatus(text) {
  if (!statusEl) return;
  statusEl.textContent = text || "";
  statusEl.style.display = text ? "block" : "none";
}
function injectButton() {
  if (document.getElementById("cendo-bridge-box")) return;
  const box = document.createElement("div");
  box.id = "cendo-bridge-box";
  box.style.cssText =
    "position:fixed;right:16px;bottom:16px;z-index:2147483647;display:flex;" +
    "flex-direction:column;gap:6px;align-items:flex-end;font-family:system-ui,Arial,sans-serif;";
  statusEl = document.createElement("div");
  statusEl.style.cssText =
    "display:none;background:#111;color:#fff;padding:6px 10px;border-radius:6px;" +
    "font-size:12px;max-width:260px;text-align:right;";
  const btn = document.createElement("button");
  btn.style.cssText =
    "cursor:pointer;border:none;border-radius:9px;padding:11px 16px;font-size:14px;" +
    "font-weight:700;color:#fff;background:#2e9e5b;box-shadow:0 3px 10px rgba(0,0,0,.28);";
  if (IS_EMBED) {
    btn.textContent = IS_AUTO ? "🤖 Bot đang tự xử lý..." : "✓ Điền vào Mockup và Design";
    if (IS_AUTO) btn.disabled = true;
    btn.addEventListener("click", () => embedFill());
  } else {
    btn.textContent = "⇪ Gui sang cendo.work";
    btn.style.background = "#e8552d";
    btn.addEventListener("click", () => pushStandalone());
  }
  box.appendChild(statusEl);
  box.appendChild(btn);
  document.body.appendChild(box);
}

injectButton();
new MutationObserver(() => injectButton()).observe(document.documentElement, {
  childList: true,
  subtree: true,
});

if (IS_EMBED && !IS_MANUAL) {
  // tu do anh vao xu ly ngay khi trang san sang
  embedAutoFeed();
  if (IS_AUTO) autoWatch();
}
// IS_MANUAL: khong lam gi ca -> nhan vien tu up anh bang giao dien co san,
// xong bam "✓ Điền vào Mockup và Design" de gui ket qua ve don.
