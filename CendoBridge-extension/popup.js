// popup.js — dieu khien bot: bat/tat lich, chay ngay, xem log lan chay gan nhat
const $ = (id) => document.getElementById(id);

function esc(s) {
  const d = document.createElement("div");
  d.textContent = String(s == null ? "" : s);
  return d.innerHTML;
}

function renderLog(log) {
  if (!log) {
    $("log").textContent = "Chưa có lần chạy nào.";
    return;
  }
  const time = (iso) => (iso ? new Date(iso).toLocaleString("vi-VN") : "?");
  let h = "";
  if (log.running) h += '<b class="warn">⏳ Đang chạy...</b> (bắt đầu ' + time(log.startedAt) + ")<br>";
  else h += "<b>Lần chạy gần nhất:</b> " + time(log.startedAt) + "<br>";
  h += '<span class="ok">✅ Đã làm: ' + (log.done ? log.done.length : 0) + "</span>";
  const reviewCount =
    (log.review ? log.review.length : 0) +
    (log.done ? log.done.filter((d) => d.warnings && d.warnings.length).length : 0);
  h += ' · <span class="warn">⚠️ Cần xem: ' + reviewCount + "</span>";
  h += ' · <span class="err">❌ Lỗi: ' + (log.errors ? log.errors.length : 0) + "</span>";
  h += " · 🔗 Link: " + (log.links ? log.links.length : 0) + "<br>";
  h += "Đã rà " + (log.scanned || 0) + " đơn Flip, bỏ qua " + (log.skippedDone || 0) + " đơn làm rồi";
  if (log.capped) h += " (đạt trần, còn đơn để lượt sau)";
  h += "<br>";
  if (log.done && log.done.length) h += "<b>Đã làm:</b> " + esc(log.done.map((d) => d.id).join(", ")) + "<br>";
  for (const d of log.done || [])
    if (d.warnings && d.warnings.length)
      h += '<span class="warn">⚠️ ' + esc(d.id) + ":</span> " + esc(d.warnings.join("; ")) + "<br>";
  for (const r of log.review || []) h += '<span class="warn">⚠️ ' + esc(r.id) + ":</span> " + esc(r.reason) + "<br>";
  for (const e of log.errors || []) h += '<span class="err">❌ ' + esc(e.id) + ":</span> " + esc(e.reason) + "<br>";
  if (log.links && log.links.length) h += "🔗 Đơn link: " + esc(log.links.join(", ")) + "<br>";
  if (log.fatal) h += '<span class="err">⛔ ' + esc(log.fatal) + "</span><br>";
  if (log.finishedAt && !log.running)
    h += "Xong lúc " + time(log.finishedAt) + " · Lark: " + (log.larkOk ? '<span class="ok">đã gửi</span>' : '<span class="err">gửi lỗi</span>');
  $("log").innerHTML = h;
}

async function refresh() {
  const st = await chrome.storage.local.get({
    autoEnabled: true,
    lastRunLog: null,
    autoRunHour: 8,
    autoRunMinute: 30,
  });
  $("enabled").checked = !!st.autoEnabled;
  // khong ghi de khi nguoi dung dang chinh o gio
  if (document.activeElement !== $("runtime")) {
    $("runtime").value =
      String(st.autoRunHour).padStart(2, "0") + ":" + String(st.autoRunMinute).padStart(2, "0");
  }
  $("run").disabled = !!(st.lastRunLog && st.lastRunLog.running);
  renderLog(st.lastRunLog);
}

$("enabled").addEventListener("change", () => {
  chrome.runtime.sendMessage({ type: "CENDO_AUTO_SET_ENABLED", enabled: $("enabled").checked });
});
$("runtime").addEventListener("change", () => {
  const [h, m] = ($("runtime").value || "08:30").split(":");
  chrome.runtime.sendMessage({ type: "CENDO_AUTO_SET_TIME", hour: h, minute: m });
});
$("run").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CENDO_AUTO_RUN_NOW" });
  $("run").disabled = true;
  setTimeout(refresh, 1500);
});

refresh();
setInterval(refresh, 3000);
