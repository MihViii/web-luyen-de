/* =====================================================================
   NẠP ĐỀ THI
   ---------------------------------------------------------------------
   Đọc DANH_SACH_THU_MUC_DE (de-thi/danh-sach.js), nạp file de.js trong
   từng thư mục. Mỗi file de.js gọi themDe({...}) để đưa đề vào DANH_SACH_DE.
   Nạp bằng thẻ <script> chứ không dùng fetch, để mở thẳng file index.html
   (không qua server) vẫn chạy.

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

const DE_DA_TAI = Promise.all(DANH_SACH_THU_MUC_DE.map((thuMuc) => new Promise((xong) => {
  const the = document.createElement("script");
  the.src = "de-thi/" + thuMuc + "/de.js";
  the.async = false; // chạy đúng thứ tự trong danh sách
  the.onload = xong;
  the.onerror = () => { console.error("Không tìm thấy file đề:", the.src); xong(); };
  document.head.appendChild(the);
})));
