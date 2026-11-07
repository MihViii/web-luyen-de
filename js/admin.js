/* =====================================================================
   TRANG THỐNG KÊ (admin.html)
   Lấy dữ liệu từ Apps Script (doGet) bằng mật khẩu, rồi tính:
   số lượt, điểm trung bình/cao/thấp, tỉ lệ đúng từng câu, bảng điểm.
   Bấm một dòng trong bảng để mở bài làm của học sinh đó (màn "xem bài").
   anToan, vietSo, veBangDiem, veXemLai... nằm trong js/xem-lai.js.
   ===================================================================== */

const $ = (id) => document.getElementById(id);
const SO_LA_MA = ["", "I", "II", "III"];

let tatCaKetQua = [];
let sapXep = { cot: "nopLuc", giam: true };
let dsDangHien = [];       // các dòng đang hiện trong bảng, đúng thứ tự sắp xếp (để đi bài trước/bài sau)
let viTriDangXem = -1;     // vị trí trong dsDangHien của bài đang mở
let chiXemCauSai = false;  // bộ lọc "Chỉ câu sai", giữ nguyên khi chuyển sang bài khác
let daThemLichSu = false;  // đã pushState chưa, để nút Back của trình duyệt/điện thoại đóng màn xem bài

// Điểm trung bình có thể dài (7.333333) -> làm tròn 2 chữ số, đổi dấu chấm thành phẩy
const vietDiem = (x, chuSo = 2) => vietSo(Math.round(x * 10 ** chuSo) / 10 ** chuSo);
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
    await DE_DA_TAI; // dữ liệu mẫu dựa trên đề đầu tiên
    tatCaKetQua = taoDuLieuMau();
    chamLaiTatCa();
    batDauHienThi();
    return;
  }

  tt.textContent = "Đang tải…";
  try {
    const url = CAU_HINH.LINK_APPS_SCRIPT + "?key=" + encodeURIComponent(matKhau);
    const duLieu = await (await fetch(url)).json();
    if (!duLieu.ok) throw new Error(duLieu.loi);
    await DE_DA_TAI; // cần đề (đáp án, ảnh) để xem lại bài làm
    tatCaKetQua = duLieu.ketQua;
    chamLaiTatCa();
    tt.textContent = `Đã tải ${tatCaKetQua.length} lượt làm bài`;
    // Code.gs cũ chưa trả về bài làm: nhắc cập nhật
    if (tatCaKetQua.length && !("baiLam" in tatCaKetQua[0])) {
      tt.textContent += ". Muốn xem bài làm từng học sinh: cập nhật Code.gs và triển khai phiên bản mới (README mục 3)";
    }
    try { sessionStorage.setItem("mat-khau-so-diem", matKhau); } catch (e) {}
    batDauHienThi();
  } catch (loi) {
    tt.textContent = "Không tải được: " + loi.message;
  }
});

/* ---------- Chấm lại theo đáp án hiện tại ---------- */
// Điểm trong Google Sheet là điểm lúc nộp. Lỡ nhập sai đáp án rồi sửa lại thì điểm đó sai, nên trang này
// luôn chấm lại mọi lượt nộp từ bài làm (cột "Bài làm" trong Sheet) theo đáp án hiện tại trong de.js.
// Điểm lúc nộp giữ ở r.diemLucNop; lượt nào điểm đổi thì có dấu ↻. Tên đề cũng lấy theo tên hiện tại.
function chamLaiTatCa() {
  const theoId = new Map(DANH_SACH_DE.map((d) => [d.id, d]));
  tatCaKetQua.forEach((r) => {
    if (r.diemLucNop === undefined) r.diemLucNop = Number(r.diem);
    const de = theoId.get(r.maDe);
    if (!de) return;                 // đề đã xóa/ẩn: giữ điểm lúc nộp
    r.tenDe = de.ten;
    if (!r.baiLam) return;           // không có bài làm (Code.gs cũ): giữ điểm lúc nộp
    const kq = chamBai(de, chuanHoaBaiLam(de, r.baiLam));
    Object.assign(r, { diem: kq.tong, diem1: kq.diem1, diem2: kq.diem2, diem3: kq.diem3, diemToiDa: diemToiDa(de), chiTiet: kq.chiTiet });
  });
}
const daChamLai = (r) => Number.isFinite(r.diemLucNop) && Math.abs(Number(r.diem) - r.diemLucNop) > 1e-9;
const dauChamLai = (r) => daChamLai(r)
  ? `<span class="dau-cham-lai" title="Lúc nộp được ${vietDiem(r.diemLucNop)} điểm, đã chấm lại theo đáp án hiện tại">↻</span>` : "";

/* ---------- Lọc kết quả theo thư mục trong Kho đề ---------- */

const LOC_CHUA_XEP = "__chua-xep";

// Id mọi đề trong một thư mục và các thư mục con của nó
const idDeTrongCay = (t) => [...t.de, ...t.con.flatMap(idDeTrongCay)];

// Tập id đề ứng với lựa chọn ở ô Thư mục ("" = tất cả -> null)
function deTheoThuMuc(maThuMuc) {
  if (!maThuMuc) return null;
  const kho = layKhoDe();
  if (maThuMuc === LOC_CHUA_XEP) {
    const daXep = new Set();
    duyetKho(kho, (t) => t.de.forEach((id) => daXep.add(id)));
    const conLai = new Set(tatCaKetQua.map((r) => r.maDe).filter((id) => !daXep.has(id)));
    return conLai;
  }
  let ketQua = new Set();
  duyetKho(kho, (t) => { if (t.ma === maThuMuc) ketQua = new Set(idDeTrongCay(t)); });
  return ketQua;
}

function batDauHienThi() {
  // Ô Thư mục: cây thư mục dạng đường dẫn "Toán 12 / Chương 1", kèm số lượt làm của cả cây con
  const kho = layKhoDe();
  const soLuot = (cacId) => tatCaKetQua.filter((r) => cacId.has(r.maDe)).length;
  const luaChon = [];
  duyetKho(kho, (t, duongDan) => {
    luaChon.push(`<option value="${anToan(t.ma)}">${anToan(duongDan.join(" / "))} (${soLuot(new Set(idDeTrongCay(t)))} lượt)</option>`);
  });
  const chuaXep = deTheoThuMuc(LOC_CHUA_XEP);
  const cu = $("loc-thu-muc").value;
  $("loc-thu-muc").innerHTML = `<option value="">Tất cả thư mục (${tatCaKetQua.length} lượt)</option>` + luaChon.join("") +
    (chuaXep.size ? `<option value="${LOC_CHUA_XEP}">Chưa xếp thư mục (${soLuot(chuaXep)} lượt)</option>` : "");
  if ([...$("loc-thu-muc").options].some((o) => o.value === cu)) $("loc-thu-muc").value = cu; // tải lại vẫn giữ lựa chọn
  $("noi-dung").hidden = false;
  veLai();
}

$("loc-thu-muc").addEventListener("change", veLai);
$("loc-tim").addEventListener("input", veLai);
$("bang").closest("table").querySelector("thead").addEventListener("click", (e) => {
  const th = e.target.closest("th[data-sap]");
  if (!th) return;
  sapXep = { cot: th.dataset.sap, giam: sapXep.cot === th.dataset.sap ? !sapXep.giam : true };
  veLai();
});

/* ---------- Vẽ ---------- */

function locDuLieu() {
  const cacDe = deTheoThuMuc($("loc-thu-muc").value);
  const tim = boDau($("loc-tim").value.trim());
  return tatCaKetQua.filter((r) =>
    (!cacDe || cacDe.has(r.maDe)) &&
    (!tim || boDau(`${r.hoTen} ${r.lop} ${r.tenDe}`).includes(tim)));
}

function veLai() {
  const ds = locDuLieu();
  veTheSo(ds);
  const soDoi = ds.filter(daChamLai).length;
  $("tt-cham-lai").hidden = !soDoi;
  $("tt-cham-lai").textContent = `↻ ${soDoi} lượt làm đã được chấm lại vì đáp án đề đã sửa sau khi học sinh nộp (rê chuột vào dấu ↻ để xem điểm lúc nộp).`;
  veBang(ds);
  veTongHop(ds); // dùng dsDangHien do veBang tạo, để bấm điểm mở đúng bài
}

function veTheSo(ds) {
  const diem = ds.map((r) => Number(r.diem));
  const tb = diem.length ? diem.reduce((a, b) => a + b, 0) / diem.length : 0;
  const soHocSinh = new Set(ds.map(khoaHocSinh)).size;
  const o = (nhan, giaTri) => `<div><span class="nhan">${nhan}</span><span class="gia-tri">${giaTri}</span></div>`;
  $("the-so").innerHTML = [
    o("Lượt làm", ds.length),
    o("Học sinh", soHocSinh),
    o("Điểm TB", diem.length ? vietDiem(tb) : "–"),
    o("Cao nhất", diem.length ? vietDiem(Math.max(...diem)) : "–"),
    o("Thấp nhất", diem.length ? vietDiem(Math.min(...diem)) : "–")
  ].join("");
}

// Một học sinh = cùng họ tên (bỏ dấu, bỏ khoảng trắng thừa, không phân biệt hoa thường)
const khoaHocSinh = (r) => boDau(String(r.hoTen ?? "").trim()).replace(/\s+/g, " ");

// Cột của bảng "Theo học sinh": các đề trong thư mục đang lọc (kể cả thư mục con), đúng thứ tự trong Kho đề.
// Bỏ đề đã ẩn khỏi danh sách mà chưa ai làm; giữ đề đã ẩn/xóa nếu có người làm.
function cotTongHop(maThuMuc, ds) {
  const kho = layKhoDe();
  const tenDe = new Map(DANH_SACH_DE.map((d) => [d.id, d.ten]));
  ds.forEach((r) => { if (!tenDe.has(r.maDe)) tenDe.set(r.maDe, r.tenDe); });
  const theoThuTu = (t) => [...t.con.flatMap(theoThuTu), ...t.de]; // thư mục con trước, rồi đề, như cây
  const daXep = kho.flatMap(theoThuTu);
  const daXepSet = new Set(daXep);
  const chuaXep = [...DANH_SACH_DE.map((d) => d.id), ...ds.map((r) => r.maDe)].filter((id) => !daXepSet.has(id));
  let ids = [];
  if (!maThuMuc) ids = [...daXep, ...chuaXep];
  else if (maThuMuc === LOC_CHUA_XEP) ids = chuaXep;
  else duyetKho(kho, (t) => { if (t.ma === maThuMuc) ids = theoThuTu(t); });
  const coKetQua = new Set(ds.map((r) => r.maDe));
  const dangDung = new Set(DANH_SACH_DE.map((d) => d.id));
  return [...new Set(ids)].filter((id) => dangDung.has(id) || coKetQua.has(id)).map((id) => ({ id, ten: tenDe.get(id) }));
}

// Bảng "Theo học sinh": mỗi học sinh một dòng, mỗi đề một cột; ô là điểm từng lần làm (cũ -> mới), bấm để xem bài
function veTongHop(ds) {
  const hop = $("tong-hop");
  if (!ds.length) { hop.hidden = true; return; }
  const cot = cotTongHop($("loc-thu-muc").value, ds);

  const theoHs = new Map();
  [...ds].sort((a, b) => String(a.nopLuc).localeCompare(String(b.nopLuc))).forEach((r) => {
    const khoa = khoaHocSinh(r);
    if (!theoHs.has(khoa)) theoHs.set(khoa, { ten: "", lop: "", theoDe: new Map() });
    const hs = theoHs.get(khoa);
    // Tên: lấy cách viết đầy đủ nhất (nhiều chữ có dấu, viết hoa hơn), hòa thì lấy lần mới hơn. Lớp: lần mới nhất có ghi.
    const doDayDu = (ten) => [...String(ten)].filter((c) => boDau(c) !== c || c !== c.toLowerCase()).length;
    if (doDayDu(r.hoTen) >= doDayDu(hs.ten)) hs.ten = r.hoTen;
    if (r.lop) hs.lop = r.lop;
    if (!hs.theoDe.has(r.maDe)) hs.theoDe.set(r.maDe, []);
    hs.theoDe.get(r.maDe).push(r);
  });
  const hang = [...theoHs.values()].sort((a, b) => String(a.ten).localeCompare(String(b.ten), "vi"));

  const mauDiem = (r) => {
    const thang10 = (Number(r.diem) / (Number(r.diemToiDa) || 10)) * 10;
    return thang10 >= 8 ? "cao" : thang10 < 5 ? "thap" : "";
  };
  const oDiem = (luot) => luot
    ? luot.map((r) => `<button type="button" class="diem-luot ${mauDiem(r)} ${daChamLai(r) ? "cham-lai" : ""}" data-mo="${dsDangHien.indexOf(r)}"
        title="Nộp lúc ${anToan(ngayGio(r.nopLuc))}${daChamLai(r) ? `. Lúc nộp được ${vietDiem(r.diemLucNop)} điểm, đã chấm lại theo đáp án hiện tại` : ""}. Bấm để xem bài">${vietDiem(r.diem)}</button>`).join(`<span class="mui-ten">→</span>`)
    : `<span class="chua-lam">–</span>`;

  hop.innerHTML = `
    <div class="cuon-ngang">
      <table class="bang-tong-hop">
        <thead><tr>
          <th>Học sinh</th><th>Lớp</th><th class="so">Đã làm</th>
          ${cot.map((c) => `<th class="so">${anToan(c.ten)}</th>`).join("")}
        </tr></thead>
        <tbody>${hang.map((hs) => {
          const soDaLam = cot.filter((c) => hs.theoDe.has(c.id)).length;
          return `
            <tr>
              <td>${anToan(hs.ten)}</td>
              <td>${anToan(hs.lop)}</td>
              <td class="so"><b class="${soDaLam === cot.length ? "mau-dung" : ""}">${soDaLam}/${cot.length}</b></td>
              ${cot.map((c) => `<td class="so">${oDiem(hs.theoDe.get(c.id))}</td>`).join("")}
            </tr>`;
        }).join("")}</tbody>
      </table>
    </div>`;
  hop.hidden = false;
}

$("tong-hop").addEventListener("click", (e) => {
  const nut = e.target.closest("button[data-mo]");
  if (nut && +nut.dataset.mo >= 0) moBai(+nut.dataset.mo);
});

function veBang(ds) {
  const { cot, giam } = sapXep;
  const sx = [...ds].sort((a, b) => {
    const x = a[cot], y = b[cot];
    const kq = typeof x === "number" ? x - y : String(x).localeCompare(String(y), "vi");
    return giam ? -kq : kq;
  });
  dsDangHien = sx;
  document.querySelectorAll("th[data-sap]").forEach((th) => {
    th.textContent = th.textContent.replace(/ [▲▼]$/, "") + (th.dataset.sap === cot ? (giam ? " ▼" : " ▲") : "");
  });
  $("bang").innerHTML = sx.length ? sx.map((r, i) => `
    <tr data-i="${i}">
      <td>${anToan(ngayGio(r.nopLuc))}</td>
      <td>${anToan(r.hoTen)}</td>
      <td>${anToan(r.lop)}</td>
      <td>${anToan(r.tenDe)}</td>
      <td class="so"><b>${vietDiem(r.diem)}</b>${dauChamLai(r)}</td>
      <td class="so">${vietDiem(r.diem1)}</td>
      <td class="so">${vietDiem(r.diem2)}</td>
      <td class="so">${vietDiem(r.diem3)}</td>
      <td class="so">${phutGiay(r.giayDaLam)}</td>
      <td><button type="button" class="nut nut-nho">Xem bài</button></td>
    </tr>`).join("")
    : `<tr><td colspan="10" class="trong">Chưa có bài nộp nào khớp bộ lọc.</td></tr>`;
}

// Bấm vào dòng nào (hoặc nút "Xem bài") thì mở bài làm của dòng đó
$("bang").addEventListener("click", (e) => {
  const dong = e.target.closest("tr[data-i]");
  if (dong) moBai(+dong.dataset.i);
});

/* ---------- Xem bài làm của một học sinh ---------- */

function hienMan(id) {
  ["man-bang-diem", "man-xem-bai", "man-sua-de"].forEach((m) => { $(m).hidden = m !== id; });
}

function moBai(viTri) {
  const r = dsDangHien[viTri];
  if (!r) return;
  viTriDangXem = viTri;

  $("xb-de").textContent = [r.mon, r.tenDe].filter(Boolean).join(" · ");
  $("xb-ten").textContent = r.hoTen + (r.lop ? " · " + r.lop : "");
  $("xb-vi-tri").textContent = `Bài ${viTri + 1}/${dsDangHien.length}`;
  $("nut-bai-truoc").disabled = viTri === 0;
  $("nut-bai-sau").disabled = viTri === dsDangHien.length - 1;
  $("nut-sua-dap-an").hidden = !DANH_SACH_DE.some((d) => d.id === r.maDe);

  const khung = $("xb-noi-dung");
  khung.innerHTML = veBaiLam(r);
  datBoLoc(chiXemCauSai);
  hienMan("man-xem-bai");
  window.scrollTo(0, 0);
  veCongThuc(khung);

  if (!daThemLichSu) {
    history.pushState({ xemBai: true }, "");
    daThemLichSu = true;
  }
}

function dongBai() {
  hienMan("man-bang-diem");
  // Cuộn tới dòng vừa xem và tô nhẹ, để biết mình đang xem tới bài nào
  document.querySelectorAll("#bang tr.vua-xem").forEach((tr) => tr.classList.remove("vua-xem"));
  const dong = document.querySelector(`#bang tr[data-i="${viTriDangXem}"]`);
  if (dong) {
    dong.classList.add("vua-xem");
    dong.scrollIntoView({ block: "center" });
  }
}

$("nut-dong-bai").addEventListener("click", () => {
  if (daThemLichSu) history.back(); // sự kiện popstate bên dưới sẽ đóng màn
  else dongBai();
});
window.addEventListener("popstate", () => {
  daThemLichSu = false;
  if (!$("man-xem-bai").hidden) dongBai();
});
$("nut-bai-truoc").addEventListener("click", () => moBai(viTriDangXem - 1));
$("nut-bai-sau").addEventListener("click", () => moBai(viTriDangXem + 1));

$("xb-noi-dung").addEventListener("click", (e) => {
  const nutLoc = e.target.closest("button[data-loc]");
  if (nutLoc) { datBoLoc(nutLoc.dataset.loc === "sai"); return; }

  // Bấm số câu trên lưới -> cuộn tới câu đó
  const o = e.target.closest("button[data-den]");
  if (!o) return;
  const cau = $(o.dataset.den);
  if (cau.hidden) datBoLoc(false); // câu làm đúng đang bị lọc ẩn thì hiện lại hết
  cau.scrollIntoView({ behavior: "smooth", block: "start" });
});

// Lọc "Tất cả" / "Chỉ câu sai"
function datBoLoc(chiCauSai) {
  chiXemCauSai = chiCauSai;
  document.querySelectorAll("#xb-loc button").forEach((b) =>
    b.setAttribute("aria-pressed", String((b.dataset.loc === "sai") === chiCauSai)));
  document.querySelectorAll("#xb-xem-lai .cau").forEach((c) => {
    c.hidden = chiCauSai && c.dataset.dung === "true";
  });
}

const thongBao = (chu) => `<p class="thong-bao-xem">${chu}</p>`;

// Nội dung màn xem bài: điểm, lưới ô đúng/sai, rồi từng câu
function veBaiLam(r) {
  const de = DANH_SACH_DE.find((d) => d.id === r.maDe);
  if (!de) {
    return thongBao(`Không tìm thấy đề có mã <b>${anToan(r.maDe)}</b> trong <code>de-thi/danh-sach.js</code>
      (đề đã bị xóa, tạm ẩn hoặc đổi id), nên không xem lại được từng câu.`);
  }
  if (!("baiLam" in r)) {
    return thongBao(`Máy chủ chưa gửi bài làm về. Trong Apps Script, thêm dòng <code>baiLam: docJson(r[13])</code>
      vào hàm doGet (xem <code>apps-script/Code.gs</code>), triển khai phiên bản mới (README mục 3), rồi bấm <b>Tải kết quả</b> lại.`);
  }
  if (!r.baiLam) {
    return thongBao("Lượt nộp này không có dữ liệu bài làm (ô “Bài làm” trong Google Sheet bị trống hoặc hỏng).");
  }

  const bl = chuanHoaBaiLam(de, r.baiLam);
  const kq = chamBai(de, bl); // chấm lại theo đáp án hiện tại trong de.js
  const lechDiem = Number.isFinite(r.diemLucNop) && Math.abs(kq.tong - r.diemLucNop) > 1e-9;

  const thongTin = `
    <span>Nộp lúc ${anToan(ngayGio(r.nopLuc))}</span>
    <span>Thời gian làm ${phutGiay(r.giayDaLam)}</span>
    ${lechDiem ? `<span class="mau-sai">↻ Đã chấm lại theo đáp án hiện tại. Lúc nộp, học sinh được
      ${vietDiem(r.diemLucNop)} điểm (đáp án đề đã được sửa sau đó).</span>` : ""}`;

  return `
    ${veBangDiem(de, kq, thongTin)}
    ${veTomTat(de, bl, kq.chiTiet)}
    <div class="loc-ket-qua" id="xb-loc" role="group" aria-label="Lọc câu">
      <button type="button" data-loc="tat-ca">Tất cả</button>
      <button type="button" data-loc="sai">Chỉ câu sai</button>
    </div>
    <div class="to-de" id="xb-xem-lai">${veXemLai(de, bl, kq.chiTiet, "Học sinh")}</div>`;
}

// Lưới số câu tô màu như phiếu trả lời: nhìn một lần là biết sai câu nào, bấm để tới câu đó
function veTomTat(de, bl, ct) {
  const o = (phan, i, lop, moTa) =>
    `<button type="button" class="${lop}" data-den="xem-p${phan}-${i}" title="Câu ${i + 1}: ${moTa}"
       aria-label="Phần ${SO_LA_MA[phan]} câu ${i + 1}: ${moTa}">${i + 1}</button>`;

  const nhom = [
    de.phan1.map((cau, i) => {
      const chon = bl.phan1[i];
      if (!chon) return o(1, i, "", "bỏ trống");
      return ct.phan1[i] ? o(1, i, "dung", `đúng (${chon})`) : o(1, i, "sai", `chọn ${chon}, đáp án ${cau.dapAn}`);
    }),
    de.phan2.map((cau, i) => {
      if (bl.phan2[i].every((v) => v === null)) return o(2, i, "", "bỏ trống");
      const soDung = ct.phan2[i];
      return o(2, i, soDung === 4 ? "dung" : soDung === 0 ? "sai" : "mot-phan", `đúng ${soDung}/4 ý`);
    }),
    de.phan3.map((cau, i) => {
      const tl = anToan(bl.phan3[i].trim());
      if (!tl) return o(3, i, "", "bỏ trống");
      return ct.phan3[i] ? o(3, i, "dung", `đúng (${tl})`) : o(3, i, "sai", `ghi ${tl}, đáp án ${vietSo(cau.dapAn)}`);
    })
  ];

  return `
    <div class="tom-tat-bai">
      <div class="luoi-phieu">
        ${nhom.map((cacO, k) => cacO.length
          ? `<div><h3>Phần ${SO_LA_MA[k + 1]}</h3><div class="o-so">${cacO.join("")}</div></div>` : "").join("")}
      </div>
      <p class="chu-thich">
        <span class="dung">Đúng</span><span class="mot-phan">Đúng một phần</span><span class="sai">Sai</span><span>Bỏ trống</span>
      </p>
    </div>`;
}

// Bài làm lưu trong Sheet có thể không khớp đề hiện tại (đề bị thêm/bớt câu sau khi học sinh nộp),
// hoặc bị gửi bậy (ai cũng gửi được lên Apps Script). Giữ lại giá trị hợp lệ, chỗ thiếu coi như bỏ trống.
function chuanHoaBaiLam(de, bl) {
  const p1 = (bl && bl.phan1) || [], p2 = (bl && bl.phan2) || [], p3 = (bl && bl.phan3) || [];
  return {
    phan1: de.phan1.map((_, i) => (CHU_CAI.includes(p1[i]) ? p1[i] : null)),
    phan2: de.phan2.map((cau, i) => cau.y.map((_, j) => {
      const v = Array.isArray(p2[i]) ? p2[i][j] : null;
      return typeof v === "boolean" ? v : null;
    })),
    phan3: de.phan3.map((_, i) => (p3[i] == null ? "" : String(p3[i])))
  };
}

/* ---------- Kho đề: cây thư mục đề + link (không cần mật khẩu, danh sách đề vốn công khai) ---------- */
// Cây lưu trong de-thi/kho-de.js; đọc/ghi bằng các hàm trong js/kho-de.js.
//
// Ở trang này mỗi thư mục là một "nút": { k, ten, ma, de, an, con }
//   k  : khóa tạm, để các nút bấm biết đang sửa thư mục nào
//   ma : mã cố định dùng trong link thư mục (thư mục mới tạo thì rỗng tới khi lưu)
//   de : id các đề đang hiện; an: id đề đã bị ẩn khỏi danh-sach.js (giữ lại khi lưu); con: thư mục con
// chuaXep: id các đề chưa nằm trong thư mục nào.

let khoXem = { cay: [], chuaXep: [] };
let khoTam = null;              // bản đang sửa trong chế độ "Sắp xếp thư mục", null = đang xem
const thuMucDangMo = new Set(); // mã các thư mục đang mở, để vẽ lại vẫn giữ nguyên
let demKhoa = 0;
const MO_CHUA_XEP = "__chua-xep";

const boDau = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
const tenHien = (ten) => ten.trim() || "(chưa đặt tên)";
const nutMoi = () => ({ k: ++demKhoa, ten: "", ma: "", de: [], an: [], con: [] });
const demDe = (t) => t.de.length + t.con.reduce((tong, c) => tong + demDe(c), 0);
const raDuLieu = (cay) => cay.map((t) => ({ ten: t.ten.trim(), ma: t.ma, de: [...t.de, ...t.an], con: raDuLieu(t.con) }));

function dungKho(kho) {
  const coDe = new Set(DANH_SACH_DE.map((d) => d.id));
  const daXep = new Set();
  const dung = (ds) => ds.map((t) => {
    const nut = { k: ++demKhoa, ten: t.ten, ma: t.ma, de: [], an: [], con: [] };
    t.de.forEach((id) => { daXep.add(id); (coDe.has(id) ? nut.de : nut.an).push(id); });
    nut.con = dung(t.con);
    return nut;
  });
  const cay = dung(chuanHoaKho(kho));
  return { cay, chuaXep: DANH_SACH_DE.map((d) => d.id).filter((id) => !daXep.has(id)) };
}

// Tìm thư mục theo khóa: { nut, ds: mảng anh em chứa nó, i: vị trí trong ds, cha: thư mục cha (null nếu ngoài cùng) }
function timNut(ds, k, cha = null) {
  for (let i = 0; i < ds.length; i++) {
    if (ds[i].k === k) return { nut: ds[i], ds, i, cha };
    const kq = timNut(ds[i].con, k, ds[i]);
    if (kq) return kq;
  }
  return null;
}

// Mọi thư mục kèm đường dẫn "Toán 12 / Chương 1" (cho các ô chọn ở chế độ sắp xếp)
function cacThuMucKemDuongDan(cay) {
  const ds = [];
  const di = (cacNut, cha) => cacNut.forEach((t) => {
    const duongDan = [...cha, tenHien(t.ten)];
    ds.push({ k: t.k, nhan: duongDan.join(" / ") });
    di(t.con, duongDan);
  });
  di(cay, []);
  return ds;
}

const dongLink = (nhan, link, moTa, lop = "", them = "") => `
  <div class="dong-link ${lop}">
    <span class="ten-de">${nhan}</span>
    <input readonly value="${anToan(link)}" aria-label="${moTa}">
    <button type="button" class="nut nut-nho" data-chep>Sao chép</button>${them}
  </div>`;
const dongLinkDe = (de) => dongLink(anToan(de.ten), linkDe(de.id), `Link đề ${anToan(de.ten)}`, "",
  `<button type="button" class="nut nut-nho" data-sua-de="${anToan(de.id)}" aria-label="Sửa tên, đáp án đề ${anToan(de.ten)}">Sửa</button>`);

// Chế độ xem. tim: chữ đang tìm (đã bỏ dấu). Thư mục khớp tên thì hiện cả cây con của nó,
// không khớp thì chỉ hiện những nhánh có đề khớp. Không còn gì để hiện thì trả về "".
function veNutXem(t, tim, theoId) {
  const khopTen = tim && boDau(t.ten).includes(tim);
  const timTiep = khopTen ? "" : tim;
  const con = t.con.map((c) => veNutXem(c, timTiep, theoId)).join("");
  const cacDe = t.de.filter((id) => !timTiep || boDau(theoId.get(id).ten).includes(timTiep));
  if (tim && !khopTen && !con && !cacDe.length) return "";
  return `
    <details class="thu-muc" data-mo="${anToan(t.ma)}" ${tim || thuMucDangMo.has(t.ma) ? "open" : ""}>
      <summary>${ICON_THU_MUC}<span class="ten-thu-muc">${anToan(t.ten)}</span><span class="dem-cau">${demDe(t)} đề</span></summary>
      <div class="ruot-thu-muc">
        ${dongLink("Cả thư mục", linkThuMuc(t.ma), `Link cả thư mục ${anToan(t.ten)}`, "dong-link-thu-muc")}
        ${con}${cacDe.map((id) => dongLinkDe(theoId.get(id))).join("")}
        ${!t.con.length && !t.de.length ? `<p class="dem-cau">Thư mục trống</p>` : ""}
      </div>
    </details>`;
}

// Chế độ sắp xếp: một đề trong thư mục có khóa k (k = 0: chưa xếp)
function dongSuaDe(k, i, soDe, de, cacThuMuc) {
  const nut = (lam, chu, nhan, tat) =>
    `<button type="button" class="nut nut-nho" data-lam="${lam}" data-k="${k}" data-i="${i}" aria-label="${nhan}" ${tat ? "disabled" : ""}>${chu}</button>`;
  return `
    <div class="dong-sua">
      <span class="ten-de">${anToan(de.ten)}</span>
      ${nut("de-len", "↑", "Đưa đề lên", i === 0)}
      ${nut("de-xuong", "↓", "Đưa đề xuống", i === soDe - 1)}
      <select data-chuyen-de data-k="${k}" data-i="${i}" aria-label="Chuyển đề ${anToan(de.ten)} sang thư mục">
        ${cacThuMuc.map((x) => `<option value="${x.k}" ${x.k === k ? "selected" : ""}>${anToan(x.nhan)}</option>`).join("")}
        <option value="0" ${k === 0 ? "selected" : ""}>Chưa xếp thư mục</option>
      </select>
    </div>`;
}

// Chế độ sắp xếp: một thư mục (kCha: khóa thư mục cha, 0 = ngoài cùng; viTri/soAnhEm: để khóa nút ↑ ↓)
function veNutSua(t, cacThuMuc, theoId, kCha, viTri, soAnhEm) {
  const trongNo = new Set(cacThuMucKemDuongDan([t]).map((x) => x.k)); // không được chuyển vào chính nó hay con của nó
  const nut = (lam, chu, nhan, tat = false) =>
    `<button type="button" class="nut nut-nho" data-lam="${lam}" data-k="${t.k}" aria-label="${nhan}" ${tat ? "disabled" : ""}>${chu}</button>`;
  return `
    <div class="thu-muc dang-sua">
      <div class="dau-thu-muc">
        ${ICON_THU_MUC}
        <input class="o-ten-thu-muc" data-doi-ten="${t.k}" value="${anToan(t.ten)}" placeholder="Tên thư mục" aria-label="Tên thư mục">
        ${nut("tm-len", "↑", "Đưa thư mục lên", viTri === 0)}
        ${nut("tm-xuong", "↓", "Đưa thư mục xuống", viTri === soAnhEm - 1)}
        <label class="o-chon">Nằm trong
          <select data-chuyen-tm="${t.k}">
            <option value="0" ${kCha === 0 ? "selected" : ""}>(ngoài cùng)</option>
            ${cacThuMuc.filter((x) => !trongNo.has(x.k)).map((x) =>
              `<option value="${x.k}" ${x.k === kCha ? "selected" : ""}>${anToan(x.nhan)}</option>`).join("")}
          </select>
        </label>
        ${nut("tm-them-con", "+ Thư mục con", "Thêm thư mục con")}
        ${nut("tm-xoa", "Xóa", "Xóa thư mục, thư mục con và đề bên trong chuyển ra thư mục cha")}
      </div>
      <div class="ruot-thu-muc">
        ${t.con.map((c, j) => veNutSua(c, cacThuMuc, theoId, t.k, j, t.con.length)).join("")}
        ${t.de.map((id, i) => dongSuaDe(t.k, i, t.de.length, theoId.get(id), cacThuMuc)).join("")}
        ${!t.con.length && !t.de.length ? `<p class="dem-cau">Thư mục trống</p>` : ""}
      </div>
    </div>`;
}

function veKho() {
  const theoId = new Map(DANH_SACH_DE.map((d) => [d.id, d]));
  let html;
  if (khoTam) {
    const cacThuMuc = cacThuMucKemDuongDan(khoTam.cay);
    html = khoTam.cay.map((t, j) => veNutSua(t, cacThuMuc, theoId, 0, j, khoTam.cay.length)).join("") +
      (khoTam.chuaXep.length ? `
        <div class="thu-muc dang-sua">
          <div class="dau-thu-muc"><span class="ten-thu-muc">Chưa xếp thư mục</span></div>
          <div class="ruot-thu-muc">${khoTam.chuaXep.map((id, i) =>
            dongSuaDe(0, i, khoTam.chuaXep.length, theoId.get(id), cacThuMuc)).join("")}</div>
        </div>` : "");
    if (!html) html = `<p class="dem-cau">Chưa có thư mục nào. Bấm “+ Thư mục mới” để tạo.</p>`;
  } else {
    const tim = boDau($("tim-de").value.trim());
    const chuaXep = khoXem.chuaXep.filter((id) =>
      !tim || boDau(theoId.get(id).ten).includes(tim) || boDau("Chưa xếp thư mục").includes(tim));
    html = khoXem.cay.map((t) => veNutXem(t, tim, theoId)).join("") + (chuaXep.length ? `
      <details class="thu-muc" data-mo="${MO_CHUA_XEP}" ${tim || thuMucDangMo.has(MO_CHUA_XEP) ? "open" : ""}>
        <summary><span class="ten-thu-muc">Chưa xếp thư mục</span><span class="dem-cau">${khoXem.chuaXep.length} đề</span></summary>
        <div class="ruot-thu-muc">${chuaXep.map((id) => dongLinkDe(theoId.get(id))).join("")}</div>
      </details>` : "");
    if (!html) {
      html = tim
        ? `<p class="dem-cau">Không có đề hay thư mục nào khớp “${anToan($("tim-de").value.trim())}”.</p>`
        : `<p class="dem-cau">Chưa có đề nào trong de-thi/danh-sach.js.</p>`;
    }
  }
  $("ds-thu-muc").innerHTML = html;
}

DE_DA_TAI.then(() => {
  khoXem = dungKho(layKhoDe());
  veKho();
});
$("tim-de").addEventListener("input", veKho);

// Nhớ thư mục mở/đóng (sự kiện toggle không nổi bọt nên bắt ở pha capture). Đang tìm thì không nhớ.
$("ds-thu-muc").addEventListener("toggle", (e) => {
  if (!e.target.matches("details.thu-muc") || $("tim-de").value.trim()) return;
  if (e.target.open) thuMucDangMo.add(e.target.dataset.mo);
  else thuMucDangMo.delete(e.target.dataset.mo);
}, true);

$("ds-thu-muc").addEventListener("focusin", (e) => { if (e.target.matches("input[readonly]")) e.target.select(); });
$("ds-thu-muc").addEventListener("click", async (e) => {
  const nutSua = e.target.closest("button[data-lam]");
  if (nutSua) { suaKho(nutSua.dataset.lam, +nutSua.dataset.k, +nutSua.dataset.i); return; }
  const nutSuaDe = e.target.closest("button[data-sua-de]");
  if (nutSuaDe) { moSuaDe(nutSuaDe.dataset.suaDe, "man-bang-diem"); return; }

  const nut = e.target.closest("button[data-chep]");
  if (!nut) return;
  const o = nut.previousElementSibling;
  try {
    await navigator.clipboard.writeText(o.value);
  } catch (loi) { // trình duyệt chặn clipboard (mở bằng file://) -> chép kiểu cũ
    o.select();
    document.execCommand("copy");
  }
  nut.textContent = "Đã chép";
  setTimeout(() => { nut.textContent = "Sao chép"; }, 1500);
});

const datConTro = (k) => document.querySelector(`.o-ten-thu-muc[data-doi-ten="${k}"]`)?.focus();

function suaKho(lam, k, i) {
  const doiCho = (mang, a, b) => { [mang[a], mang[b]] = [mang[b], mang[a]]; };
  if (lam === "de-len" || lam === "de-xuong") {
    const ds = k === 0 ? khoTam.chuaXep : timNut(khoTam.cay, k).nut.de;
    doiCho(ds, i, lam === "de-len" ? i - 1 : i + 1);
    veKho();
    return;
  }
  const viTri = timNut(khoTam.cay, k);
  if (lam === "tm-len") doiCho(viTri.ds, viTri.i, viTri.i - 1);
  if (lam === "tm-xuong") doiCho(viTri.ds, viTri.i, viTri.i + 1);
  if (lam === "tm-them-con") {
    const moi = nutMoi();
    viTri.nut.con.push(moi);
    veKho();
    datConTro(moi.k);
    return;
  }
  if (lam === "tm-xoa") {
    // Thư mục con lên đúng chỗ thư mục bị xóa; đề ra thư mục cha (đang ở ngoài cùng thì thành "chưa xếp")
    const { nut } = viTri;
    viTri.ds.splice(viTri.i, 1, ...nut.con);
    if (viTri.cha) {
      viTri.cha.de.push(...nut.de);
      viTri.cha.an.push(...nut.an);
    } else {
      khoTam.chuaXep.push(...nut.de);
    }
  }
  veKho();
}

$("ds-thu-muc").addEventListener("change", (e) => {
  const o = e.target;
  if (o.matches("select[data-chuyen-de]")) { // chuyển đề sang thư mục khác (vào cuối thư mục đó)
    const kCu = +o.dataset.k, kMoi = +o.value;
    const [id] = (kCu === 0 ? khoTam.chuaXep : timNut(khoTam.cay, kCu).nut.de).splice(+o.dataset.i, 1);
    (kMoi === 0 ? khoTam.chuaXep : timNut(khoTam.cay, kMoi).nut.de).push(id);
    veKho();
  } else if (o.matches("select[data-chuyen-tm]")) { // chuyển thư mục vào thư mục khác (hoặc ra ngoài cùng)
    const viTri = timNut(khoTam.cay, +o.dataset.chuyenTm);
    const [nut] = viTri.ds.splice(viTri.i, 1);
    const kMoi = +o.value;
    (kMoi === 0 ? khoTam.cay : timNut(khoTam.cay, kMoi).nut.con).push(nut);
    veKho();
  }
});

// Đổi tên thư mục: sửa thẳng, chỉ cập nhật chữ trong các ô chọn thư mục để không mất con trỏ đang gõ
$("ds-thu-muc").addEventListener("input", (e) => {
  const o = e.target;
  if (o.dataset.doiTen === undefined) return;
  timNut(khoTam.cay, +o.dataset.doiTen).nut.ten = o.value;
  const nhan = new Map(cacThuMucKemDuongDan(khoTam.cay).map((x) => [String(x.k), x.nhan]));
  document.querySelectorAll("#ds-thu-muc select option").forEach((op) => {
    if (nhan.has(op.value)) op.textContent = nhan.get(op.value);
  });
});

function batCheDoSua(bat) {
  khoTam = bat ? structuredClone(khoXem) : null;
  if (bat) $("tim-de").value = "";
  $("tim-de").disabled = bat;
  $("nut-sap-xep").hidden = bat;
  $("thanh-luu-kho").hidden = !bat;
  $("goi-y-kho").innerHTML = bat
    ? "Đổi tên, xóa, đưa thư mục lên xuống. Ô <b>Nằm trong</b> để đưa thư mục vào thư mục khác; ô bên phải mỗi đề để chuyển đề. Đổi tên thư mục thì link đã gửi vẫn dùng được. Xong bấm <b>Lưu vào thư mục project</b> rồi push lên GitHub; trang học sinh cũng xếp theo đúng cây này."
    : "Bấm vào thư mục để mở. Dòng <b>Cả thư mục</b>: link cho học sinh làm mọi đề trong thư mục (kể cả thư mục con); các dòng dưới: link riêng từng đề.";
  veKho();
}

$("nut-sap-xep").addEventListener("click", () => { $("tt-luu-kho").textContent = ""; batCheDoSua(true); });
$("nut-huy-sap-xep").addEventListener("click", () => batCheDoSua(false));
$("nut-them-thu-muc").addEventListener("click", () => {
  const moi = nutMoi();
  khoTam.cay.push(moi);
  veKho();
  datConTro(moi.k);
});

$("nut-luu-kho").addEventListener("click", async () => {
  const tt = $("tt-luu-kho");
  let loi = "";
  const kiemTra = (ds) => {
    const ten = ds.map((t) => t.ten.trim().toLowerCase());
    if (ten.some((x) => !x)) loi = "Có thư mục chưa đặt tên.";
    else if (new Set(ten).size !== ten.length) loi ||= "Có hai thư mục trùng tên nằm cùng một chỗ.";
    ds.forEach((t) => kiemTra(t.con));
  };
  kiemTra(khoTam.cay);
  if (loi) { tt.textContent = loi; return; }
  // chuanHoaKho tạo mã cho thư mục mới; thư mục cũ giữ mã nên link thư mục đã gửi vẫn dùng được dù đổi tên
  const kho = chuanHoaKho(raDuLieu(khoTam.cay));

  // Safari/Firefox không ghi thẳng vào thư mục được: tải file về để tự chép vào
  if (!window.showDirectoryPicker) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([vietKhoDe(kho)], { type: "text/javascript" }));
    a.download = "kho-de.js";
    a.click();
    khoXem = dungKho(kho);
    batCheDoSua(false);
    tt.textContent = "Trình duyệt này không ghi thẳng vào thư mục được, nên đã tải về file kho-de.js. Chép đè vào thư mục de-thi/ của project rồi push lên GitHub.";
    return;
  }

  let goc;
  try {
    goc = await showDirectoryPicker({ id: "web-luyen-de", mode: "readwrite" });
  } catch (loiMo) {
    if (loiMo.name !== "AbortError") tt.textContent = "Không mở được thư mục: " + loiMo.message;
    return;
  }
  try {
    const daBiet = new Set(DANH_SACH_DE.map((d) => d.id));
    duyetKho(kho, (t) => t.de.forEach((id) => daBiet.add(id)));
    let daGhi = kho;
    await ghiKhoDe(goc, (khoTrenMay) => {
      // Giữ các đề có trong file trên máy mà trang này chưa biết (vd đề vừa tạo trên máy, chưa push)
      duyetKho(khoTrenMay, (t, duongDan) => t.de.forEach((id) => {
        if (daBiet.has(id)) return;
        daBiet.add(id);
        themDeVaoKho(kho, duongDan.join(" / "), id);
      }));
      daGhi = chuanHoaKho(kho);
      return daGhi;
    });
    khoXem = dungKho(daGhi);
    batCheDoSua(false);
    tt.textContent = "Đã lưu vào de-thi/kho-de.js. Push lên GitHub để trang học sinh và trang admin trên mạng cũng đổi theo.";
  } catch (loiGhi) {
    tt.textContent = "Chưa lưu được: " + loiGhi.message;
  }
});

/* ---------- Sửa tên, đáp án đề ngay trên trang admin ---------- */
// Mở từ nút "Sửa" trong Kho đề hoặc "Sửa đáp án đề này" ở màn xem bài. Lưu thì ghi đè file
// de-thi/<thư mục đề>/de.js trên máy (File System Access API, như trang tạo đề), rồi chấm lại ngay
// mọi lượt nộp của đề đó. Push lên GitHub thì học sinh làm bài với đáp án mới.

let deDangSua = null;     // đề đang sửa (đối tượng trong DANH_SACH_DE)
let banSua = null;        // { ten, moTa, thoiGian, p1: ["A"..], p2: [[true/false/null]], p3: ["2,71"] }
let manQuayLai = "man-bang-diem";
let cuonQuayLai = 0;

const TEN_FILE_DE = "de.js";

// Đường dẫn thư mục đề tính từ de-thi/, vd "toan/de-18" (de.thuMuc do tai-de.js ghi lúc nạp đề)
function thuMucCuaDe(de) {
  const goc = new URL("de-thi/", location.href).href;
  return de.thuMuc.startsWith(goc) ? decodeURIComponent(de.thuMuc.slice(goc.length)).replace(/\/$/, "") : "";
}

// Đọc nội dung một file de.js thành đối tượng đề (chạy file với hàm themDe giả)
function docFileDe(vanBan) {
  let de = null;
  new Function("themDe", vanBan)((x) => { de = x; });
  return de;
}

// Viết lại file de.js từ đối tượng đề. Giữ mọi trường (nội dung, lựa chọn, lời giải, hình...),
// mỗi câu một dòng cho dễ đọc. Bỏ thuMuc (trang tự thêm lúc nạp, không thuộc file).
function vietFileDe(de) {
  const { thuMuc, ...sach } = de;
  const giaTri = (v) => {
    if (Array.isArray(v)) return `[${v.map(giaTri).join(", ")}]`;
    if (v && typeof v === "object") {
      return `{ ${Object.entries(v).map(([k, x]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${giaTri(x)}`).join(", ")} }`;
    }
    return JSON.stringify(v);
  };
  const dong = Object.entries(sach).map(([k, v]) => (["phan1", "phan2", "phan3"].includes(k) && Array.isArray(v)
    ? `  ${k}: ${v.length ? `[\n${v.map((c) => "    " + giaTri(c)).join(",\n")}\n  ]` : "[]"}`
    : `  ${k}: ${giaTri(v)}`));
  return `/* ${String(de.ten).replace(/\*\//g, "")} · ${de.mon}
   Sửa lần cuối bằng trang admin ngày ${new Date().toLocaleDateString("vi-VN")}.
   Muốn sửa tên, đáp án: trang admin -> Kho đề -> nút "Sửa" cạnh đề (hoặc sửa tay bên dưới).
   ĐỪNG đổi "id" của đề đã có học sinh làm, vì link và bảng điểm nhận đề theo id. */

themDe({
${dong.join(",\n")}
});
`;
}

const giongDapAn3 = (chuoi, dapAn) => { const so = chuyenThanhSo(chuoi); return so !== null && bangNhau(so, dapAn); };

// Những chỗ đã sửa so với đề hiện tại (để đếm, đánh dấu và biết có cần lưu không)
function cacChoDaSua() {
  const de = deDangSua, b = banSua, ds = [];
  if (b.ten.trim() !== de.ten) ds.push("tên đề");
  if (b.moTa.trim() !== (de.moTa || "")) ds.push("mô tả");
  if (Number(b.thoiGian) !== de.thoiGian) ds.push("thời gian");
  de.phan1.forEach((cau, i) => { if (b.p1[i] !== cau.dapAn) ds.push(`I.${i + 1}`); });
  de.phan2.forEach((cau, i) => { if (cau.y.some((y, j) => b.p2[i][j] !== y.dapAn)) ds.push(`II.${i + 1}`); });
  de.phan3.forEach((cau, i) => { if (!giongDapAn3(b.p3[i], cau.dapAn)) ds.push(`III.${i + 1}`); });
  return ds;
}

function moSuaDe(id, tuMan) {
  const de = DANH_SACH_DE.find((d) => d.id === id);
  if (!de) return;
  deDangSua = de;
  manQuayLai = tuMan;
  cuonQuayLai = window.scrollY;
  banSua = {
    ten: de.ten, moTa: de.moTa || "", thoiGian: de.thoiGian,
    p1: de.phan1.map((c) => c.dapAn),
    p2: de.phan2.map((c) => c.y.map((y) => y.dapAn)),
    p3: de.phan3.map((c) => vietSo(c.dapAn))
  };
  $("sd-nhan").textContent = `Sửa đề · de-thi/${thuMucCuaDe(de)}/${TEN_FILE_DE}`;
  $("sd-tieu-de").textContent = de.ten;
  $("sd-tt").textContent = "";
  $("sd-tt").className = "trang-thai-luu";
  veSuaDe();
  hienMan("man-sua-de");
  window.scrollTo(0, 0);
}

function veSuaDe() {
  const de = deDangSua, b = banSua;
  const cauHoi = (cau) => `<div class="cau-hoi">${cau.noiDung || ""}${veHinh(de, cau)}</div>`;
  const dauCau = (ten) => `<div class="dau-cau"><b>${ten}</b><span class="nhan-sua"></span></div>`;
  const tieuDePhan = (ten, moTa) => `<div class="tieu-de-phan"><h2>${ten}</h2><p>${moTa}</p></div>`;

  $("sd-noi-dung").innerHTML = `
    <div class="luoi-thong-tin">
      <label>Tên đề <input id="sd-ten" value="${anToan(b.ten)}"></label>
      <label>Mô tả (không bắt buộc) <input id="sd-mo-ta" value="${anToan(b.moTa)}"></label>
      <label>Thời gian (phút) <input id="sd-thoi-gian" type="number" min="1" value="${anToan(b.thoiGian)}"></label>
    </div>
    ${de.phan1.length ? tieuDePhan("Phần I", "Chọn đáp án đúng của mỗi câu.") : ""}
    ${de.phan1.map((cau, i) => `
      <article class="cau" data-cau="p1-${i}">
        ${dauCau(`Câu ${i + 1}`)}${cauHoi(cau)}
        <div class="lua-chon${cau.luaChon ? "" : " chi-chu"}">
          ${phuongAn(cau).map((lc, j) => `
            <label><input type="radio" name="sd-p1-${i}" value="${CHU_CAI[j]}" ${b.p1[i] === CHU_CAI[j] ? "checked" : ""}>
              <span class="bong">${CHU_CAI[j]}</span>${lc ? `<span>${lc}</span>` : ""}</label>`).join("")}
        </div>
      </article>`).join("")}
    ${de.phan2.length ? tieuDePhan("Phần II", "Mỗi ý chọn Đúng hoặc Sai.") : ""}
    ${de.phan2.map((cau, i) => `
      <article class="cau" data-cau="p2-${i}">
        ${dauCau(`Câu ${i + 1}`)}${cauHoi(cau)}
        <div class="y-dung-sai">
          ${cau.y.map((y, j) => `
            <div class="dong-y">
              <span class="chu-y">${"abcd"[j]})</span>
              <span class="noi-dung-y">${y.noiDung || ""}</span>
              <span class="chon-ds">
                <label><input type="radio" name="sd-p2-${i}-${j}" value="dung" ${b.p2[i][j] === true ? "checked" : ""}><span>Đ</span></label>
                <label><input type="radio" name="sd-p2-${i}-${j}" value="sai" ${b.p2[i][j] === false ? "checked" : ""}><span>S</span></label>
              </span>
            </div>`).join("")}
        </div>
      </article>`).join("")}
    ${de.phan3.length ? tieuDePhan("Phần III", "Đáp án là một số, dùng dấu phẩy cho số thập phân.") : ""}
    ${de.phan3.map((cau, i) => `
      <article class="cau" data-cau="p3-${i}">
        ${dauCau(`Câu ${i + 1}`)}${cauHoi(cau)}
        <div class="hang-dap-an">
          <span class="nhan">Đáp án</span>
          <input class="o-dap-an" data-p3="${i}" value="${anToan(b.p3[i])}" maxlength="8" autocomplete="off"
                 aria-label="Đáp án câu ${i + 1} phần III">
        </div>
      </article>`).join("")}`;
  document.querySelectorAll("#sd-noi-dung article[data-cau]").forEach(danhDauCau);
  capNhatDemSua();
  veCongThuc($("sd-noi-dung"));
}

// Đánh dấu câu đã đổi đáp án: viền màu + "Đã sửa: B → A"
function danhDauCau(the) {
  const de = deDangSua, b = banSua;
  const [phan, i] = the.dataset.cau.split("-");
  const chuDS = (v) => (v === true ? "Đ" : v === false ? "S" : "?");
  let nhan = "";
  if (phan === "p1" && b.p1[i] !== de.phan1[i].dapAn) nhan = `Đã sửa: ${de.phan1[i].dapAn} → ${b.p1[i]}`;
  if (phan === "p2" && de.phan2[i].y.some((y, j) => b.p2[i][j] !== y.dapAn)) {
    nhan = `Đã sửa: ${de.phan2[i].y.map((y) => chuDS(y.dapAn)).join("")} → ${b.p2[i].map(chuDS).join("")}`;
  }
  if (phan === "p3" && !giongDapAn3(b.p3[i], de.phan3[i].dapAn)) {
    nhan = `Đã sửa: ${vietSo(de.phan3[i].dapAn)} → ${anToan(b.p3[i]) || "(trống)"}`;
  }
  the.classList.toggle("da-sua", !!nhan);
  the.querySelector(".nhan-sua").innerHTML = nhan ? huyHieu("mot-phan", nhan) : "";
}

function capNhatDemSua() {
  const ds = cacChoDaSua();
  $("sd-dem-sua").textContent = ds.length ? `Đã sửa ${ds.length} chỗ: ${ds.join(", ")}` : "Chưa sửa gì";
  $("nut-luu-de").disabled = !ds.length;
}

$("sd-noi-dung").addEventListener("change", (e) => {
  const o = e.target;
  if (o.type !== "radio" || !o.name.startsWith("sd-")) return;
  const [, phan, i, j] = o.name.split("-");
  if (phan === "p1") banSua.p1[+i] = o.value;
  if (phan === "p2") banSua.p2[+i][+j] = o.value === "dung";
  danhDauCau(o.closest("article"));
  capNhatDemSua();
});

$("sd-noi-dung").addEventListener("input", (e) => {
  const o = e.target;
  if (o.id === "sd-ten") banSua.ten = o.value;
  else if (o.id === "sd-mo-ta") banSua.moTa = o.value;
  else if (o.id === "sd-thoi-gian") banSua.thoiGian = o.value;
  else if (o.dataset.p3 !== undefined) {
    o.value = o.value.replace(/[^0-9,.\-]/g, "").replace(".", ","); // giống ô trả lời của học sinh
    banSua.p3[+o.dataset.p3] = o.value;
    danhDauCau(o.closest("article"));
  } else return;
  capNhatDemSua();
});

function dongManSuaDe() {
  if (cacChoDaSua().length && !confirm("Bỏ các chỗ đã sửa mà chưa lưu?")) return;
  deDangSua = null;
  if (manQuayLai === "man-xem-bai") {
    moBai(viTriDangXem); // vẽ lại bài đang xem (có thể đã chấm lại)
  } else {
    hienMan(manQuayLai);
    window.scrollTo(0, cuonQuayLai);
  }
}
$("nut-dong-sua").addEventListener("click", dongManSuaDe);
$("nut-huy-sua-de").addEventListener("click", dongManSuaDe);
$("nut-sua-dap-an").addEventListener("click", () => {
  const r = dsDangHien[viTriDangXem];
  if (r) moSuaDe(r.maDe, "man-xem-bai");
});

$("nut-luu-de").addEventListener("click", async () => {
  const de = deDangSua, b = banSua, tt = $("sd-tt");
  tt.className = "trang-thai-luu loi";
  // Kiểm tra trước khi lưu
  const loi = [];
  if (!b.ten.trim()) loi.push("Chưa nhập tên đề.");
  if (!(Number(b.thoiGian) > 0)) loi.push("Thời gian phải lớn hơn 0.");
  b.p2.forEach((y, i) => { if (y.includes(null)) loi.push(`Phần II câu ${i + 1}: chưa chọn đủ Đ/S cho 4 ý.`); });
  b.p3.forEach((x, i) => { if (chuyenThanhSo(x) === null) loi.push(`Phần III câu ${i + 1}: đáp án phải là một số.`); });
  if (loi.length) { tt.innerHTML = "Chưa lưu được:<br>" + loi.map(anToan).join("<br>"); return; }

  // Đề sau khi sửa (giữ nguyên mọi trường khác)
  const { thuMuc, ...goc } = de;
  const moi = structuredClone(goc);
  Object.assign(moi, { ten: b.ten.trim(), moTa: b.moTa.trim(), thoiGian: Number(b.thoiGian) });
  moi.phan1.forEach((c, i) => { c.dapAn = b.p1[i]; });
  moi.phan2.forEach((c, i) => c.y.forEach((y, j) => { y.dapAn = b.p2[i][j]; }));
  moi.phan3.forEach((c, i) => { c.dapAn = chuyenThanhSo(b.p3[i]); });
  const noiDung = vietFileDe(moi);
  const duongDan = `de-thi/${thuMucCuaDe(de)}/${TEN_FILE_DE}`;

  if (!window.showDirectoryPicker) {
    // Safari/Firefox không ghi thẳng vào thư mục được: tải file về để tự chép đè
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([noiDung], { type: "text/javascript" }));
    a.download = TEN_FILE_DE;
    a.click();
  } else {
    let thuGoc;
    try {
      thuGoc = await showDirectoryPicker({ id: "web-luyen-de", mode: "readwrite" });
    } catch (loiMo) {
      if (loiMo.name !== "AbortError") tt.textContent = "Không mở được thư mục: " + loiMo.message;
      return;
    }
    try {
      let thu = await thuGoc.getDirectoryHandle("de-thi").catch(() => null);
      for (const phan of thuMucCuaDe(de).split("/")) thu = thu && await thu.getDirectoryHandle(phan).catch(() => null);
      const tep = thu && await thu.getFileHandle(TEN_FILE_DE).catch(() => null);
      if (!tep) throw new Error(`Không thấy ${duongDan} trong thư mục "${thuGoc.name}". Hãy chọn đúng thư mục web-luyen-de.`);
      // Chống ghi nhầm: file trên máy phải là đúng đề này; khác bản trang đang dùng thì hỏi lại
      let trenMay;
      try { trenMay = docFileDe(await (await tep.getFile()).text()); } catch (e) { trenMay = null; }
      if (trenMay && trenMay.id !== de.id) throw new Error(`File ${duongDan} trên máy là đề khác (id "${trenMay.id}"), không ghi đè.`);
      if (trenMay && JSON.stringify(trenMay) !== JSON.stringify(goc) &&
          !confirm(`File ${duongDan} trên máy khác với bản trang đang dùng (có thể bạn đã sửa trên máy mà chưa push). Vẫn ghi đè bằng bản vừa sửa?`)) {
        tt.textContent = "Chưa lưu.";
        return;
      }
      const ghi = await tep.createWritable();
      await ghi.write(noiDung);
      await ghi.close();
    } catch (loiGhi) {
      tt.textContent = "Chưa lưu được: " + loiGhi.message;
      return;
    }
  }

  // Áp dụng ngay vào trang: đổi tên, đáp án, rồi chấm lại các lượt nộp của đề này
  const luotCuaDe = tatCaKetQua.filter((r) => r.maDe === de.id);
  const diemTruoc = new Map(luotCuaDe.map((r) => [r, Number(r.diem)]));
  Object.assign(de, { ten: moi.ten, moTa: moi.moTa, thoiGian: moi.thoiGian });
  de.phan1.forEach((c, i) => { c.dapAn = moi.phan1[i].dapAn; });
  de.phan2.forEach((c, i) => c.y.forEach((y, j) => { y.dapAn = moi.phan2[i].y[j].dapAn; }));
  de.phan3.forEach((c, i) => { c.dapAn = moi.phan3[i].dapAn; });
  chamLaiTatCa();
  const soDoiDiem = luotCuaDe.filter((r) => Math.abs(Number(r.diem) - diemTruoc.get(r)) > 1e-9).length;

  khoXem = dungKho(layKhoDe());
  if (!khoTam) veKho();
  if (tatCaKetQua.length) batDauHienThi();
  $("sd-tieu-de").textContent = de.ten;
  veSuaDe();

  tt.className = "trang-thai-luu ok";
  tt.innerHTML = (window.showDirectoryPicker
    ? `Đã lưu vào <code>${anToan(duongDan)}</code>.`
    : `Trình duyệt này không ghi thẳng vào thư mục được, nên đã tải về file <code>${TEN_FILE_DE}</code>: chép đè vào <code>${anToan(duongDan)}</code>.`) +
    (tatCaKetQua.length
      ? ` Đã chấm lại ${luotCuaDe.length} lượt làm đề này${soDoiDiem ? `, ${soDoiDiem} lượt đổi điểm` : ", không lượt nào đổi điểm"}.`
      : " Bấm Tải kết quả để xem điểm đã chấm lại.") +
    " Nhớ commit và push lên GitHub để học sinh làm bài với đáp án mới.";
});

/* ---------- Dữ liệu mẫu khi chưa kết nối Google Sheet ---------- */
function taoDuLieuMau() {
  const de = DANH_SACH_DE[0];
  if (!de) return [];
  const ten = ["(Mẫu) Học sinh A", "(Mẫu) Học sinh B", "(Mẫu) Học sinh C", "(Mẫu) Học sinh D", "(Mẫu) Học sinh E"];
  return ten.map((hoTen, k) => {
    const ngauNhien = (i) => ((i * 7 + k * 13) % 10) / 10; // giả lập cố định, không đổi mỗi lần tải
    const chuKhac = (dapAn, i) => CHU_CAI[(CHU_CAI.indexOf(dapAn) + 1 + (i % 3)) % 4];
    const baiLam = {
      phan1: de.phan1.map((cau, i) => {
        const x = ngauNhien(i);
        return x < 0.7 ? cau.dapAn : x < 0.9 ? chuKhac(cau.dapAn, i) : null;
      }),
      phan2: de.phan2.map((cau, i) => cau.y.map((y, j) => (j <= (i + k) % 4 ? y.dapAn : !y.dapAn))),
      phan3: de.phan3.map((cau, i) => {
        const x = ngauNhien(i + 3);
        return x < 0.5 ? vietSo(cau.dapAn) : x < 0.8 ? vietSo(cau.dapAn + 1) : "";
      })
    };
    const kq = chamBai(de, baiLam);
    return {
      nopLuc: new Date(Date.now() - k * 3600e3).toISOString(),
      hoTen, lop: k % 2 ? "12A1" : "12A2", maDe: de.id, tenDe: de.ten, mon: de.mon,
      diem: kq.tong, diem1: kq.diem1, diem2: kq.diem2, diem3: kq.diem3,
      diemToiDa: diemToiDa(de), giayDaLam: 3600 + k * 400,
      chiTiet: kq.chiTiet, baiLam
    };
  });
}

// Tự điền lại mật khẩu trong cùng tab
try { $("o-mat-khau").value = sessionStorage.getItem("mat-khau-so-diem") || ""; } catch (e) {}
