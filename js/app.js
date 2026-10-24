/* =====================================================================
   GIAO DIỆN TRANG HỌC SINH
   ---------------------------------------------------------------------
   Trang có 4 "màn" (section) trong index.html, mỗi lúc chỉ hiện 1 màn:
     1. man-chon-de    : danh sách đề
     2. man-thong-tin  : nhập họ tên, lớp
     3. man-lam-bai    : làm bài + đồng hồ + phiếu trả lời
     4. man-ket-qua    : điểm + xem lại từng câu

   Dữ liệu dùng chung nằm trong biến "trangThai" bên dưới.
   ===================================================================== */

const CHU_CAI = ["A", "B", "C", "D"];
const KHOA_LUU_TAM = "phong-luyen-de:dang-lam"; // khóa localStorage để không mất bài khi lỡ tải lại trang

const trangThai = {
  de: null,          // đề đang làm
  hoTen: "",
  lop: "",
  baiLam: null,      // câu trả lời của học sinh
  batDau: 0,         // thời điểm bắt đầu (mili giây)
  hetGio: 0,         // thời điểm hết giờ (mili giây)
  boDem: null,       // setInterval của đồng hồ
  ketQua: null       // kết quả sau khi chấm
};

/* ---------------- Tiện ích nhỏ ---------------- */

const $ = (id) => document.getElementById(id);

// Chống chèn mã độc khi hiển thị chữ do học sinh gõ (tên, lớp)
function anToan(chuoi) {
  return String(chuoi).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 0.17 -> "0,17" cho đúng kiểu viết Việt Nam
function vietSo(so) {
  return String(so).replace(".", ",");
}

function dinhDangThoiGian(giay) {
  const g = Math.max(0, Math.floor(giay));
  const phut = Math.floor(g / 60);
  return String(phut).padStart(2, "0") + ":" + String(g % 60).padStart(2, "0");
}

// Hình minh họa của câu hỏi (trường "hinh" trong de.js, tính từ thư mục của đề), không có thì bỏ qua
function veHinh(de, cau) {
  if (!cau.hinh) return "";
  const src = new URL(cau.hinh, de.thuMuc).href;
  return `<img class="hinh-de" src="${anToan(src)}" alt="Hình minh họa" loading="lazy">`;
}

// Bảo MathJax vẽ lại công thức trong một vùng vừa thay đổi
function veCongThuc(phanTu) {
  if (!window.MathJax || !MathJax.startup) return;
  MathJax.startup.promise
    .then(() => MathJax.typesetPromise([phanTu]))
    .catch((loi) => console.warn("MathJax lỗi:", loi));
}

function hienMan(id) {
  ["man-chon-de", "man-thong-tin", "man-lam-bai", "man-ket-qua"].forEach((m) => {
    $(m).hidden = m !== id;
  });
  window.scrollTo(0, 0);
}

function luuTam() {
  try {
    localStorage.setItem(KHOA_LUU_TAM, JSON.stringify({
      maDe: trangThai.de.id, hoTen: trangThai.hoTen, lop: trangThai.lop,
      batDau: trangThai.batDau, hetGio: trangThai.hetGio, baiLam: trangThai.baiLam
    }));
  } catch (e) { /* trình duyệt chặn lưu trữ thì thôi, không ảnh hưởng làm bài */ }
}

function xoaLuuTam() {
  try { localStorage.removeItem(KHOA_LUU_TAM); } catch (e) {}
}

/* ================= MÀN 1: CHỌN ĐỀ ================= */

function veDanhSachDe() {
  $("ten-lop-hoc").textContent = CAU_HINH.TEN_LOP_HOC;

  // Gom đề theo môn: { "Toán": [de1, de2], "Vật lý": [...] }
  const theoMon = {};
  DANH_SACH_DE.forEach((de) => {
    (theoMon[de.mon] = theoMon[de.mon] || []).push(de);
  });

  $("danh-sach-mon").innerHTML = Object.entries(theoMon).map(([mon, cacDe]) => `
    <div class="nhom-mon">
      <h2>${mon}</h2>
      <div class="danh-sach-de">
        ${cacDe.map((de) => `
          <button type="button" class="the-de" data-ma-de="${de.id}">
            <h3>${de.ten}</h3>
            <p>${de.moTa || ""}</p>
            <div class="thong-so">
              <span>${de.thoiGian} phút</span>
              <span>${de.phan1.length + de.phan2.length + de.phan3.length} câu</span>
              <span>Thang ${vietSo(diemToiDa(de))} điểm</span>
            </div>
          </button>`).join("")}
      </div>
    </div>`).join("");
}

$("danh-sach-mon").addEventListener("click", (e) => {
  const the = e.target.closest(".the-de");
  if (!the) return;
  trangThai.de = DANH_SACH_DE.find((d) => d.id === the.dataset.maDe);
  moManThongTin();
});

/* ================= MÀN 2: THÔNG TIN ================= */

function moManThongTin() {
  const de = trangThai.de;
  $("tt-mon").textContent = de.mon;
  $("tt-ten-de").textContent = de.ten;
  $("tt-mo-ta").textContent =
    `${de.phan1.length} câu trắc nghiệm, ${de.phan2.length} câu đúng/sai, ` +
    `${de.phan3.length} câu trả lời ngắn. Thời gian ${de.thoiGian} phút, hết giờ bài tự nộp.`;
  $("loi-thong-tin").hidden = true;
  hienMan("man-thong-tin");
  $("o-ho-ten").focus();
}

$("nut-quay-lai").addEventListener("click", () => hienMan("man-chon-de"));

$("form-thong-tin").addEventListener("submit", (e) => {
  e.preventDefault();
  const hoTen = $("o-ho-ten").value.trim();
  if (!hoTen) { $("loi-thong-tin").hidden = false; return; }
  trangThai.hoTen = hoTen;
  trangThai.lop = $("o-lop").value.trim();
  batDauLamBai();
});

/* ================= MÀN 3: LÀM BÀI ================= */

function taoBaiLamTrong(de) {
  return {
    phan1: de.phan1.map(() => null),
    phan2: de.phan2.map((cau) => cau.y.map(() => null)),
    phan3: de.phan3.map(() => "")
  };
}

function batDauLamBai(duLieuCu) {
  const de = trangThai.de;
  if (duLieuCu) {
    // Khôi phục bài đang làm dở
    Object.assign(trangThai, {
      hoTen: duLieuCu.hoTen, lop: duLieuCu.lop, batDau: duLieuCu.batDau,
      hetGio: duLieuCu.hetGio, baiLam: duLieuCu.baiLam
    });
  } else {
    trangThai.baiLam = taoBaiLamTrong(de);
    trangThai.batDau = Date.now();
    trangThai.hetGio = trangThai.batDau + de.thoiGian * 60 * 1000;
  }
  luuTam();
  veToDe();
  vePhieu();
  hienMan("man-lam-bai");
  chayDongHo();
}

// Vẽ toàn bộ câu hỏi của đề
function veToDe() {
  const de = trangThai.de;
  const bl = trangThai.baiLam;

  const phan1 = de.phan1.map((cau, i) => `
    <article class="cau" id="cau-p1-${i}">
      <div class="cau-hoi"><b>Câu ${i + 1}.</b> ${cau.noiDung}${veHinh(de, cau)}</div>
      <div class="lua-chon">
        ${cau.luaChon.map((lc, j) => `
          <label>
            <input type="radio" name="p1-${i}" value="${CHU_CAI[j]}" ${bl.phan1[i] === CHU_CAI[j] ? "checked" : ""}>
            <span class="bong">${CHU_CAI[j]}</span>
            <span>${lc}</span>
          </label>`).join("")}
      </div>
    </article>`).join("");

  const phan2 = de.phan2.map((cau, i) => `
    <article class="cau" id="cau-p2-${i}">
      <div class="cau-hoi"><b>Câu ${i + 1}.</b> ${cau.noiDung}${veHinh(de, cau)}</div>
      <div class="y-dung-sai">
        ${cau.y.map((y, j) => `
          <div class="dong-y">
            <span class="chu-y">${"abcd"[j]})</span>
            <span class="noi-dung-y">${y.noiDung}</span>
            <span class="chon-ds">
              <label><input type="radio" name="p2-${i}-${j}" value="dung" ${bl.phan2[i][j] === true ? "checked" : ""}><span>Đ</span></label>
              <label><input type="radio" name="p2-${i}-${j}" value="sai" ${bl.phan2[i][j] === false ? "checked" : ""}><span>S</span></label>
            </span>
          </div>`).join("")}
      </div>
    </article>`).join("");

  const phan3 = de.phan3.map((cau, i) => `
    <article class="cau" id="cau-p3-${i}">
      <div class="cau-hoi"><b>Câu ${i + 1}.</b> ${cau.noiDung}${veHinh(de, cau)}</div>
      <div class="o-tra-loi">
        <input type="text" maxlength="4" data-p3="${i}" value="${anToan(bl.phan3[i])}"
               aria-label="Đáp án câu ${i + 1} phần III" autocomplete="off" spellcheck="false">
        <small>Tối đa 4 ký tự: chữ số, dấu phẩy, dấu trừ</small>
      </div>
    </article>`).join("");

  $("to-de").innerHTML = `
    <div class="tieu-de-phan">
      <span class="nhan">${anToan(trangThai.hoTen)}${trangThai.lop ? " · Lớp " + anToan(trangThai.lop) : ""}</span>
      <h2>${de.ten}</h2>
    </div>
    <div class="tieu-de-phan"><h2>Phần I</h2><p>Trắc nghiệm nhiều lựa chọn. Mỗi câu chọn một phương án.</p></div>
    ${phan1}
    <div class="tieu-de-phan"><h2>Phần II</h2><p>Trắc nghiệm đúng sai. Mỗi ý a), b), c), d) chọn Đúng hoặc Sai.</p></div>
    ${phan2}
    <div class="tieu-de-phan"><h2>Phần III</h2><p>Trả lời ngắn. Điền kết quả là một số, dùng dấu phẩy cho số thập phân.</p></div>
    ${phan3}`;

  veCongThuc($("to-de"));
}

// Ghi nhận câu trả lời mỗi khi học sinh chọn/gõ
$("to-de").addEventListener("change", (e) => {
  const o = e.target;
  if (o.type !== "radio") return;
  const [phan, i, j] = o.name.split("-");
  if (phan === "p1") trangThai.baiLam.phan1[+i] = o.value;
  if (phan === "p2") trangThai.baiLam.phan2[+i][+j] = o.value === "dung";
  luuTam();
  vePhieu();
});

$("to-de").addEventListener("input", (e) => {
  const o = e.target;
  if (o.dataset.p3 === undefined) return;
  o.value = o.value.replace(/[^0-9,.\-]/g, "").replace(".", ","); // chỉ giữ ký tự hợp lệ
  trangThai.baiLam.phan3[+o.dataset.p3] = o.value;
  luuTam();
  vePhieu();
});

// Trạng thái từng câu để tô màu ô trên phiếu: "trong" | "mot-phan" | "xong"
function trangThaiCau(phan, i) {
  const bl = trangThai.baiLam;
  if (phan === 1) return bl.phan1[i] ? "xong" : "trong";
  if (phan === 3) return bl.phan3[i].trim() ? "xong" : "trong";
  const soYDaChon = bl.phan2[i].filter((v) => v !== null).length;
  if (soYDaChon === 0) return "trong";
  return soYDaChon === bl.phan2[i].length ? "xong" : "mot-phan";
}

// Vẽ phiếu trả lời (lưới số câu) + thanh tiến độ
function vePhieu() {
  const de = trangThai.de;
  const nhom = [
    { phan: 1, ten: "Phần I", soCau: de.phan1.length },
    { phan: 2, ten: "Phần II", soCau: de.phan2.length },
    { phan: 3, ten: "Phần III", soCau: de.phan3.length }
  ];
  let daLam = 0, tong = 0;

  $("luoi-phieu").innerHTML = nhom.map((n) => `
    <div>
      <h3>${n.ten}</h3>
      <div class="o-so">
        ${Array.from({ length: n.soCau }, (_, i) => {
          const tt = trangThaiCau(n.phan, i);
          tong++;
          if (tt === "xong") daLam++;
          const lop = tt === "xong" ? "da-lam" : tt === "mot-phan" ? "lam-mot-phan" : "";
          return `<button type="button" class="${lop}" data-den="cau-p${n.phan}-${i}" aria-label="${n.ten} câu ${i + 1}">${i + 1}</button>`;
        }).join("")}
      </div>
    </div>`).join("");

  $("dem-cau").textContent = `Đã làm ${daLam}/${tong} câu`;
  $("tien-do").style.width = (daLam / tong) * 100 + "%";
}

// Bấm số câu trên phiếu -> cuộn tới câu đó
$("luoi-phieu").addEventListener("click", (e) => {
  const nut = e.target.closest("button[data-den]");
  if (!nut) return;
  $(nut.dataset.den).scrollIntoView({ behavior: "smooth", block: "start" });
  if (window.matchMedia("(max-width: 860px)").matches) dongMoPhieu(false);
});

function dongMoPhieu(mo) {
  $("luoi-phieu-wrap").dataset.mo = String(mo);
  $("nut-mo-phieu").setAttribute("aria-expanded", String(mo));
}
$("nut-mo-phieu").addEventListener("click", () =>
  dongMoPhieu($("luoi-phieu-wrap").dataset.mo !== "true"));

/* ---- Đồng hồ đếm ngược ---- */

function chayDongHo() {
  clearInterval(trangThai.boDem);
  const capNhat = () => {
    const conLai = (trangThai.hetGio - Date.now()) / 1000;
    $("so-dong-ho").textContent = dinhDangThoiGian(conLai);
    $("dong-ho").classList.toggle("sap-het", conLai <= 5 * 60); // còn 5 phút thì đỏ
    if (conLai <= 0) {
      clearInterval(trangThai.boDem);
      nopBai(true);
    }
  };
  capNhat();
  trangThai.boDem = setInterval(capNhat, 1000);
}

/* ---- Nộp bài ---- */

$("nut-nop").addEventListener("click", () => {
  const de = trangThai.de;
  const tong = de.phan1.length + de.phan2.length + de.phan3.length;
  let chuaXong = 0;
  [[1, de.phan1], [2, de.phan2], [3, de.phan3]].forEach(([p, ds]) =>
    ds.forEach((_, i) => { if (trangThaiCau(p, i) !== "xong") chuaXong++; }));
  $("xn-noi-dung").textContent = chuaXong
    ? `Bạn còn ${chuaXong}/${tong} câu chưa làm xong. Nộp rồi thì không sửa được nữa.`
    : "Bạn đã làm hết các câu. Nộp rồi thì không sửa được nữa.";
  $("hop-xac-nhan").hidden = false;
  $("xn-huy").focus();
});
$("xn-huy").addEventListener("click", () => { $("hop-xac-nhan").hidden = true; });
$("xn-dong-y").addEventListener("click", () => { $("hop-xac-nhan").hidden = true; nopBai(false); });

function nopBai(doHetGio) {
  clearInterval(trangThai.boDem);
  const de = trangThai.de;
  const ketQua = chamBai(de, trangThai.baiLam);
  const giayDaLam = Math.min(de.thoiGian * 60, Math.round((Date.now() - trangThai.batDau) / 1000));

  trangThai.ketQua = { ...ketQua, giayDaLam, doHetGio, nopLuc: new Date().toISOString() };
  xoaLuuTam();
  veKetQua();
  guiKetQuaLenMayChu();
}

/* ================= MÀN 4: KẾT QUẢ ================= */

function veKetQua() {
  const de = trangThai.de;
  const kq = trangThai.ketQua;
  $("kq-ten-de").textContent = de.ten;

  $("bang-diem").innerHTML = `
    <div class="bang-diem">
      <div class="diem-lon" aria-label="Tổng điểm">
        <span class="so">${vietSo(kq.tong)}</span>
        <span class="tren">/ ${vietSo(diemToiDa(de))} điểm</span>
      </div>
      <div class="cac-phan">
        <div><span class="nhan">Phần I</span><span class="gia-tri">${vietSo(kq.diem1)}</span>
          <span class="dem-cau">${kq.chiTiet.phan1.filter(Boolean).length}/${de.phan1.length} câu đúng</span></div>
        <div><span class="nhan">Phần II</span><span class="gia-tri">${vietSo(kq.diem2)}</span>
          <span class="dem-cau">${kq.chiTiet.phan2.reduce((a, b) => a + b, 0)}/${de.phan2.length * 4} ý đúng</span></div>
        <div><span class="nhan">Phần III</span><span class="gia-tri">${vietSo(kq.diem3)}</span>
          <span class="dem-cau">${kq.chiTiet.phan3.filter(Boolean).length}/${de.phan3.length} câu đúng</span></div>
      </div>
      <div class="thong-tin-bai">
        <span>${anToan(trangThai.hoTen)}${trangThai.lop ? " · " + anToan(trangThai.lop) : ""}</span>
        <span>Thời gian làm: ${dinhDangThoiGian(kq.giayDaLam)}${kq.doHetGio ? " (hết giờ, tự nộp)" : ""}</span>
        <span class="trang-thai-luu" id="trang-thai-luu"></span>
      </div>
    </div>`;

  $("xem-lai").innerHTML = veXemLai(de, trangThai.baiLam, kq.chiTiet);
  datBoLoc("tat-ca");
  hienMan("man-ket-qua");
  veCongThuc($("xem-lai"));
}

function huyHieu(loai, chu) {
  return `<span class="huy-hieu ${loai}">${chu}</span>`;
}

function veXemLai(de, bl, ct) {
  const loiGiai = (cau) => cau.loiGiai
    ? `<div class="loi-giai"><span class="nhan">Lời giải</span>${cau.loiGiai}</div>` : "";

  const p1 = de.phan1.map((cau, i) => {
    const dung = ct.phan1[i];
    const chon = bl.phan1[i];
    return `
      <article class="cau ${dung ? "ket-qua-dung" : "ket-qua-sai"}" data-dung="${dung}">
        <div class="dau-cau"><b>Phần I · Câu ${i + 1}</b>
          ${dung ? huyHieu("dung", "Đúng +" + vietSo(de.diemPhan1 ?? 0.25)) : huyHieu("sai", chon ? "Sai" : "Bỏ trống")}</div>
        <div class="cau-hoi">${cau.noiDung}${veHinh(de, cau)}</div>
        <div class="lua-chon xem">
          ${cau.luaChon.map((lc, j) => {
            const chu = CHU_CAI[j];
            const lop = chu === cau.dapAn ? "la-dap-an" : chu === chon ? "chon-sai" : "";
            return `<label class="${lop}"><span class="bong">${chu}</span><span>${lc}</span></label>`;
          }).join("")}
        </div>
        ${loiGiai(cau)}
      </article>`;
  }).join("");

  const p2 = de.phan2.map((cau, i) => {
    const soDung = ct.phan2[i];
    const diem = [0, 0.1, 0.25, 0.5, 1][soDung];
    const loai = soDung === 4 ? "dung" : soDung === 0 ? "sai" : "mot-phan";
    const lopCau = soDung === 4 ? "ket-qua-dung" : soDung === 0 ? "ket-qua-sai" : "ket-qua-mot-phan";
    return `
      <article class="cau ${lopCau}" data-dung="${soDung === 4}">
        <div class="dau-cau"><b>Phần II · Câu ${i + 1}</b>${huyHieu(loai, `${soDung}/4 ý · +${vietSo(diem)}`)}</div>
        <div class="cau-hoi">${cau.noiDung}${veHinh(de, cau)}</div>
        <div class="y-dung-sai">
          ${cau.y.map((y, j) => {
            const tl = bl.phan2[i][j];
            const ok = tl === y.dapAn;
            const chuTl = tl === null ? "bỏ trống" : tl ? "Đ" : "S";
            return `
              <div class="dong-y">
                <span class="chu-y">${"abcd"[j]})</span>
                <span class="noi-dung-y">${y.noiDung}</span>
                <span class="so-sanh">
                  <span>Bạn: <b class="${ok ? "mau-dung" : "mau-sai"}">${chuTl}</b></span>
                  <span>Đáp án: <b>${y.dapAn ? "Đ" : "S"}</b></span>
                </span>
              </div>`;
          }).join("")}
        </div>
        ${loiGiai(cau)}
      </article>`;
  }).join("");

  const p3 = de.phan3.map((cau, i) => {
    const dung = ct.phan3[i];
    const tl = bl.phan3[i].trim();
    return `
      <article class="cau ${dung ? "ket-qua-dung" : "ket-qua-sai"}" data-dung="${dung}">
        <div class="dau-cau"><b>Phần III · Câu ${i + 1}</b>
          ${dung ? huyHieu("dung", "Đúng +" + vietSo(de.diemPhan3 ?? 0.5)) : huyHieu("sai", tl ? "Sai" : "Bỏ trống")}</div>
        <div class="cau-hoi">${cau.noiDung}${veHinh(de, cau)}</div>
        <div class="so-sanh">
          <span>Bạn trả lời: <b class="${dung ? "mau-dung" : "mau-sai"}">${tl ? anToan(tl) : "(bỏ trống)"}</b></span>
          <span>Đáp án: <b>${vietSo(cau.dapAn)}</b></span>
        </div>
        ${loiGiai(cau)}
      </article>`;
  }).join("");

  return `
    <div class="tieu-de-phan"><h2>Xem lại bài làm</h2><p>Viền xanh là đúng, đỏ là sai, vàng là đúng một phần.</p></div>
    ${p1}${p2}${p3}`;
}

// Lọc "Tất cả" / "Chỉ câu sai"
function datBoLoc(loai) {
  document.querySelectorAll(".loc-ket-qua button").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.loc === loai)));
  document.querySelectorAll("#xem-lai .cau").forEach((c) => {
    c.hidden = loai === "sai" && c.dataset.dung === "true";
  });
}
document.querySelector(".loc-ket-qua").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-loc]");
  if (b) datBoLoc(b.dataset.loc);
});

$("nut-lam-lai").addEventListener("click", () => batDauLamBai());
$("nut-ve-trang-chu").addEventListener("click", () => hienMan("man-chon-de"));

/* ---- Gửi kết quả lên Google Sheet ---- */

async function guiKetQuaLenMayChu() {
  const o = $("trang-thai-luu");
  if (!CAU_HINH.LINK_APPS_SCRIPT) {
    o.textContent = "Chế độ chạy thử: kết quả không được lưu";
    return;
  }
  const de = trangThai.de;
  const kq = trangThai.ketQua;
  const goiTin = {
    nopLuc: kq.nopLuc,
    hoTen: trangThai.hoTen,
    lop: trangThai.lop,
    maDe: de.id,
    tenDe: de.ten,
    mon: de.mon,
    diem: kq.tong,
    diem1: kq.diem1,
    diem2: kq.diem2,
    diem3: kq.diem3,
    diemToiDa: diemToiDa(de),
    giayDaLam: kq.giayDaLam,
    chiTiet: kq.chiTiet,
    baiLam: trangThai.baiLam
  };

  o.className = "trang-thai-luu";
  o.textContent = "Đang gửi kết quả cho thầy/cô…";
  try {
    // Gửi dạng text/plain để trình duyệt không chặn (tránh lỗi CORS với Apps Script)
    const phanHoi = await fetch(CAU_HINH.LINK_APPS_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(goiTin)
    });
    const duLieu = await phanHoi.json();
    if (!duLieu.ok) throw new Error(duLieu.loi || "Máy chủ báo lỗi");
    o.classList.add("ok");
    o.textContent = "Đã gửi kết quả cho thầy/cô";
  } catch (loi) {
    console.error(loi);
    o.classList.add("loi");
    o.innerHTML = 'Chưa gửi được kết quả. <button type="button" class="nut" id="nut-gui-lai">Gửi lại</button>';
    $("nut-gui-lai").addEventListener("click", guiKetQuaLenMayChu);
  }
}

/* ================= KHỞI ĐỘNG ================= */

// Nếu học sinh lỡ tải lại trang khi đang làm bài -> mở lại đúng bài đó
function khoiPhucBaiDangLam() {
  let duLieu = null;
  try { duLieu = JSON.parse(localStorage.getItem(KHOA_LUU_TAM)); } catch (e) {}
  if (!duLieu) return;
  const de = DANH_SACH_DE.find((d) => d.id === duLieu.maDe);
  if (!de) { xoaLuuTam(); return; }
  trangThai.de = de;
  batDauLamBai(duLieu); // nếu đã quá giờ, đồng hồ sẽ tự nộp ngay
}

// Chờ js/tai-de.js nạp xong các file đề rồi mới vẽ
DE_DA_TAI.then(() => {
  veDanhSachDe();
  khoiPhucBaiDangLam();
});
