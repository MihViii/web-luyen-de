/* =====================================================================
   KHO ĐỀ: xếp đề vào thư mục để gia sư tìm đề và lấy link nhanh
   ---------------------------------------------------------------------
   Dữ liệu nằm trong de-thi/kho-de.js (biến KHO_DE):
     [{ ten: "Chương 1", de: ["id-de-1", "id-de-2"] }, ...]
   Dùng ở trang admin (xem, sắp xếp) và trang tạo đề (chọn thư mục cho đề mới).
   Ghi file bằng File System Access API, giống trang tạo đề.
   ===================================================================== */

function layKhoDe() {
  return typeof KHO_DE !== "undefined" && Array.isArray(KHO_DE) ? KHO_DE : [];
}

// Đọc nội dung file de-thi/kho-de.js trên máy. File hỏng thì báo lỗi chứ không coi như trống,
// để không ghi đè mất cách xếp thư mục cũ.
function docKhoDe(vanBan) {
  if (!vanBan.trim()) return [];
  let kho;
  try {
    kho = new Function(`${vanBan}\n;return typeof KHO_DE === "undefined" ? [] : KHO_DE;`)();
  } catch (loi) {
    throw new Error("File de-thi/kho-de.js đang bị lỗi cú pháp (" + loi.message + "), sửa file đó trước.");
  }
  return Array.isArray(kho) ? kho : [];
}

function vietKhoDe(kho) {
  return `/* =====================================================================
   KHO ĐỀ: xếp đề vào thư mục để tìm đề và lấy link nhanh (chỉ dùng ở trang admin)
   ---------------------------------------------------------------------
   Nên sắp xếp bằng trang admin: mục Kho đề -> Sắp xếp thư mục -> Lưu.
   Sửa tay cũng được: mỗi thư mục gồm tên và danh sách id đề theo thứ tự hiện.
   Đề không nằm trong thư mục nào sẽ hiện ở mục "Chưa xếp thư mục".
   ===================================================================== */

const KHO_DE = ${JSON.stringify(kho, null, 2)};
`;
}

// Đưa đề vào thư mục (chưa có thư mục thì tạo). Đề đang ở thư mục khác thì chuyển sang.
function themDeVaoKho(kho, tenThuMuc, id) {
  kho.forEach((t) => { t.de = (t.de || []).filter((x) => x !== id); });
  const ten = tenThuMuc.trim();
  let tm = kho.find((t) => String(t.ten).trim().toLowerCase() === ten.toLowerCase());
  if (!tm) {
    tm = { ten, de: [] };
    kho.push(tm);
  }
  tm.de.push(id);
  return kho;
}

// goc: thư mục web-luyen-de do người dùng chọn. Đọc de-thi/kho-de.js, sửa bằng capNhat(kho) rồi ghi lại.
async function ghiKhoDe(goc, capNhat) {
  let deThi;
  try {
    deThi = await goc.getDirectoryHandle("de-thi");
  } catch (loi) {
    throw new Error(`Thư mục "${goc.name}" không có de-thi/. Hãy chọn đúng thư mục web-luyen-de.`);
  }
  const tep = await deThi.getFileHandle("kho-de.js", { create: true });
  const noiDung = vietKhoDe(capNhat(docKhoDe(await (await tep.getFile()).text())));
  const ghi = await tep.createWritable();
  await ghi.write(noiDung);
  await ghi.close();
}
