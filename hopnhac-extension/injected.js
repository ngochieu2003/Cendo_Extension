/* =========================================================================
   Chạy ở MAIN world của cendo.work.
   Nút "Upload" mở modal react-dropzone ("Drag & drop an image here...").
   Với mỗi ô: bấm Upload -> chờ modal/dropzone -> bơm file vào input + giả
   lập 'drop' -> chờ modal đóng. File tạo & gán trong CÙNG world với React
   nên input.files phản ánh đúng.
   ========================================================================= */
(function () {
  "use strict";
  if (window.__HN_MAIN__) return;
  window.__HN_MAIN__ = true;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function waitFor(fn, ms = 3500, step = 60) {
    for (let i = 0; i < ms / step; i++) { const v = fn(); if (v) return v; await sleep(step); }
    return null;
  }

  function allFileInputs() { return [...document.querySelectorAll('input[type="file"]')]; }

  function findDropzone() {
    const cands = [...document.querySelectorAll("div,section,form,label")];
    for (const el of cands) {
      const t = (el.textContent || "");
      if (/drag\s*&?\s*drop/i.test(t) && el.querySelector('input[type="file"]')) return el;
    }
    // fallback: phần tử chứa chính input file mới nhất
    const ins = allFileInputs();
    if (ins.length) return ins[ins.length - 1].closest("div,section,form,label") || ins[ins.length - 1];
    return null;
  }

  function findConfirmButton() {
    const pos = /^(upload|save|lưu|xác nhận|xac nhan|ok|done|xong|tải lên|tai len|submit|confirm|thêm|them|add)$/i;
    const neg = /(cancel|hủy|huy|close|đóng|dong)/i;
    const btns = [...document.querySelectorAll("button")].filter((b) => {
      const t = (b.textContent || "").trim();
      return t && pos.test(t) && !neg.test(t) && b.offsetParent !== null;
    });
    return btns[0] || null;
  }

  function makeDT(file) { const dt = new DataTransfer(); dt.items.add(file); return dt; }

  function setInput(input, file) {
    try { input.files = makeDT(file).files; } catch (e) {}
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fireDrop(zone, file) {
    for (const type of ["dragenter", "dragover", "drop"]) {
      let ev;
      try { ev = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: makeDT(file) }); }
      catch (e) { ev = new Event(type, { bubbles: true, cancelable: true }); }
      if (!ev.dataTransfer) { try { Object.defineProperty(ev, "dataTransfer", { value: makeDT(file) }); } catch (_) {} }
      zone.dispatchEvent(ev);
    }
  }

  async function fillOne(button, dataUrl, name) {
    if (!button) return { ok: false, why: "no-button" };
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], name, { type: "image/png" });

    const before = allFileInputs().length;
    button.click(); // mở modal

    const input = await waitFor(() => {
      const ins = allFileInputs();
      return ins.length > before ? ins[ins.length - 1] : (ins.length ? ins[ins.length - 1] : null);
    }, 3500);
    const zone = findDropzone();

    if (!input && !zone) return { ok: false, why: "no-dropzone" };
    if (input) setInput(input, file);
    if (zone) fireDrop(zone, file);

    await sleep(600);
    const btn = findConfirmButton();
    if (btn) { btn.click(); }

    // chờ modal đóng (số input file giảm về mức cũ)
    const closed = await waitFor(() => allFileInputs().length <= before, 3500);
    return { ok: true, closed: !!closed };
  }

  window.addEventListener("message", async (ev) => {
    if (ev.source !== window || !ev.data || ev.data.__hn !== "fill") return;
    const d = ev.data;

    // tìm 2 nút Upload (Mockup = ô1, Design = ô2)
    let btns = [];
    let row = document.querySelector('[class*="media_row"]');
    if (row) {
      const conts = row.querySelectorAll('[class*="controller_container"]');
      btns = [...conts].map((c) => c.querySelector("button")).filter(Boolean).slice(0, 2);
    }
    if (btns.length < 2) {
      btns = [...document.querySelectorAll("button")].filter((b) => /Upload/i.test(b.textContent)).slice(0, 2);
    }

    let rM = { ok: false }, rD = { ok: false };
    if (btns[0]) rM = await fillOne(btns[0], d.mockUrl, d.mockName);
    await sleep(500);
    if (btns[1]) rD = await fillOne(btns[1], d.designUrl, d.designName);

    window.postMessage({ __hn: "result", okM: rM.ok, okD: rD.ok, found: btns.length,
      whyM: rM.why || "", whyD: rD.why || "" }, "*");
  });
})();
