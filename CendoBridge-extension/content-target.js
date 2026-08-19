// ============================================================================
// content-target.js — chay tren cendo.work (ISOLATED world)
// Nhan CENDO_TASK {orderId, items}:
//   1. Neu co orderId: dang o /orders -> go orderId vao o Search -> submit
//      -> doi ket qua -> bam mo don -> doi trang don (co nut Upload).
//   2. Dien anh: voi moi item, nho inject.js (MAIN world) bam Upload + tha anh
//      vao dropzone. Lam lan luot mockup roi design.
// DOM la chung giua 2 world nen viec tim/goc/bam deu lam duoc o day; chi phan
// "tha vao dropzone" nho inject.js cho dong bo voi cach cu da chay on.
// ============================================================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitFor(fn, timeout = 12000, interval = 150) {
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

// Set gia tri o input do React quan ly (dung native setter + ban su kien input)
function setReactInputValue(input, value) {
  const proto = Object.getPrototypeOf(input);
  const desc =
    Object.getOwnPropertyDescriptor(proto, "value") ||
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  desc.set.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function hasUploadButtons() {
  return Array.from(document.querySelectorAll("button")).some((b) =>
    /upload/i.test(b.textContent || "")
  );
}

// Doi bang loc con DUNG 1 dong va on dinh (tranh bam nham don khi filter chua
// ap dung). Con nhieu dong => coi nhu filter chua xong, doi tiep.
async function waitForSingleStableRow(timeout = 12000) {
  const t0 = Date.now();
  let lastId = null;
  let stable = 0;
  while (Date.now() - t0 < timeout) {
    const rows = document.querySelectorAll("tbody tr[data-id]");
    if (rows.length === 1) {
      const id = rows[0].getAttribute("data-id");
      if (id === lastId) {
        if (++stable >= 2) return rows[0];
      } else {
        lastId = id;
        stable = 0;
      }
    } else {
      lastId = null;
      stable = 0;
    }
    await sleep(250);
  }
  return null;
}

// --- tim don theo Order ID ---
async function openOrder(orderId) {
  // 1. o Search
  const input = await waitFor(
    () => document.querySelector('#order_id, input[placeholder="Order ID"]'),
    12000
  );
  if (!input) return { ok: false, error: "Khong thay o Search Order ID (dang o dung trang /orders khong?)." };

  setReactInputValue(input, orderId);
  console.log("[Cendo Bridge] da go Order ID:", orderId);

  // 2. submit form filter (React se preventDefault, khong reload)
  if (input.form && typeof input.form.requestSubmit === "function") {
    try {
      input.form.requestSubmit();
    } catch (_) {}
  }
  // du phong: Enter
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));

  // 3. doi bang loc con dung 1 dong on dinh
  await sleep(500);
  const row = await waitForSingleStableRow(12000);
  if (!row) {
    return {
      ok: false,
      error:
        "Khong xac dinh duoc dung 1 don cho Order ID " +
        orderId +
        " (khong thay, hoac con nhieu dong - loc chua ap dung). Da dung de tranh dien nham.",
    };
  }

  // 4. bam mo don: link ID nam o cot thu 2 (sau cot #)
  const cells = row.querySelectorAll("td");
  const idCell = cells[1] || row;
  const link = idCell.querySelector("a") || row.querySelector("a");
  console.log("[Cendo Bridge] mo don, data-id=", row.getAttribute("data-id"), "| link=", link && link.textContent);
  if (!link) return { ok: false, error: "Thay don nhung khong thay link de mo." };
  link.click();

  // 5. doi trang chi tiet don (co nut Upload trong muc Media)
  const ready = await waitFor(() => hasUploadButtons(), 15000);
  if (!ready) return { ok: false, error: "Da mo don nhung khong thay nut Upload (trang chua tai xong?)." };
  await sleep(400);
  return { ok: true };
}

// --- dien 1 slot: nho inject.js (MAIN world) ---
function fillOneSlot(slot, name, dataUrl) {
  return new Promise((resolve) => {
    let done = false;
    const onResult = (e) => {
      if (e.source !== window) return;
      const d = e.data;
      if (!d || d.__cendo !== "RESULT") return;
      done = true;
      window.removeEventListener("message", onResult);
      resolve({ slot, ok: !!d.ok, error: d.error, note: d.note });
    };
    window.addEventListener("message", onResult);
    window.postMessage({ __cendo: "FILL", slot, images: [{ name, dataUrl }] }, "*");
    setTimeout(() => {
      if (done) return;
      window.removeEventListener("message", onResult);
      resolve({ slot, ok: false, error: "Khong nhan phan hoi tu trang (timeout)." });
    }, 10000);
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "CENDO_TASK") return;

  (async () => {
    // Buoc 1: tim & mo dung don (neu co orderId)
    if (msg.orderId) {
      const opened = await openOrder(msg.orderId);
      if (!opened.ok) {
        sendResponse({ ok: false, error: opened.error, results: [] });
        return;
      }
    }

    // Buoc 2: dien tung slot
    const results = [];
    for (const it of msg.items) {
      const r = await fillOneSlot(it.slot, it.name, it.dataUrl);
      results.push(r);
      await sleep(1200); // cho cendo.work xu ly xong slot truoc
    }
    sendResponse({ ok: results.some((r) => r.ok), results });
  })();

  return true; // giu kenh cho sendResponse bat dong bo
});
