/* =====================================================================
   GOOGLE APPS SCRIPT - "MÁY CHỦ" LƯU KẾT QUẢ VÀO GOOGLE SHEET
   ---------------------------------------------------------------------
   Cách dùng (chi tiết trong README, bước 2):
     1. Tạo một Google Sheet mới.
     2. Vào Tiện ích mở rộng (Extensions) > Apps Script.
     3. Xóa code mẫu, dán toàn bộ file này vào, ĐỔI MẬT KHẨU bên dưới.
     4. Triển khai (Deploy) > Tùy chọn triển khai mới > Ứng dụng web,
        "Ai có quyền truy cập": Bất kỳ ai (Anyone).
     5. Copy link Web App, dán vào js/config.js.

   - doPost: trang học sinh gửi kết quả lên  -> thêm 1 dòng vào Sheet
   - doGet : trang thống kê xin dữ liệu      -> trả về toàn bộ kết quả
             (bắt buộc đúng mật khẩu)
   ===================================================================== */

const MAT_KHAU = "doi-mat-khau-nay"; // <-- ĐỔI THÀNH MẬT KHẨU CỦA BẠN
const TEN_TRANG_TINH = "KetQua";

const COT = [
  "Nộp lúc", "Họ tên", "Lớp", "Mã đề", "Tên đề", "Môn",
  "Điểm", "Phần I", "Phần II", "Phần III", "Điểm tối đa",
  "Thời gian làm (giây)", "Chi tiết", "Bài làm"
];

// Lấy trang tính "KetQua", chưa có thì tạo mới kèm dòng tiêu đề
function layTrangTinh() {
  const bang = SpreadsheetApp.getActiveSpreadsheet();
  let trang = bang.getSheetByName(TEN_TRANG_TINH);
  if (!trang) {
    trang = bang.insertSheet(TEN_TRANG_TINH);
    trang.appendRow(COT);
    trang.setFrozenRows(1);
    trang.getRange(1, 1, 1, COT.length).setFontWeight("bold");
  }
  return trang;
}

function traVeJson(duLieu) {
  return ContentService.createTextOutput(JSON.stringify(duLieu))
    .setMimeType(ContentService.MimeType.JSON);
}

// Cắt chuỗi để học sinh nghịch không gửi dữ liệu quá dài
function cat(chuoi, toiDa) {
  return String(chuoi == null ? "" : chuoi).slice(0, toiDa);
}

/* ---------- Nhận bài nộp ---------- */
function doPost(e) {
  // Khóa để 2 học sinh nộp cùng lúc không ghi đè lên nhau
  const khoa = LockService.getScriptLock();
  try {
    khoa.waitLock(10000);
    const d = JSON.parse(e.postData.contents);
    const so = (x) => (typeof x === "number" && isFinite(x) ? x : 0);

    layTrangTinh().appendRow([
      new Date(),
      cat(d.hoTen, 80),
      cat(d.lop, 20),
      cat(d.maDe, 60),
      cat(d.tenDe, 120),
      cat(d.mon, 40),
      so(d.diem), so(d.diem1), so(d.diem2), so(d.diem3), so(d.diemToiDa),
      so(d.giayDaLam),
      cat(JSON.stringify(d.chiTiet), 5000),
      cat(JSON.stringify(d.baiLam), 20000)
    ]);
    return traVeJson({ ok: true });
  } catch (loi) {
    return traVeJson({ ok: false, loi: String(loi) });
  } finally {
    khoa.releaseLock();
  }
}

/* ---------- Trả dữ liệu cho trang thống kê ---------- */
function doGet(e) {
  if (!e.parameter || e.parameter.key !== MAT_KHAU) {
    return traVeJson({ ok: false, loi: "Sai mật khẩu" });
  }
  const giaTri = layTrangTinh().getDataRange().getValues();
  const dong = giaTri.slice(1).map((r) => ({
    nopLuc: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
    hoTen: r[1], lop: r[2], maDe: r[3], tenDe: r[4], mon: r[5],
    diem: r[6], diem1: r[7], diem2: r[8], diem3: r[9], diemToiDa: r[10],
    giayDaLam: r[11],
    chiTiet: docJson(r[12])
  }));
  return traVeJson({ ok: true, ketQua: dong });
}

function docJson(chuoi) {
  try { return JSON.parse(chuoi); } catch (loi) { return null; }
}
