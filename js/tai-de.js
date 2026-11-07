/* =====================================================================
   NẠP ĐỀ THI
   ---------------------------------------------------------------------
   Nạp de-thi/danh-sach.js (DANH_SACH_THU_MUC_DE), rồi nạp file de.js trong
   từng thư mục. Mỗi file de.js gọi themDe({...}) để đưa đề vào DANH_SACH_DE.
   Nạp thêm de-thi/kho-de.js (KHO_DE, thư mục đề ở trang admin) nếu có.
   Nạp bằng thẻ <script> chứ không dùng fetch, để mở thẳng file index.html
   (không qua server) vẫn chạy.

   Các file trong de-thi/ luôn được tải bản mới nhất (thêm ?t=... vào link):
   GitHub Pages cho trình duyệt giữ bản cũ tới 10 phút, nếu không làm vậy thì
   vừa push đề mới mà học sinh mở link vẫn thấy danh sách đề cũ.

   DE_DA_TAI: Promise xong khi mọi file đề đã nạp (kể cả file bị lỗi).
   ===================================================================== */

const DANH_SACH_DE = [];

// Được gọi từ mỗi file de-thi/.../de.js
function themDe(de) {
  if (DANH_SACH_DE.some((d) => d.id === de.id)) {
    console.error(`Trùng id đề "${de.id}" (${document.currentScript.src}), đề này bị bỏ qua.`);
    return;
  }
  // Ghi nhớ thư mục của đề, để ảnh (trường "hinh") tính đường dẫn từ đó
  de.thuMuc = new URL(".", document.currentScript.src).href;
  DANH_SACH_DE.push(de);
}

// Link riêng của một đề: mở trang học sinh vào thẳng đề đó, không chọn nhầm đề khác được (xem app.js)
function linkDe(id) {
  const trang = location.protocol === "file:" ? "index.html" : "./";
  return new URL(`${trang}?de=${encodeURIComponent(id)}`, location.href).href;
}

// Link một thư mục trong Kho đề: học sinh chỉ thấy và làm các đề trong thư mục đó (xem app.js)
function linkThuMuc(ma) {
  const trang = location.protocol === "file:" ? "index.html" : "./";
  return new URL(`${trang}?thu-muc=${encodeURIComponent(ma)}`, location.href).href;
}

const MOC_TAI = Date.now();

// Nạp một file .js luôn lấy bản mới nhất. async = false: các file chạy đúng thứ tự được thêm vào.
function napScript(duongDan) {
  return new Promise((xong, loi) => {
    const the = document.createElement("script");
    the.src = `${duongDan}?t=${MOC_TAI}`;
    the.async = false;
    the.onload = xong;
    the.onerror = () => loi(new Error("Không tìm thấy file: " + duongDan));
    document.head.appendChild(the);
  });
}

const DE_DA_TAI = Promise.all([
  napScript("de-thi/kho-de.js").catch(() => {}), // chưa có file kho đề thì coi như chưa xếp thư mục
  napScript("de-thi/danh-sach.js")
    .then(() => Promise.all(DANH_SACH_THU_MUC_DE.map((thuMuc) =>
      napScript(`de-thi/${thuMuc}/de.js`).catch((loi) => console.error(loi.message)))))
    .catch((loi) => console.error(loi.message))
]).then(() => {});
