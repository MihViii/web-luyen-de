/* =====================================================================
   KHO ĐỀ: cây thư mục chứa đề
   ---------------------------------------------------------------------
   Dữ liệu nằm trong de-thi/kho-de.js (biến KHO_DE), là một cây:
     [{ ten: "Toán 12", ma: "toan-12", de: [],
        con: [{ ten: "Chương 1", ma: "chuong-1", de: ["id-de-1", "id-de-2"], con: [] }] }, ...]
   - ten: tên thư mục, đổi thoải mái.
   - ma : mã cố định, không trùng trong cả cây, dùng trong link thư mục
          (index.html?thu-muc=<ma>), nên đổi tên thư mục thì link đã gửi vẫn dùng được.
   - de : id các đề nằm thẳng trong thư mục; con: các thư mục con.
   Dùng ở trang học sinh (hiện cây đề), trang admin (xem, sắp xếp)
   và trang tạo đề (chọn thư mục cho đề mới).
   Ghi file bằng File System Access API, giống trang tạo đề.
   ===================================================================== */

const ICON_THU_MUC = `<svg class="icon-thu-muc" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor"
  d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.4c.4 0 .78.16 1.06.44L11.6 7.1h7.9A1.5 1.5 0 0 1 21 8.6v8.9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/></svg>`;

// "Đề khởi động" -> "de-khoi-dong"
function maKhongDau(chuoi) {
  return String(chuoi).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "thu-muc";
}

// Đi qua mọi thư mục trong cây (cha trước con). lam(thuMuc, duongDan): duongDan là mảng tên từ gốc xuống.
function duyetKho(cay, lam, cha = []) {
  cay.forEach((t) => {
    const duongDan = [...cha, t.ten];
    lam(t, duongDan);
    duyetKho(t.con || [], lam, duongDan);
  });
}

// Bảo đảm mỗi thư mục có đủ { ten, ma, de, con }, mã không trùng trong cả cây,
// và mỗi đề chỉ nằm ở một chỗ. Mã đã có thì giữ nguyên (link cũ còn dùng được), chưa có thì tạo từ tên.
// Dữ liệu kiểu cũ (danh sách thư mục phẳng, không có "con") vẫn đọc được.
function chuanHoaKho(kho) {
  const daCoDe = new Set();
  const chuan = (ds) => (Array.isArray(ds) ? ds : []).filter((t) => t && typeof t === "object").map((t) => ({
    ten: String(t.ten ?? ""),
    ma: String(t.ma ?? "").trim(),
    de: (Array.isArray(t.de) ? t.de : []).filter((id) => typeof id === "string" && !daCoDe.has(id) && daCoDe.add(id)),
    con: chuan(t.con)
  }));
  const cay = chuan(kho);

  const tatCa = [];
  duyetKho(cay, (t) => tatCa.push(t));
  const daDung = new Set();
  const datMa = (t, goc) => {
    let ma = goc, n = 2;
    while (daDung.has(ma)) ma = `${goc}-${n++}`;
    daDung.add(ma);
    t.ma = ma;
  };
  tatCa.forEach((t) => { if (t.ma) datMa(t, t.ma); });                 // giữ mã có sẵn trước
  tatCa.forEach((t) => { if (!t.ma) datMa(t, maKhongDau(t.ten)); });   // rồi mới tạo mã mới
  return cay;
}

function layKhoDe() {
  return chuanHoaKho(typeof KHO_DE !== "undefined" ? KHO_DE : []);
}

// Danh sách đường dẫn mọi thư mục, vd ["Toán 12", "Toán 12 / Chương 1"] (gợi ý ở trang tạo đề)
function cacDuongDanKho(cay) {
  const ds = [];
  duyetKho(cay, (t, duongDan) => ds.push(duongDan.join(" / ")));
  return ds;
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
   KHO ĐỀ: cây thư mục chứa đề (trang học sinh và trang admin đều xếp theo cây này)
   ---------------------------------------------------------------------
   Nên sắp xếp bằng trang admin: mục Kho đề -> Sắp xếp thư mục -> Lưu.
   Sửa tay cũng được. Mỗi thư mục gồm:
     ten: tên thư mục
     ma : mã dùng trong link thư mục gửi học sinh, ĐỪNG đổi khi đã gửi link
     de : id các đề nằm trong thư mục, theo thứ tự hiện
     con: các thư mục con (cùng dạng như trên)
   Đề không nằm trong thư mục nào sẽ hiện ở mục "Chưa xếp thư mục" (admin),
   "Đề khác" (trang học sinh).
   ===================================================================== */

const KHO_DE = ${JSON.stringify(kho, null, 2)};
`;
}

function goDeKhoiKho(cay, id) {
  cay.forEach((t) => {
    t.de = t.de.filter((x) => x !== id);
    goDeKhoiKho(t.con, id);
  });
}

// Đưa đề vào thư mục theo đường dẫn "Toán 12 / Chương 1" (thư mục nào chưa có thì tạo).
// Đề đang ở thư mục khác thì chuyển sang. kho phải đã qua chuanHoaKho.
function themDeVaoKho(kho, duongDan, id) {
  goDeKhoiKho(kho, id);
  const cacTen = String(duongDan).split("/").map((s) => s.trim()).filter(Boolean);
  if (!cacTen.length) return kho;
  let ds = kho, tm = null;
  cacTen.forEach((ten) => {
    tm = ds.find((t) => t.ten.trim().toLowerCase() === ten.toLowerCase());
    if (!tm) {
      tm = { ten, ma: "", de: [], con: [] }; // mã được tạo khi ghi file (chuanHoaKho)
      ds.push(tm);
    }
    ds = tm.con;
  });
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
