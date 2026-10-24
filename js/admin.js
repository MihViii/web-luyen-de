/* =====================================================================
   TRANG THỐNG KÊ (admin.html)
   Lấy dữ liệu từ Apps Script (doGet) bằng mật khẩu, rồi tính:
   số lượt, điểm trung bình/cao/thấp, tỉ lệ đúng từng câu, bảng điểm.
   ===================================================================== */

const $ = (id) => document.getElementById(id);
let tatCaKetQua = [];
let sapXep = { cot: "nopLuc", giam: true };

function anToan(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const vietSo = (x, chuSo = 2) => (Math.round(x * 10 ** chuSo) / 10 ** chuSo).toString().replace(".", ",");
const phutGiay = (g) => `${Math.floor(g / 60)}:${String(Math.round(g % 60)).padStart(2, "0")}`;
const ngayGio = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

/* ---------- Tải dữ liệu ---------- */

$("form-mat-khau").addEventListener("submit", async (e) => {
  e.preventDefault();
  const matKhau = $("o-mat-khau").value;
  const tt = $("trang-thai");

  if (!CAU_HINH.LINK_APPS_SCRIPT) {
    tt.textContent = "Chưa có link Apps Script trong js/config.js. Đang hiện dữ liệu mẫu.";
    tatCaKetQua = taoDuLieuMau();
    batDauHienThi();
    return;
  }

  tt.textContent = "Đang tải…";
  try {
    const url = CAU_HINH.LINK_APPS_SCRIPT + "?key=" + encodeURIComponent(matKhau);
    const duLieu = await (await fetch(url)).json();
    if (!duLieu.ok) throw new Error(duLieu.loi);
    tatCaKetQua = duLieu.ketQua;
    tt.textContent = `Đã tải ${tatCaKetQua.length} lượt làm bài`;
    try { sessionStorage.setItem("mat-khau-so-diem", matKhau); } catch (e) {}
    batDauHienThi();
  } catch (loi) {
    tt.textContent = "Không tải được: " + loi.message;
  }
});

function batDauHienThi() {
  // Danh sách đề có trong dữ liệu
  const cacDe = {};
  tatCaKetQua.forEach((r) => { cacDe[r.maDe] = r.tenDe; });
  $("loc-de").innerHTML = `<option value="">Tất cả đề</option>` +
    Object.entries(cacDe).map(([ma, ten]) => `<option value="${anToan(ma)}">${anToan(ten)}</option>`).join("");
  $("noi-dung").hidden = false;
  veLai();
}

$("loc-de").addEventListener("change", veLai);
$("loc-tim").addEventListener("input", veLai);
document.querySelector("thead").addEventListener("click", (e) => {
  const th = e.target.closest("th[data-sap]");
  if (!th) return;
  sapXep = { cot: th.dataset.sap, giam: sapXep.cot === th.dataset.sap ? !sapXep.giam : true };
  veLai();
});

/* ---------- Vẽ ---------- */

function locDuLieu() {
  const maDe = $("loc-de").value;
  const tim = $("loc-tim").value.trim().toLowerCase();
  return tatCaKetQua.filter((r) =>
    (!maDe || r.maDe === maDe) &&
    (!tim || `${r.hoTen} ${r.lop}`.toLowerCase().includes(tim)));
}

function veLai() {
  const ds = locDuLieu();
  veTheSo(ds);
  veTiLe(ds);
  veBang(ds);
}

function veTheSo(ds) {
  const diem = ds.map((r) => Number(r.diem));
  const tb = diem.length ? diem.reduce((a, b) => a + b, 0) / diem.length : 0;
  const soHocSinh = new Set(ds.map((r) => `${r.hoTen}|${r.lop}`.toLowerCase())).size;
  const o = (nhan, giaTri) => `<div><span class="nhan">${nhan}</span><span class="gia-tri">${giaTri}</span></div>`;
  $("the-so").innerHTML = [
    o("Lượt làm", ds.length),
    o("Học sinh", soHocSinh),
    o("Điểm TB", diem.length ? vietSo(tb) : "–"),
    o("Cao nhất", diem.length ? vietSo(Math.max(...diem)) : "–"),
    o("Thấp nhất", diem.length ? vietSo(Math.min(...diem)) : "–")
  ].join("");
}

// Tỉ lệ đúng từng câu: chỉ hiện khi đang lọc 1 đề cụ thể
function veTiLe(ds) {
  const hop = $("ti-le");
  const maDe = $("loc-de").value;
  const coChiTiet = ds.filter((r) => r.chiTiet);
  if (!maDe || !coChiTiet.length) { hop.hidden = true; return; }

  const dong = [];
  const them = (ten, tiLe) => dong.push({ ten, tiLe });
  const ct0 = coChiTiet[0].chiTiet;
  ct0.phan1.forEach((_, i) => them(`I.${i + 1}`, tb(coChiTiet, (c) => (c.phan1[i] ? 1 : 0))));
  ct0.phan2.forEach((_, i) => them(`II.${i + 1}`, tb(coChiTiet, (c) => c.phan2[i] / 4)));
  ct0.phan3.forEach((_, i) => them(`III.${i + 1}`, tb(coChiTiet, (c) => (c.phan3[i] ? 1 : 0))));

  const mau = (p) => (p >= 0.7 ? "var(--good)" : p >= 0.4 ? "var(--warn)" : "var(--red)");
  hop.innerHTML = `
    <span class="nhan">Tỉ lệ làm đúng từng câu (Phần II tính theo số ý đúng)</span>
    ${dong.map((d) => `
      <div class="dong-ti-le">
        <span class="ten">${d.ten}</span>
        <span class="thanh"><div style="width:${d.tiLe * 100}%;background:${mau(d.tiLe)}"></div></span>
        <span class="pt">${Math.round(d.tiLe * 100)}%</span>
      </div>`).join("")}`;
  hop.hidden = false;
}

function tb(ds, layGiaTri) {
  return ds.reduce((tong, r) => tong + layGiaTri(r.chiTiet), 0) / ds.length;
}

function veBang(ds) {
  const { cot, giam } = sapXep;
  const sx = [...ds].sort((a, b) => {
    const x = a[cot], y = b[cot];
    const kq = typeof x === "number" ? x - y : String(x).localeCompare(String(y), "vi");
    return giam ? -kq : kq;
  });
  document.querySelectorAll("th[data-sap]").forEach((th) => {
    th.textContent = th.textContent.replace(/ [▲▼]$/, "") + (th.dataset.sap === cot ? (giam ? " ▼" : " ▲") : "");
  });
  $("bang").innerHTML = sx.length ? sx.map((r) => `
    <tr>
      <td>${ngayGio(r.nopLuc)}</td>
      <td>${anToan(r.hoTen)}</td>
      <td>${anToan(r.lop)}</td>
      <td>${anToan(r.tenDe)}</td>
      <td class="so"><b>${vietSo(r.diem)}</b></td>
      <td class="so">${vietSo(r.diem1)}</td>
      <td class="so">${vietSo(r.diem2)}</td>
      <td class="so">${vietSo(r.diem3)}</td>
      <td class="so">${phutGiay(r.giayDaLam)}</td>
    </tr>`).join("")
    : `<tr><td colspan="9" class="trong">Chưa có bài nộp nào khớp bộ lọc.</td></tr>`;
}

/* ---------- Dữ liệu mẫu khi chưa kết nối Google Sheet ---------- */
function taoDuLieuMau() {
  const de = DANH_SACH_DE[0];
  const ten = ["(Mẫu) Học sinh A", "(Mẫu) Học sinh B", "(Mẫu) Học sinh C", "(Mẫu) Học sinh D", "(Mẫu) Học sinh E"];
  return ten.map((hoTen, k) => {
    const ngauNhien = (i) => ((i * 7 + k * 13) % 10) / 10; // giả lập cố định, không đổi mỗi lần tải
    const phan1 = de.phan1.map((_, i) => ngauNhien(i) < 0.75);
    const phan2 = de.phan2.map((_, i) => 1 + ((i + k) % 4));
    const phan3 = de.phan3.map((_, i) => ngauNhien(i + 3) < 0.5);
    const d1 = phan1.filter(Boolean).length * 0.25;
    const d2 = phan2.reduce((t, s) => t + [0, 0.1, 0.25, 0.5, 1][s], 0);
    const d3 = phan3.filter(Boolean).length * 0.5;
    return {
      nopLuc: new Date(Date.now() - k * 3600e3).toISOString(),
      hoTen, lop: k % 2 ? "12A1" : "12A2", maDe: de.id, tenDe: de.ten, mon: de.mon,
      diem: Math.round((d1 + d2 + d3) * 100) / 100, diem1: d1, diem2: Math.round(d2 * 100) / 100, diem3: d3,
      diemToiDa: 10, giayDaLam: 3600 + k * 400,
      chiTiet: { phan1, phan2, phan3 }
    };
  });
}

// Tự điền lại mật khẩu trong cùng tab
try { $("o-mat-khau").value = sessionStorage.getItem("mat-khau-so-diem") || ""; } catch (e) {}
