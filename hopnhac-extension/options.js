const $ = (s) => document.querySelector(s);
const pad2 = (n) => String(n).padStart(2, "0");
const DEFAULTS = {
  enabled: false, hour: 8, minute: 0, pages: 1,
  larkWebhook: "",  // dán webhook Lark của group vào trang cài đặt (không lưu trong code)
  larkKeyword: "Thông báo", logs: [],
};
const send = (m) => new Promise((r) => chrome.runtime.sendMessage(m, r));
const fmt = (ts) => { const d = new Date(ts); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };

function setStatus(t, cls) { $("#status").textContent = t; $("#status").className = cls || ""; }

async function load() {
  const cfg = await new Promise((r) => chrome.storage.local.get(DEFAULTS, r));
  $("#enabled").checked = !!cfg.enabled;
  $("#time").value = `${pad2(cfg.hour)}:${pad2(cfg.minute)}`;
  $("#pages").value = String(cfg.pages);
  $("#webhook").value = cfg.larkWebhook || "";
  $("#keyword").value = cfg.larkKeyword || "Thông báo";
  renderLogs(cfg.logs || []);
  refreshNext();
}
async function refreshNext() {
  const st = await send({ type: "HN_STATUS" });
  const el = $("#next");
  if (!st) { el.textContent = ""; return; }
  el.textContent = st.nextAlarm ? `Lần chạy tự động kế tiếp: ${fmt(st.nextAlarm)}` : "Chưa bật lịch tự động.";
  if (st.current) { setStatus(`Đang chạy (${st.current.trigger === "schedule" ? "theo lịch" : "chạy tay"}): ${st.current.progress || "…"}`, ""); $("#runNow").disabled = true; }
  else $("#runNow").disabled = false;
}
function renderLogs(logs) {
  const box = $("#logs"); box.innerHTML = "";
  if (!logs.length) { box.innerHTML = '<div class="hint">Chưa có lần chạy nào.</div>'; return; }
  logs.forEach((l) => {
    const d = document.createElement("div"); d.className = "log";
    d.innerHTML = `<b>${fmt(l.at)}</b> · ${l.trigger === "schedule" ? "theo lịch" : "chạy tay"} · ✅ ${l.done} · ⚠️ ${l.skipped} · ❌ ${l.errors} · đã có ảnh ${l.already}` +
      (l.fatal ? ` · <span style="color:#c0392b">DỪNG: ${l.fatal}</span>` : "") + ` · Lark: ${l.lark}` +
      `<details><summary style="cursor:pointer;color:#7a4f2a;font-size:12px">Xem nội dung đã gửi</summary><pre></pre></details>`;
    d.querySelector("pre").textContent = l.text || "";
    box.appendChild(d);
  });
}

$("#save").onclick = async () => {
  const [h, m] = ($("#time").value || "08:00").split(":").map(Number);
  await new Promise((r) => chrome.storage.local.set({
    enabled: $("#enabled").checked, hour: h || 0, minute: m || 0, pages: Number($("#pages").value),
    larkWebhook: $("#webhook").value.trim(), larkKeyword: $("#keyword").value.trim() || "Thông báo",
  }, r));
  await send({ type: "HN_RESCHEDULE" });
  setStatus("Đã lưu cài đặt.", "ok"); refreshNext();
};
$("#testLark").onclick = async () => {
  await $("#save").onclick();
  const r = await send({ type: "HN_TEST_LARK" });
  setStatus(r && r.ok ? "Đã gửi tin thử lên Lark." : "Gửi Lark lỗi: " + (r && r.error), r && r.ok ? "ok" : "err");
};
$("#runNow").onclick = async () => {
  await $("#save").onclick();
  setStatus("Đang khởi động…", ""); $("#runNow").disabled = true;
  const r = await send({ type: "HN_RUN_NOW" });
  if (!r || !r.ok) { setStatus("Không chạy được: " + (r && r.error), "err"); $("#runNow").disabled = false; }
  else setStatus("Đang chạy… (theo dõi tại đây hoặc trên tab cendo.work)", "");
};
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg) return;
  if (msg.type === "HN_PROGRESS_UI") setStatus("Đang chạy: " + msg.text, "");
  if (msg.type === "HN_DONE") {
    const l = msg.log;
    setStatus(`Xong: ✅ ${l.done} · ⚠️ ${l.skipped} · ❌ ${l.errors}${l.fatal ? " · DỪNG: " + l.fatal : ""} · Lark: ${l.lark}`, l.errors || l.fatal ? "err" : "ok");
    $("#runNow").disabled = false;
    chrome.storage.local.get(DEFAULTS, (cfg) => renderLogs(cfg.logs || []));
  }
});
load();
setInterval(refreshNext, 5000);
