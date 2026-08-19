importScripts("auto-run.js"); // BOT 8H30 — lich chay + quet don + bao cao Lark

// ============================================================================
// background.js
//  - Luong v2 (nhung iframe): fetch anh Attachments (pancake), giu session,
//    relay ket qua ve tab don de dien Media.
//  - Luong v1 (standalone): van giu - bam nut tren cendoauto.art -> tu tim don.
// ============================================================================

const ORDERS_URL = "https://cendo.work/orders";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// session cho luong iframe: sessionId -> { tabId, images }
const sessions = new Map();
function newId() {
  return "s" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

async function fetchAsDataUrl(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000); // chong treo: toi da 20s/anh
  try {
    const res = await fetch(url, { credentials: "omit", signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status + " @ " + url);
    const blob = await res.blob();
    const buf = await blob.arrayBuffer();
    // base64 khong dung FileReader (SW dung duoc btoa)
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const mime = blob.type || "image/jpeg";
    return "data:" + mime + ";base64," + btoa(bin);
  } finally {
    clearTimeout(timer);
  }
}

// ---- Google Drive: lay anh input tu 1 folder chia se "Anyone with link" ----
function driveFolderId(url) {
  let m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// Chay tac vu bat dong bo co gioi han so luong chay dong thoi (giu thu tu ket qua)
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  const n = Math.min(limit, items.length) || 0;
  await Promise.all(Array.from({ length: n }, worker));
  return results;
}

// Tai anh Attachments (pancake) SONG SONG
async function downloadAttachments(urls) {
  return mapLimit(urls, 8, async (url, idx) => {
    const dataUrl = await fetchAsDataUrl(url);
    const ext = (dataUrl.slice(5, dataUrl.indexOf(";")).split("/")[1] || "jpg").split("+")[0];
    return { name: "input_" + String(idx + 1).padStart(2, "0") + "." + ext, dataUrl };
  });
}

// Liet ke anh trong folder Drive public -> [{id, name}] (buoc NHANH, khong tai anh)
async function driveFolderList(folderUrl) {
  const fid = driveFolderId(folderUrl);
  if (!fid) throw new Error("Link Google Drive khong hop le.");
  console.log("[Cendo Bridge][bg] Drive: lay danh sach folder", fid);
  const listCtrl = new AbortController();
  const listTimer = setTimeout(() => listCtrl.abort(), 25000);
  let res;
  try {
    res = await fetch(
      "https://drive.google.com/embeddedfolderview?id=" + fid + "#list",
      { credentials: "omit", signal: listCtrl.signal }
    );
  } catch (e) {
    throw new Error(
      "Khong lay duoc danh sach folder Drive (" +
        (e && e.name === "AbortError" ? "qua lau/treo" : e && e.message) +
        "). Kiem tra folder co de 'Anyone with the link' khong."
    );
  } finally {
    clearTimeout(listTimer);
  }
  if (!res.ok) {
    throw new Error(
      "Khong mo duoc folder Drive (HTTP " +
        res.status +
        "). Folder phai de che do 'Anyone with the link'."
    );
  }
  const html = await res.text();
  // Moi file: <div class="flip-entry" id="entry-FILEID"> ... flip-entry-title">TEN<
  const re = /id="entry-([a-zA-Z0-9_-]+)"[\s\S]*?flip-entry-title">([^<]+)</g;
  const entries = [];
  let m;
  while ((m = re.exec(html)) !== null) entries.push({ id: m[1], name: m[2].trim() });
  const imgs = entries.filter((e) => /\.(jpe?g|png|webp)$/i.test(e.name));
  if (imgs.length === 0) {
    throw new Error("Folder Drive khong co anh (jpg/png) nao, hoac khong doc duoc danh sach.");
  }
  // sort tu nhien theo ten (1,2,...,10,11) de dung thu tu o
  imgs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  console.log("[Cendo Bridge][bg] Drive folder", fid, "->", imgs.length, "anh:", imgs.map((e) => e.name));
  return imgs;
}

// Tai anh Drive SONG SONG -> [{name, dataUrl}]
async function driveDownloadAll(imgs) {
  return mapLimit(imgs, 8, async (e, idx) => {
    console.log("[Cendo Bridge][bg] tai Drive", idx + 1, "/", imgs.length, e.name);
    const dataUrl = await fetchAsDataUrl(
      "https://drive.usercontent.google.com/download?id=" + e.id + "&export=download&confirm=t"
    );
    return { name: e.name, dataUrl };
  });
}

// ---- v1 helpers ----
async function findCendoWorkTab() {
  const tabs = await chrome.tabs.query({
    url: ["*://cendo.work/*", "*://*.cendo.work/*"],
  });
  if (tabs.length === 0) return null;
  return tabs.find((t) => t.active) || tabs[0];
}
async function waitTabComplete(tabId, timeout = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const t = await chrome.tabs.get(tabId);
    if (t.status === "complete") return true;
    await sleep(200);
  }
  return false;
}
async function sendWithRetry(tabId, payload, tries = 25) {
  for (let i = 0; i < tries; i++) {
    try {
      return await chrome.tabs.sendMessage(tabId, payload);
    } catch (e) {
      await sleep(300);
    }
  }
  throw new Error("content script tren cendo.work chua san sang.");
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;

  // ---------- v2: bat dau (gom anh Attachments HOAC Google Drive) ----------
  // Toi uu: chi doi buoc "liet ke" (nhanh) roi TRA sessionId ngay de popup mo
  // luon; anh tai SONG SONG chay nen, iframe lay o buoc GET (co await).
  if (msg.type === "CENDO_EMBED_START") {
    (async () => {
      try {
        const tabId = sender.tab && sender.tab.id;
        const sessionId = newId();
        let imagesPromise = null;
        if (msg.manual) {
          // Che do TU UP anh: khong tai gi, chi giu session de nhan ket qua.
          console.log("[Cendo Bridge][bg] START manual (nguoi dung tu up anh)");
        } else if (msg.driveFolderUrl) {
          console.log("[Cendo Bridge][bg] START Google Drive:", msg.driveFolderUrl);
          const imgs = await driveFolderList(msg.driveFolderUrl); // nhanh (~1s)
          imagesPromise = driveDownloadAll(imgs); // song song, KHONG await
        } else {
          const urls = msg.attachmentUrls || [];
          console.log("[Cendo Bridge][bg] START Attachments:", urls.length);
          imagesPromise = downloadAttachments(urls); // song song, KHONG await
        }
        // bat loi de khong bi "unhandled rejection"; GET se nhan loi that
        if (imagesPromise) {
          imagesPromise.catch((e) => console.warn("[Cendo Bridge][bg] tai anh loi:", e));
        }
        sessions.set(sessionId, { tabId, imagesPromise, images: null, manual: !!msg.manual });
        try {
          await chrome.storage.session.set({ ["cendo_" + sessionId]: { tabId } });
        } catch (_) {}
        sendResponse({ ok: true, sessionId }); // -> content-order mo popup NGAY
      } catch (e) {
        sendResponse({ ok: false, error: e && e.message ? e.message : String(e) });
      }
    })();
    return true;
  }

  // ---------- v2: iframe lay anh (doi tai xong) ----------
  if (msg.type === "CENDO_EMBED_GET") {
    (async () => {
      const sess = sessions.get(msg.sessionId);
      if (!sess) {
        sendResponse({ ok: false, error: "Session het han." });
        return;
      }
      // Che do manual: khong co anh tai san -> bao iframe hien UI upload.
      if (sess.manual && !sess.imagesPromise) {
        sendResponse({ ok: false, manual: true, error: "Che do tu up anh." });
        return;
      }
      try {
        const images = sess.images || (await sess.imagesPromise);
        sess.images = images;
        if (!images || images.length === 0) throw new Error("Khong lay duoc anh input.");
        console.log("[Cendo Bridge][bg] GET -> tra", images.length, "anh");
        sendResponse({ ok: true, images });
      } catch (e) {
        sendResponse({ ok: false, error: e && e.message ? e.message : String(e) });
      }
    })();
    return true;
  }

  // ---------- v2: iframe gui ket qua -> dong modal + dien Media ----------
  if (msg.type === "CENDO_EMBED_RESULT") {
    (async () => {
      sendResponse({ ok: true }); // tra som cho iframe (iframe sap bi go)
      let tabId = null;
      const sess = sessions.get(msg.sessionId);
      if (sess && sess.tabId != null) tabId = sess.tabId;
      else {
        try {
          const s = await chrome.storage.session.get("cendo_" + msg.sessionId);
          tabId = s["cendo_" + msg.sessionId] && s["cendo_" + msg.sessionId].tabId;
        } catch (_) {}
      }
      if (tabId == null) return;
      try {
        await chrome.tabs.update(tabId, { active: true });
        await chrome.tabs.sendMessage(tabId, { type: "CENDO_EMBED_CLOSE" }); // content-order go modal
        await sleep(400);
        await chrome.tabs.sendMessage(tabId, {
          type: "CENDO_TASK",
          orderId: "",
          items: msg.items,
        });
      } catch (e) {
        console.warn("[Cendo Bridge][bg] relay ket qua loi:", e);
      } finally {
        sessions.delete(msg.sessionId);
        try {
          await chrome.storage.session.remove("cendo_" + msg.sessionId);
        } catch (_) {}
      }
    })();
    return true;
  }

  // ---------- v2: huy (dong modal khong dien) ----------
  if (msg.type === "CENDO_EMBED_CANCEL") {
    sessions.delete(msg.sessionId);
    sendResponse({ ok: true });
    return true;
  }

  // ---------- v1: standalone push (tu tim don) ----------
  if (msg.type === "CENDO_PUSH") {
    (async () => {
      let tab = await findCendoWorkTab();
      if (msg.orderId) {
        if (!tab) tab = await chrome.tabs.create({ url: ORDERS_URL, active: true });
        else await chrome.tabs.update(tab.id, { url: ORDERS_URL, active: true });
        if (tab.windowId != null) await chrome.windows.update(tab.windowId, { focused: true });
        await waitTabComplete(tab.id);
        await sleep(600);
      } else {
        if (!tab) {
          sendResponse({ ok: false, error: "Khong co Order ID va khong co tab cendo.work." });
          return;
        }
        await chrome.tabs.update(tab.id, { active: true });
        if (tab.windowId != null) await chrome.windows.update(tab.windowId, { focused: true });
      }
      try {
        const resp = await sendWithRetry(tab.id, {
          type: "CENDO_TASK",
          orderId: msg.orderId || "",
          items: msg.items,
        });
        sendResponse(resp || { ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e && e.message ? e.message : String(e) });
      }
    })();
    return true;
  }
});
