// ============================================================================
// inject.js — chay trong MAIN world cua cendo.work (document_start)
// cendo.work dung react-dropzone: bam nut "Upload" -> mo POPUP co vung
// "Drag & drop an image here, or click to select" -> tha anh vao do.
// Chien luoc:
//   1. Bam nut Upload cua slot -> popup mo.
//   2. Doi input[type=file] cua dropzone xuat hien -> set files + change.
//      (kem: mo phong su kien 'drop' len vung dropzone cho chac.)
// ============================================================================

(function () {
  if (window.__CENDO_INJECTED__) return;
  window.__CENDO_INJECTED__ = true;

  // ---- tien ich ----
  function dataUrlToFile(dataUrl, name) {
    const [head, b64] = dataUrl.split(",");
    const mime = (head.match(/data:([^;]+)/) || [])[1] || "image/png";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new File([arr], name || "image.png", { type: mime });
  }

  function waitFor(fn, timeout, interval) {
    timeout = timeout || 6000;
    interval = interval || 120;
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

  function setInputFiles(input, files) {
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(f);
    input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function simulateDrop(zone, files) {
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(f);
    try {
      dt.dropEffect = "copy";
    } catch (_) {}
    for (const type of ["dragenter", "dragover", "drop"]) {
      zone.dispatchEvent(
        new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt })
      );
    }
  }

  // Vung dropzone (chua chu "Drag & drop ... click to select")
  function findDropzone() {
    const nodes = document.querySelectorAll("div,section,label,p");
    for (const el of nodes) {
      const t = (el.textContent || "").toLowerCase();
      if (
        (t.includes("drag") && t.includes("drop")) ||
        t.includes("click to select")
      ) {
        // lay khoi cha co ve la vung tha (khong qua to)
        let node = el;
        for (let i = 0; i < 3 && node.parentElement; i++) {
          if (node.querySelector('input[type="file"]')) break;
          node = node.parentElement;
        }
        return node;
      }
    }
    return null;
  }

  // Nut Upload cua dung slot (mockup / design)
  function findUploadButton(slot) {
    const want = slot === "design" ? "design" : "mockup";
    const containers = document.querySelectorAll('[class*="controller_container__"]');
    for (const c of containers) {
      const head = c.querySelector('[class*="controller_header__"]');
      const txt = ((head ? head.textContent : c.textContent) || "")
        .trim()
        .toLowerCase();
      if (txt.startsWith(want)) {
        const btn = Array.from(c.querySelectorAll("button")).find((b) =>
          /upload/i.test(b.textContent || "")
        );
        if (btn) return btn;
      }
    }
    return (
      Array.from(document.querySelectorAll("button")).find((b) =>
        /upload/i.test(b.textContent || "")
      ) || null
    );
  }

  // ---- xu ly 1 slot ----
  async function handleFill(slot, files) {
    const btn = findUploadButton(slot);
    console.log("[Cendo Bridge] slot", slot, "- nut Upload:", btn);
    if (!btn) return { ok: false, error: "Khong tim thay nut Upload." };

    const before = new Set(document.querySelectorAll('input[type="file"]'));
    btn.click(); // mo popup dropzone

    // doi input file moi cua popup xuat hien
    const input = await waitFor(() => {
      const all = Array.from(document.querySelectorAll('input[type="file"]'));
      return all.find((i) => !before.has(i)) || null;
    }, 6000);

    if (input) {
      console.log("[Cendo Bridge] tim thay input dropzone:", input.outerHTML);
      setInputFiles(input, files);
      // tha them len vung dropzone cho chac (react-dropzone nghe ca 2)
      const zone = findDropzone();
      if (zone) simulateDrop(zone, files);
      return { ok: true, note: 'da nhet anh vao popup slot "' + slot + '".' };
    }

    // khong co input -> thu tha thang len vung dropzone
    const zone = findDropzone();
    if (zone) {
      console.log("[Cendo Bridge] khong co input, drop vao vung:", zone);
      simulateDrop(zone, files);
      return { ok: true, note: 'da tha anh vao dropzone slot "' + slot + '".' };
    }
    return {
      ok: false,
      error: "Popup mo nhung khong thay input/dropzone. Can chinh selector.",
    };
  }

  // ---- nhan yeu cau tu content-target (isolated world) ----
  window.addEventListener("message", async function (e) {
    if (e.source !== window) return;
    const d = e.data;
    if (!d || d.__cendo !== "FILL") return;

    try {
      const files = d.images.map((im) => dataUrlToFile(im.dataUrl, im.name));
      console.log(
        "[Cendo Bridge] FILL slot=",
        d.slot,
        "| file=",
        files.map((f) => f.name + " (" + f.size + "b)")
      );
      const res = await handleFill(d.slot, files);
      window.postMessage(Object.assign({ __cendo: "RESULT" }, res), "*");
    } catch (err) {
      console.warn("[Cendo Bridge] loi FILL:", err);
      window.postMessage(
        { __cendo: "RESULT", ok: false, error: String(err && err.message ? err.message : err) },
        "*"
      );
    }
  });

  console.log("[Cendo Bridge] inject.js san sang (MAIN world) - che do dropzone.");
})();
