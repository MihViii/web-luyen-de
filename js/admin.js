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
    o("Điểm TB", diem.length ? vietDiem(tb) : "–"),
    o("Cao nhất", diem.length ? vietDiem(Math.max(...diem)) : "–"),
    o("Thấp nhất", diem.length ? vietDiem(Math.min(...diem)) : "–")
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
      <td class="so"><b>${vietDiem(r.diem)}</b></td>
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
  $("man-bang-diem").hidden = id !== "man-bang-diem";
  $("man-xem-bai").hidden = id !== "man-xem-bai";
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
  const lechDiem = Math.abs(kq.tong - Number(r.diem)) > 1e-9;

  const thongTin = `
    <span>Nộp lúc ${anToan(ngayGio(r.nopLuc))}</span>
    <span>Thời gian làm ${phutGiay(r.giayDaLam)}</span>
    ${lechDiem ? `<span class="mau-sai">Điểm trên chấm lại theo đáp án hiện tại trong de.js. Lúc nộp,
      học sinh được ${vietDiem(r.diem)} điểm (có thể đáp án đã được sửa sau đó).</span>` : ""}`;

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

/* ---------- Kho đề: đề xếp theo thư mục + link riêng (không cần mật khẩu, danh sách đề vốn công khai) ---------- */
// Thư mục lưu trong de-thi/kho-de.js; đọc/ghi bằng các hàm trong js/kho-de.js.

// Mỗi thư mục: { ten, de: [id đề đang hiện], an: [id đề đã bị ẩn khỏi danh-sach.js, giữ lại khi lưu] }.
// Phần tử cuối luôn là "Chưa xếp thư mục" (ten: null).
let khoDangXem = [];
let khoTam = null;              // bản đang sửa trong chế độ "Sắp xếp thư mục", null = đang xem
const thuMucDangMo = new Set(); // nhớ thư mục nào đang mở khi vẽ lại

const boDau = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
const tenHien = (t) => (t.ten === null ? "Chưa xếp thư mục" : t.ten.trim() || "(chưa đặt tên)");

function dungKho(kho) {
  const coDe = new Set(DANH_SACH_DE.map((d) => d.id));
  const daXep = new Set();
  const ds = kho.map((t) => {
    const tm = { ten: String(t.ten ?? ""), de: [], an: [] };
    (Array.isArray(t.de) ? t.de : []).forEach((id) => {
      if (daXep.has(id)) return; // một đề nằm ở 2 thư mục (sửa tay) thì lấy thư mục đầu
      daXep.add(id);
      (coDe.has(id) ? tm.de : tm.an).push(id);
    });
    return tm;
  });
  ds.push({ ten: null, de: DANH_SACH_DE.map((d) => d.id).filter((id) => !daXep.has(id)), an: [] });
  return ds;
}

function veKho() {
  const sua = khoTam !== null;
  const ds = sua ? khoTam : khoDangXem;
  const theoId = new Map(DANH_SACH_DE.map((d) => [d.id, d]));
  const tim = sua ? "" : boDau($("tim-de").value.trim());
  const cuoi = ds.length - 1; // vị trí "Chưa xếp thư mục"

  const html = ds.map((t, k) => {
    if (t.ten === null && !t.de.length) return ""; // không có đề nào chưa xếp thì ẩn mục này
    const khopThuMuc = tim && t.ten !== null && boDau(t.ten).includes(tim);
    const cacI = t.de.map((_, i) => i).filter((i) => !tim || khopThuMuc || boDau(theoId.get(t.de[i]).ten).includes(tim));
    if (tim && !cacI.length) return "";

    if (!sua) {
      const mo = tim || thuMucDangMo.has(tenHien(t)) || ds.length === 1;
      return `
        <details class="thu-muc" data-ten="${anToan(tenHien(t))}" ${mo ? "open" : ""}>
          <summary><span class="ten-thu-muc">${anToan(tenHien(t))}</span><span class="dem-cau">${t.de.length} đề</span></summary>
          <div class="ds-de">${cacI.map((i) => {
            const de = theoId.get(t.de[i]);
            return `
              <div class="dong-link">
                <span class="ten-de">${anToan(de.ten)}</span>
                <input readonly value="${anToan(linkDe(de.id))}" aria-label="Link đề ${anToan(de.ten)}">
                <button type="button" class="nut nut-nho" data-chep>Sao chép</button>
              </div>`;
          }).join("") || `<p class="dem-cau">Thư mục trống</p>`}</div>
        </details>`;
    }

    // Chế độ sắp xếp: đổi tên / di chuyển / xóa thư mục, chuyển đề sang thư mục khác, đổi thứ tự đề
    const chonThuMuc = (kHienTai) => ds.map((x, kk) =>
      `<option value="${kk}" ${kk === kHienTai ? "selected" : ""}>${anToan(tenHien(x))}</option>`).join("");
    const nut = (lam, chu, nhan, tat, i = "") =>
      `<button type="button" class="nut nut-nho" data-lam="${lam}" data-tm="${k}" data-i="${i}" aria-label="${nhan}" ${tat ? "disabled" : ""}>${chu}</button>`;
    return `
      <div class="thu-muc dang-sua">
        <div class="dau-thu-muc">
          ${t.ten === null ? `<span class="ten-thu-muc">Chưa xếp thư mục</span>` : `
            <input class="o-ten-thu-muc" data-doi-ten="${k}" value="${anToan(t.ten)}" placeholder="Tên thư mục" aria-label="Tên thư mục">
            ${nut("tm-len", "↑", "Đưa thư mục lên", k === 0)}
            ${nut("tm-xuong", "↓", "Đưa thư mục xuống", k >= cuoi - 1)}
            ${nut("tm-xoa", "Xóa thư mục", "Xóa thư mục (đề bên trong chuyển sang Chưa xếp)", false)}`}
        </div>
        <div class="ds-de">${t.de.map((id, i) => `
          <div class="dong-sua">
            <span class="ten-de">${anToan(theoId.get(id).ten)}</span>
            ${nut("de-len", "↑", "Đưa đề lên", i === 0, i)}
            ${nut("de-xuong", "↓", "Đưa đề xuống", i === t.de.length - 1, i)}
            <select data-chuyen data-tm="${k}" data-i="${i}" aria-label="Chuyển đề ${anToan(theoId.get(id).ten)} sang thư mục">${chonThuMuc(k)}</select>
          </div>`).join("") || `<p class="dem-cau">Thư mục trống</p>`}</div>
      </div>`;
  }).join("");

  $("ds-thu-muc").innerHTML = html || (tim
    ? `<p class="dem-cau">Không có đề hay thư mục nào khớp “${anToan($("tim-de").value.trim())}”.</p>`
    : `<p class="dem-cau">Chưa có đề nào trong de-thi/danh-sach.js.</p>`);
}

DE_DA_TAI.then(() => {
  khoDangXem = dungKho(layKhoDe());
  veKho();
});
$("tim-de").addEventListener("input", veKho);

// Nhớ thư mục mở/đóng (sự kiện toggle không nổi bọt nên bắt ở pha capture). Đang tìm thì không nhớ.
$("ds-thu-muc").addEventListener("toggle", (e) => {
  if (!e.target.matches("details.thu-muc") || $("tim-de").value.trim()) return;
  if (e.target.open) thuMucDangMo.add(e.target.dataset.ten);
  else thuMucDangMo.delete(e.target.dataset.ten);
}, true);

$("ds-thu-muc").addEventListener("focusin", (e) => { if (e.target.matches("input[readonly]")) e.target.select(); });
$("ds-thu-muc").addEventListener("click", async (e) => {
  const nutSua = e.target.closest("button[data-lam]");
  if (nutSua) { suaKho(nutSua.dataset.lam, +nutSua.dataset.tm, +nutSua.dataset.i); return; }

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

function suaKho(lam, k, i) {
  const doiCho = (mang, a, b) => { [mang[a], mang[b]] = [mang[b], mang[a]]; };
  const chuaXep = khoTam[khoTam.length - 1];
  if (lam === "de-len") doiCho(khoTam[k].de, i, i - 1);
  if (lam === "de-xuong") doiCho(khoTam[k].de, i, i + 1);
  if (lam === "tm-len") doiCho(khoTam, k, k - 1);
  if (lam === "tm-xuong") doiCho(khoTam, k, k + 1);
  if (lam === "tm-xoa") chuaXep.de.push(...khoTam.splice(k, 1)[0].de);
  veKho();
}

// Chuyển đề sang thư mục khác (thêm vào cuối thư mục đó)
$("ds-thu-muc").addEventListener("change", (e) => {
  const o = e.target;
  if (!o.matches("select[data-chuyen]")) return;
  const [id] = khoTam[+o.dataset.tm].de.splice(+o.dataset.i, 1);
  khoTam[+o.value].de.push(id);
  veKho();
});

// Đổi tên thư mục: sửa thẳng, chỉ cập nhật chữ trong các ô chọn thư mục để không mất con trỏ đang gõ
$("ds-thu-muc").addEventListener("input", (e) => {
  const o = e.target;
  if (o.dataset.doiTen === undefined) return;
  khoTam[+o.dataset.doiTen].ten = o.value;
  document.querySelectorAll(`select[data-chuyen] option[value="${o.dataset.doiTen}"]`)
    .forEach((op) => { op.textContent = tenHien(khoTam[+o.dataset.doiTen]); });
});

function batCheDoSua(bat) {
  khoTam = bat ? structuredClone(khoDangXem) : null;
  if (bat) $("tim-de").value = "";
  $("tim-de").disabled = bat;
  $("nut-sap-xep").hidden = bat;
  $("thanh-luu-kho").hidden = !bat;
  $("goi-y-kho").innerHTML = bat
    ? "Đổi tên, xóa, đưa thư mục lên xuống; chọn thư mục ở ô bên phải mỗi đề để chuyển đề. Xong bấm <b>Lưu vào thư mục project</b> rồi push lên GitHub."
    : "Bấm vào thư mục để mở, rồi bấm <b>Sao chép</b> để lấy link riêng của đề gửi cho học sinh.";
  veKho();
}

$("nut-sap-xep").addEventListener("click", () => { $("tt-luu-kho").textContent = ""; batCheDoSua(true); });
$("nut-huy-sap-xep").addEventListener("click", () => batCheDoSua(false));
$("nut-them-thu-muc").addEventListener("click", () => {
  khoTam.splice(khoTam.length - 1, 0, { ten: "", de: [], an: [] }); // thêm ngay trên "Chưa xếp thư mục"
  veKho();
  const cacO = document.querySelectorAll(".o-ten-thu-muc");
  cacO[cacO.length - 1].focus();
});

$("nut-luu-kho").addEventListener("click", async () => {
  const tt = $("tt-luu-kho");
  const thuMuc = khoTam.filter((t) => t.ten !== null);
  const ten = thuMuc.map((t) => t.ten.trim());
  if (ten.some((x) => !x)) { tt.textContent = "Có thư mục chưa đặt tên."; return; }
  if (new Set(ten.map((x) => x.toLowerCase())).size !== ten.length) { tt.textContent = "Có hai thư mục trùng tên."; return; }
  const kho = thuMuc.map((t) => ({ ten: t.ten.trim(), de: [...t.de, ...t.an] }));

  // Safari/Firefox không ghi thẳng vào thư mục được: tải file về để tự chép vào
  if (!window.showDirectoryPicker) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([vietKhoDe(kho)], { type: "text/javascript" }));
    a.download = "kho-de.js";
    a.click();
    khoDangXem = dungKho(kho);
    batCheDoSua(false);
    tt.textContent = "Trình duyệt này không ghi thẳng vào thư mục được, nên đã tải về file kho-de.js. Chép đè vào thư mục de-thi/ của project rồi push lên GitHub.";
    return;
  }

  let goc;
  try {
    goc = await showDirectoryPicker({ id: "web-luyen-de", mode: "readwrite" });
  } catch (loi) {
    if (loi.name !== "AbortError") tt.textContent = "Không mở được thư mục: " + loi.message;
    return;
  }
  try {
    const daBiet = new Set([...DANH_SACH_DE.map((d) => d.id), ...kho.flatMap((t) => t.de)]);
    await ghiKhoDe(goc, (khoTrenMay) => {
      // Giữ các đề có trong file trên máy mà trang này chưa biết (vd đề vừa tạo trên máy, chưa push)
      khoTrenMay.forEach((t) => (t.de || []).forEach((id) => {
        if (daBiet.has(id)) return;
        daBiet.add(id);
        themDeVaoKho(kho, String(t.ten), id);
      }));
      return kho;
    });
    khoDangXem = dungKho(kho);
    batCheDoSua(false);
    tt.textContent = "Đã lưu vào de-thi/kho-de.js. Push lên GitHub để trang admin trên mạng cũng thấy cách xếp mới.";
  } catch (loi) {
    tt.textContent = "Chưa lưu được: " + loi.message;
  }
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
