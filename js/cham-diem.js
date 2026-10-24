/* =====================================================================
   CHẤM ĐIỂM
   ---------------------------------------------------------------------
   File này chỉ chứa các hàm "thuần" (pure function): nhận vào đề + bài
   làm, trả ra kết quả. Không đụng gì tới giao diện, nên dễ kiểm tra.

   Bài làm (baiLam) có dạng:
     {
       phan1: ["A", null, "C", ...],          // null = chưa chọn
       phan2: [[true, false, null, true], ...], // mỗi câu 4 ý
       phan3: ["4", "", "0,17", ...]           // chuỗi học sinh gõ
     }
   ===================================================================== */

// Điểm phần II theo số ý trả lời đúng trong một câu (0, 1, 2, 3, 4 ý)
const DIEM_PHAN2_THEO_SO_Y_DUNG = [0, 0.1, 0.25, 0.5, 1];

/**
 * Đổi chuỗi học sinh gõ ở phần III thành số.
 * Chấp nhận cả dấu phẩy kiểu Việt Nam: "0,17" -> 0.17
 * Trả về null nếu bỏ trống hoặc không phải số.
 */
function chuyenThanhSo(chuoi) {
  if (chuoi === null || chuoi === undefined) return null;
  const s = String(chuoi).trim().replace(",", ".");
  if (s === "" || s === "-" || s === ".") return null;
  const so = Number(s);
  return Number.isFinite(so) ? so : null;
}

/** So sánh hai số thực, bỏ qua sai số làm tròn của máy tính (0.1 + 0.2 != 0.3) */
function bangNhau(a, b) {
  return Math.abs(a - b) < 1e-9;
}

/** Làm tròn điểm tới 2 chữ số thập phân để tránh 7.300000000001 */
function lamTron(x) {
  return Math.round(x * 100) / 100;
}

/**
 * Chấm toàn bộ một bài làm.
 * Trả về điểm từng phần, tổng điểm, và chi tiết đúng/sai từng câu.
 */
function chamBai(de, baiLam) {
  const diemCau1 = de.diemPhan1 ?? 0.25;
  const diemCau3 = de.diemPhan3 ?? 0.5;

  // ---- Phần I: trắc nghiệm, đúng thì cộng điểm ----
  const chiTiet1 = de.phan1.map((cau, i) => baiLam.phan1[i] === cau.dapAn);
  const diem1 = chiTiet1.filter(Boolean).length * diemCau1;

  // ---- Phần II: đếm số ý đúng trong mỗi câu rồi tra bảng điểm ----
  const chiTiet2 = de.phan2.map((cau, i) => {
    const traLoi = baiLam.phan2[i] || [];
    return cau.y.filter((y, j) => traLoi[j] === y.dapAn).length; // số ý đúng
  });
  const diem2 = chiTiet2.reduce((tong, soYDung) => tong + DIEM_PHAN2_THEO_SO_Y_DUNG[soYDung], 0);

  // ---- Phần III: trả lời ngắn, so sánh giá trị số ----
  const chiTiet3 = de.phan3.map((cau, i) => {
    const so = chuyenThanhSo(baiLam.phan3[i]);
    return so !== null && bangNhau(so, cau.dapAn);
  });
  const diem3 = chiTiet3.filter(Boolean).length * diemCau3;

  return {
    diem1: lamTron(diem1),
    diem2: lamTron(diem2),
    diem3: lamTron(diem3),
    tong: lamTron(diem1 + diem2 + diem3),
    // chi tiết: phần I, III là true/false; phần II là số ý đúng (0..4)
    chiTiet: { phan1: chiTiet1, phan2: chiTiet2, phan3: chiTiet3 }
  };
}

/** Điểm tối đa của một đề (Toán chuẩn = 10) */
function diemToiDa(de) {
  return lamTron(
    de.phan1.length * (de.diemPhan1 ?? 0.25) +
    de.phan2.length * 1 +
    de.phan3.length * (de.diemPhan3 ?? 0.5)
  );
}

// Cho phép chạy thử bằng Node.js (node test.js); trên trình duyệt dòng này bị bỏ qua
if (typeof module !== "undefined") {
  module.exports = { chamBai, diemToiDa, chuyenThanhSo };
}
