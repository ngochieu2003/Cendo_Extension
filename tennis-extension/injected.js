/* =========================================================================
   Móc khoá Clicky Tennis 3D – script chạy ở MAIN world của cendo.work.

   CƠ CHẾ ĐIỀN: lấy theo userscript "Cendo → Raccoonie v9.8" (đã chạy ổn
   trong sản xuất trên chính trang này). Điểm cốt lõi:

   1. KHÔNG giả lập kéo-thả (dragenter/dragover/drop) — Raccoonie ghi rõ:
      "không dùng giả lập kéo-thả vì nó báo thành công giả".
   2. Bấm nút Upload của ô → Cendo mở modal "Upload media (mockup|design)".
      Tìm modal bằng TIÊU ĐỀ đó (regex), lấy input[type=file] bên trong.
   3. Chèn file bằng NATIVE SETTER của HTMLInputElement.prototype.files
      (desc.set.call) rồi bắn event input+change → React chắc chắn thấy,
      Cendo tự upload ngay (modal không có nút submit).
   4. Chờ preview hiện ở đúng ô (img / preview_container / nút thùng rác
      trong controller_header), poll 350ms tối đa 12s.
   5. Nút thùng rác: MỌI nút nằm trong [class*="controller_header"] là nút
      xoá — tuyệt đối không bấm. Nút Upload là nút trong button_container
      hoặc có chữ "Upload".
   ========================================================================= */
(function () {
  "use strict";
  if (window.__TENNIS_MAIN__) return;
  window.__TENNIS_MAIN__ = true;

  const WAIT_PREVIEW_MS = 12000; // chờ tối đa preview lên sau khi chèn file
  const POLL_MS = 350;
  const GAP_MS = 600;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ------------------------- Tìm item (card) ------------------------- */
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
  function findRow(d) {
    const rows = [...document.querySelectorAll('[class*="media_row"]')];
    if (d.sku) {
      const re = new RegExp("SKU ID:\\s*" + esc(d.sku) + "(?![\\w.-])", "i");
      const hit = rows.find((r) => {
        const box = r.closest('[class*="item_container"]') || r.parentElement;
        return box && re.test((box.innerText || "").replace(/\n/g, " "));
      });
      if (hit) return hit;
    }
    return rows[d.rowIndex || 0] || null;
  }

  /* --------------------- Ô Mockup/Design trong item --------------------- */
  // (Raccoonie: cardSlotContainer — nhận theo nhãn controller_field)
  function slotContainer(row, which) {
    const rx = which === "mockup" ? /^mockup$|\bmockup\b/i : /^design$|\bdesign\b/i;
    const conts = [...row.querySelectorAll('[class*="controller_container__"], [class*="controller_container"]')];
    for (const c of conts) {
      const lab = c.querySelector('[class*="controller_field__"], [class*="controller_field"]');
      if (lab && rx.test((lab.textContent || "").trim())) return c;
    }
    return null;
  }

  // (Raccoonie: isDeleteButton) — nút trong controller_header là nút xoá/thùng rác
  const DELETE_RX = /x[óo]a|delete|remove|thùng\s*rác|trash/i;
  function isDeleteButton(b) {
    if (!b) return false;
    if (DELETE_RX.test((b.title || "") + " " + (b.getAttribute("aria-label") || "") + " " + (b.textContent || ""))) return true;
    if (b.closest('[class*="controller_header__"], [class*="controller_header"]')) return true;
    return false;
  }

  // (Raccoonie: cardSlotButton) — ưu tiên nút Upload trong button_container
  function slotButton(row, which) {
    const c = slotContainer(row, which);
    if (!c) return null;
    const btns = [...c.querySelectorAll("button")];
    const upload = btns.find((b) => !isDeleteButton(b)
      && (/upload/i.test(b.textContent || "") || b.closest('[class*="button_container__"], [class*="button_container"]')));
    if (upload) return upload;
    return btns.find((b) => !isDeleteButton(b)) || null;
  }

  // (Raccoonie: cardHasImage) — có img / preview / nút thùng rác trong header
  function slotHasImage(row, which) {
    const c = slotContainer(row, which);
    if (!c) return false;
    if (c.querySelector('img, [class*="preview_container__"], [class*="preview_inner__"]')) return true;
    const trash = [...c.querySelectorAll('[class*="controller_header__"] button, [class*="controller_header"] button')];
    return trash.length > 0;
  }
  async function waitForImage(d, which, ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const r = findRow(d);
      if (r && slotHasImage(r, which)) return true;
      await sleep(POLL_MS);
    }
    const r = findRow(d);
    return !!(r && slotHasImage(r, which));
  }

  /* -------------------------- Modal upload -------------------------- */
  // ⚠️ Khác Raccoonie 1 điểm: node modal có thể còn nằm trong DOM một nhịp
  // sau khi đóng (React unmount muộn), nên "modal đang mở" phải kèm điều
  // kiện HIỂN THỊ THẬT. Lưu ý: modal là position:fixed → offsetParent luôn
  // null, phải đo bằng getBoundingClientRect().
  const visibleEl = (el) => !!el && el.getBoundingClientRect().height > 0;
  function visibleModal() {
    const list = [...document.querySelectorAll("div.modal.show, div.modal")].filter(visibleEl);
    return list.length ? list[list.length - 1] : null;
  }
  // (Raccoonie: openSlotModalInput) — tìm modal theo TIÊU ĐỀ "Upload media (which)",
  // nhưng CHỈ trong modal đang hiện, để không vớ phải input của modal ẩn.
  async function openSlotModalInput(which, timeoutMs) {
    const rx = new RegExp("upload media\\s*\\(\\s*" + which + "\\s*\\)", "i");
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const modal = visibleModal();
      if (modal) {
        const title = ((modal.querySelector('.modal-title, [class*="modal-title"]') || {}).textContent || modal.textContent || "").trim();
        if (rx.test(title)) {
          const inp = modal.querySelector('input[type="file"]');
          if (inp) return inp;
        } else if (/upload media/i.test(title)) {
          return { wrongModal: title }; // mở nhầm ô khác — báo lên trên, không điền bừa
        }
      }
      await sleep(120);
    }
    return null;
  }
  // (Raccoonie: isUploadModalOpen / closeUploadModal — thêm điều kiện hiển thị)
  function isUploadModalOpen() {
    const m = visibleModal();
    return !!(m && m.querySelector('input[type="file"], .modal-body'));
  }
  async function closeUploadModal() {
    const m = visibleModal();
    if (m) {
      const x = m.querySelector('button.btn-close, .modal-header .close, .modal-header button, [aria-label="Close"], button.close');
      if (x) { try { x.click(); } catch (e) {} }
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
    for (let i = 0; i < 12 && isUploadModalOpen(); i++) await sleep(120);
  }

  /* ---------------------------- Chèn file ---------------------------- */
  // (Raccoonie: injectFileToInput) — native setter để React chắc chắn thấy
  function injectFileToInput(input, file) {
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files");
      if (desc && desc.set) desc.set.call(input, dt.files);
      else input.files = dt.files;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return input.files.length > 0;
    } catch (e) {
      console.warn("[TENNIS] injectFileToInput lỗi:", e);
      return false;
    }
  }

  /* ---------------------------- Điền 1 ô ---------------------------- */
  // (Raccoonie: attachCardSlot — giữ nguyên trình tự, thêm đối chiếu tiêu đề
  //  modal sẵn trong openSlotModalInput vì regex đã khoá đúng which)
  async function fillSlot(d, which, dataUrl, name) {
    if (isUploadModalOpen()) await closeUploadModal(); // dọn modal cũ nếu còn

    const row = findRow(d);
    if (!row) return { ok: false, why: which + ": không thấy item" };
    if (slotHasImage(row, which)) return { ok: false, why: which + ": ô đã có ảnh sẵn (không ghi đè)" };
    const btn = slotButton(row, which);
    if (!btn) return { ok: false, why: which + ": không thấy nút Upload" };
    if (isDeleteButton(btn)) return { ok: false, why: which + ": chỉ thấy nút xoá — không bấm" };

    let file;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      file = new File([blob], name, { type: "image/png", lastModified: Date.now() });
    } catch (e) { return { ok: false, why: which + ": lỗi tạo file (" + e.message + ")" }; }

    btn.click(); // mở modal upload của ô này
    const input = await openSlotModalInput(which, 6000);
    if (input && input.wrongModal) { await closeUploadModal(); return { ok: false, why: which + ": modal mở nhầm (" + input.wrongModal + ")" }; }
    if (!input) { await closeUploadModal(); return { ok: false, why: which + ": không thấy input trong modal upload" }; }

    const okInject = injectFileToInput(input, file); // chèn file → Cendo tự upload
    if (!okInject) { await closeUploadModal(); return { ok: false, why: which + ": chèn file vào input thất bại" }; }

    const ok = await waitForImage(d, which, WAIT_PREVIEW_MS); // chờ preview lên
    if (isUploadModalOpen()) await closeUploadModal();        // đảm bảo modal đã đóng
    if (!ok) return { ok: false, why: which + ": đã chèn file nhưng chưa thấy preview trong ô" };
    return { ok: true };
  }

  /* ------------------------------ Vòng chạy ------------------------------ */
  window.addEventListener("message", async (ev) => {
    if (ev.source !== window || !ev.data || ev.data.__tennis !== "fill") return;
    const list = Array.isArray(ev.data.items) ? ev.data.items : [ev.data];
    const results = [];
    const tick = (label, step) => window.postMessage({ __tennis: "progress", done: results.length, total: list.length, label, step }, "*");

    for (const d of list) {
      const label = d.label || `Item ${(d.rowIndex || 0) + 1}`;
      let rM = { ok: false, why: "chưa chạy" }, rD = { ok: false, why: "chưa chạy" };
      tick(label, "mockup");
      try { rM = await fillSlot(d, "mockup", d.mockUrl, d.mockName); } catch (e) { rM = { ok: false, why: "mockup: " + e.message }; }
      await sleep(GAP_MS);
      tick(label, "design");
      // Mockup lỗi thì vẫn thử Design (2 ô độc lập), nhưng ghi rõ lý do
      try { rD = await fillSlot(d, "design", d.designUrl, d.designName); } catch (e) { rD = { ok: false, why: "design: " + e.message }; }
      results.push({ label, rowIndex: d.rowIndex || 0, sku: d.sku || "", okM: rM.ok, okD: rD.ok, why: [rM.why, rD.why].filter(Boolean).join(" · ") });
      tick(label, "xong");
      await sleep(GAP_MS);
    }

    window.postMessage({ __tennis: "result", results }, "*");
  });

  /* --------- Chẩn đoán: gõ __TENNIS_DIAG__() trong Console để soi --------- */
  window.__TENNIS_DIAG__ = () => {
    const rows = [...document.querySelectorAll('[class*="media_row"]')];
    return {
      rows: rows.length,
      modalOpen: isUploadModalOpen(),
      items: rows.map((r, i) => {
        const box = r.closest('[class*="item_container"]') || r.parentElement;
        return {
          i, sku: (((box && box.innerText) || "").match(/SKU ID:\s*([\w.-]+)/i) || [])[1] || "",
          slots: ["mockup", "design"].map((f) => ({
            f, found: !!slotContainer(r, f), hasImg: slotHasImage(r, f), uploadBtn: !!slotButton(r, f),
          })),
        };
      }),
    };
  };
})();
