/* =====================================================================
   KHO ĐỀ: xếp đề vào thư mục
   ---------------------------------------------------------------------
   Dữ liệu nằm trong de-thi/kho-de.js (biến KHO_DE):
     [{ ten: "Chương 1", ma: "chuong-1", de: ["id-de-1", "id-de-2"] }, ...]
   - ten: tên thư mục, đổi thoải mái.
   - ma : mã cố định, dùng trong link thư mục (index.html?thu-muc=<ma>),
          nên đổi tên thư mục thì link đã gửi học sinh vẫn dùng được.
   Dùng ở trang học sinh (xếp đề theo thư mục), trang admin (xem, sắp xếp)
   và trang tạo đề (chọn thư mục cho đề mới).
   Ghi file bằng File System Access API, giống trang tạo đề.
   ===================================================================== */

// "Đề khởi động" -> "de-khoi-dong"
function maKhongDau(chuoi) {
  return String(chuoi).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "thu-muc";
}

// Bảo đảm mỗi thư mục có tên, danh sách đề và mã riêng không trùng.
// Mã đã có thì giữ nguyên (link cũ còn dùng được), chưa có thì tạo từ tên.
function chuanHoaKho(kho) {
  const ds = (Array.isArray(kho) ? kho : []).map((t) => ({
    ten: String(t.ten ?? ""), ma: String(t.ma ?? "").trim(), de: Array.isArray(t.de) ? [...t.de] : []
  }));
  const daDung = new Set();
  const datMa = (t, goc) => {
    let ma = goc, n = 2;
    while (daDung.has(ma)) ma = `${goc}-${n++}`;
    daDung.add(ma);
    t.ma = ma;
  };
  ds.forEach((t) => { if (t.ma) datMa(t, t.ma); });                 // giữ mã có sẵn trước
  ds.forEach((t) => { if (!t.ma) datMa(t, maKhongDau(t.ten)); });   // rồi mới tạo mã mới
  return ds;
}

function layKhoDe() {
  return chuanHoaKho(typeof KHO_DE !== "undefined" ? KHO_DE : []);
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
   Sửa tay cũng được: mỗi thư mục gồm tên, mã (dùng trong link thư mục gửi
   học sinh, ĐỪNG đổi mã khi đã gửi link) và danh sách id đề theo thứ tự hiện.
   Trang học sinh cũng xếp đề theo đúng các thư mục này.
   Đề không nằm trong thư mục nào sẽ hiện ở mục "Chưa xếp thư mục" (admin),
   "Đề khác" (trang học sinh).
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
    tm = { ten, ma: "", de: [] }; // mã được tạo khi ghi file (chuanHoaKho)
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
  const noiDung = vietKhoDe(chuanHoaKho(capNhat(chuanHoaKho(docKhoDe(await (await tep.getFile()).text())))));
  const ghi = await tep.createWritable();
  await ghi.write(noiDung);
  await ghi.close();
}
