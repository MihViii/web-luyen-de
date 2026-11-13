/* =====================================================================
   XEM LẠI BÀI LÀM (dùng chung cho trang học sinh và trang thống kê)
   ---------------------------------------------------------------------
   - index.html: học sinh xem lại ngay sau khi nộp bài.
   - admin.html: gia sư mở bài của từng học sinh để xem sai chỗ nào.
   Cần nạp sau js/cham-diem.js (dùng diemToiDa).
   ===================================================================== */

const CHU_CAI = ["A", "B", "C", "D"];

// Chống chèn mã độc khi hiển thị chữ do học sinh gõ (tên, lớp, đáp án phần III)
function anToan(chuoi) {
  return String(chuoi ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 0.17 -> "0,17" cho đúng kiểu viết Việt Nam
function vietSo(so) {
  return String(so).replace(".", ",");
}

// Hình minh họa của câu hỏi (trường "hinh" trong de.js, tính từ thư mục của đề), không có thì bỏ qua
function veHinh(de, cau) {
  if (!cau.hinh) return "";
  const src = new URL(cau.hinh, de.thuMuc).href;
  return `<img class="hinh-de" src="${anToan(src)}" alt="Hình minh họa" loading="lazy">`;
}

// Ảnh câu hỏi hiện bằng nửa số pixel thật (ảnh rộng 1200px hiện rộng 600px), để nét trên màn hình retina.
// Sự kiện load của ảnh không nổi bọt, nên bắt ở pha capture.
document.addEventListener("load", (e) => {
  if (e.target.classList && e.target.classList.contains("hinh-de")) {
    e.target.style.width = e.target.naturalWidth / 2 + "px";
  }
}, true);

// Phương án A-D của câu phần I. Đề cắt từ PDF không có (chữ nằm trong ảnh) -> 4 ô trống
function phuongAn(cau) {
  return cau.luaChon || CHU_CAI.map(() => "");
}

// Bảo MathJax vẽ lại công thức trong một vùng vừa thay đổi
function veCongThuc(phanTu) {
  if (!window.MathJax || !MathJax.startup) return;
  MathJax.startup.promise
    .then(() => MathJax.typesetPromise([phanTu]))
    .catch((loi) => console.warn("MathJax lỗi:", loi));
}

function huyHieu(loai, chu) {
  return `<span class="huy-hieu ${loai}">${chu}</span>`;
}

// Ô điểm lớn + điểm từng phần. "thongTin" là HTML các dòng phụ bên dưới (tên, thời gian...)
function veBangDiem(de, kq, thongTin) {
  const ct = kq.chiTiet;
  return `
    <div class="bang-diem">
      <div class="diem-lon" aria-label="Tổng điểm">
        <span class="so">${vietSo(kq.tong)}</span>
        <span class="tren">/ ${vietSo(diemToiDa(de))} điểm</span>
      </div>
      <div class="cac-phan">
        <div><span class="nhan">Phần I</span><span class="gia-tri">${vietSo(kq.diem1)}</span>
          <span class="dem-cau">${ct.phan1.filter(Boolean).length}/${de.phan1.length} câu đúng</span></div>
        <div><span class="nhan">Phần II</span><span class="gia-tri">${vietSo(kq.diem2)}</span>
          <span class="dem-cau">${ct.phan2.reduce((a, b) => a + b, 0)}/${de.phan2.length * 4} ý đúng</span></div>
        <div><span class="nhan">Phần III</span><span class="gia-tri">${vietSo(kq.diem3)}</span>
          <span class="dem-cau">${ct.phan3.filter(Boolean).length}/${de.phan3.length} câu đúng</span></div>
      </div>
      <div class="thong-tin-bai">${thongTin}</div>
    </div>`;
}

/**
 * Vẽ từng câu: phương án đã chọn, đáp án, điểm, lời giải.
 * nguoiLam: chữ đứng trước câu trả lời ("Bạn" ở trang học sinh, "Học sinh" ở trang thống kê).
 * anDapAn : true = không lộ đáp án (trang học sinh khi CAU_HINH.HIEN_DAP_AN_CHO_HOC_SINH là false):
 *           chỉ báo câu đúng/sai và tô lựa chọn của học sinh, không hiện đáp án, lời giải;
 *           Phần II chỉ báo số ý đúng, không chỉ ý nào sai (vì mỗi ý chỉ có Đ/S, chỉ ra là lộ đáp án).
 * Mỗi câu có id "xem-p<phần>-<số thứ tự>" và data-dung="true" nếu làm đúng hoàn toàn.
 */
function veXemLai(de, bl, ct, nguoiLam = "Bạn", anDapAn = false) {
  const loiGiai = (cau) => cau.loiGiai && !anDapAn
    ? `<div class="loi-giai"><span class="nhan">Lời giải</span>${cau.loiGiai}</div>` : "";

  const p1 = de.phan1.map((cau, i) => {
    const dung = ct.phan1[i];
    const chon = bl.phan1[i];
    return `
      <article class="cau ${dung ? "ket-qua-dung" : "ket-qua-sai"}" id="xem-p1-${i}" data-dung="${dung}">
        <div class="dau-cau"><b>Phần I · Câu ${i + 1}</b>
          ${dung ? huyHieu("dung", "Đúng +" + vietSo(de.diemPhan1 ?? 0.25)) : huyHieu("sai", chon ? "Sai" : "Bỏ trống")}</div>
        <div class="cau-hoi">${cau.noiDung || ""}${veHinh(de, cau)}</div>
        <div class="lua-chon xem${cau.luaChon ? "" : " chi-chu"}">
          ${phuongAn(cau).map((lc, j) => {
            const chu = CHU_CAI[j];
            const lop = anDapAn
              ? (chu === chon ? (dung ? "la-dap-an" : "chon-sai") : "")   // chỉ tô lựa chọn của học sinh
              : (chu === cau.dapAn ? "la-dap-an" : chu === chon ? "chon-sai" : "");
            return `<label class="${lop}"><span class="bong">${chu}</span>${lc ? `<span>${lc}</span>` : ""}</label>`;
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
      <article class="cau ${lopCau}" id="xem-p2-${i}" data-dung="${soDung === 4}">
        <div class="dau-cau"><b>Phần II · Câu ${i + 1}</b>${huyHieu(loai, `${anDapAn ? "đúng " : ""}${soDung}/4 ý · +${vietSo(diem)}`)}</div>
        <div class="cau-hoi">${cau.noiDung || ""}${veHinh(de, cau)}</div>
        <div class="y-dung-sai">
          ${cau.y.map((y, j) => {
            const tl = bl.phan2[i][j];
            const ok = tl === y.dapAn;
            const chuTl = tl === null ? "bỏ trống" : tl ? "Đ" : "S";
            return `
              <div class="dong-y">
                <span class="chu-y">${"abcd"[j]})</span>
                <span class="noi-dung-y">${y.noiDung || ""}</span>
                <span class="so-sanh">
                  <span>${nguoiLam}: <b class="${anDapAn ? "" : ok ? "mau-dung" : "mau-sai"}">${chuTl}</b></span>
                  ${anDapAn ? "" : `<span>Đáp án: <b>${y.dapAn ? "Đ" : "S"}</b></span>`}
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
      <article class="cau ${dung ? "ket-qua-dung" : "ket-qua-sai"}" id="xem-p3-${i}" data-dung="${dung}">
        <div class="dau-cau"><b>Phần III · Câu ${i + 1}</b>
          ${dung ? huyHieu("dung", "Đúng +" + vietSo(de.diemPhan3 ?? 0.5)) : huyHieu("sai", tl ? "Sai" : "Bỏ trống")}</div>
        <div class="cau-hoi">${cau.noiDung || ""}${veHinh(de, cau)}</div>
        <div class="so-sanh">
          <span>${nguoiLam} trả lời: <b class="${dung ? "mau-dung" : "mau-sai"}">${tl ? anToan(tl) : "(bỏ trống)"}</b></span>
          ${anDapAn ? "" : `<span>Đáp án: <b>${vietSo(cau.dapAn)}</b></span>`}
        </div>
        ${loiGiai(cau)}
      </article>`;
  }).join("");

  return `
    <div class="tieu-de-phan"><h2>Xem lại bài làm</h2><p>Viền xanh là đúng, đỏ là sai, vàng là đúng một phần.${anDapAn
      ? " Phần II chỉ cho biết số ý đúng của mỗi câu." : ""}</p></div>
    ${p1}${p2}${p3}`;
}
