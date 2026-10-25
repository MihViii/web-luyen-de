/* =====================================================================
   TẠO ĐỀ TỪ PDF (tao-de.html)
   ---------------------------------------------------------------------
   1. Đọc file PDF bằng PDF.js, vẽ từng trang ra <canvas>.
   2. Gia sư kéo chuột khoanh vùng từng câu -> mỗi câu thành một ảnh.
      Câu bị ngắt trang thì "nối" thêm vùng, các vùng xếp chồng thành 1 ảnh.
   3. Chọn đáp án cho từng câu.
   4. Lưu: ghi ảnh + de.pdf + de.js vào de-thi/<môn>/<tên đề>/ rồi thêm đề
      vào de-thi/danh-sach.js (File System Access API, có trên Chrome/Edge).
      Trình duyệt khác thì tải về file .zip để tự chép vào.
   Mọi thứ chạy trên máy, file PDF không bị gửi đi đâu.
   ===================================================================== */

const $ = (id) => document.getElementById(id);
const CHU_CAI = ["A", "B", "C", "D"];
const TEN_PHAN = { 1: "I", 2: "II", 3: "III" };
const DO_NET = 2.5; // vẽ trang PDF gấp 2,5 lần; trang học sinh hiện ảnh bằng nửa số pixel (app.js) nên chữ to vừa và nét

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const trangThai = {
  filePdf: null,                    // file gốc, lưu kèm đề để học sinh tải về
  cacTrang: [],                     // canvas của từng trang PDF
  cauHoi: { 1: [], 2: [], 3: [] },  // mỗi câu: { vung: [{ trang, x, y, w, h }], dapAn, anh }
  phan: 1,                          // phần đang cắt
  dangNoi: null,                    // câu chờ nối thêm vùng: { phan, chiSo }
  daLuu: false
};

/* ---------------- Tiện ích nhỏ ---------------- */

function anToan(chuoi) {
  return String(chuoi ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// "Đề thi thử số 2" -> "de-thi-thu-so-2" (dùng làm tên thư mục và id)
function khongDau(chuoi) {
  return chuoi.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const demCau = () => trangThai.cauHoi[1].length + trangThai.cauHoi[2].length + trangThai.cauHoi[3].length;
const tenAnh = (phan, i) => `p${phan}-${String(i + 1).padStart(2, "0")}.png`;

/* ================= BƯỚC 1: THÔNG TIN ĐỀ ================= */

function layThongTin() {
  const mon = $("o-mon").value.trim();
  const ten = $("o-ten").value.trim();
  const maMon = khongDau(mon);
  const maTen = khongDau(ten);
  return {
    mon, ten,
    moTa: $("o-mo-ta").value.trim(),
    thoiGian: Number($("o-thoi-gian").value),
    diemPhan1: Number($("o-diem1").value),
    diemPhan3: Number($("o-diem3").value),
    thuMuc: maMon && maTen ? `${maMon}/${maTen}` : "",
    id: maMon && maTen ? `${maMon}-${maTen}` : ""
  };
}

function capNhatDuongDan() {
  const tt = layThongTin();
  $("xem-duong-dan").textContent = tt.thuMuc ? `de-thi/${tt.thuMuc}/` : "(nhập môn và tên đề)";
}

$("form-de").addEventListener("input", capNhatDuongDan);
// Phần III: Toán 0,5 điểm/câu, Lý/Hóa/Sinh 0,25
$("o-mon").addEventListener("change", () => {
  $("o-diem3").value = khongDau($("o-mon").value) === "toan" ? 0.5 : 0.25;
});
capNhatDuongDan();

/* ================= BƯỚC 2: ĐỌC PDF ================= */

$("o-pdf").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (demCau() && !confirm("Đổi file PDF sẽ xóa hết các câu đã cắt. Tiếp tục?")) {
    e.target.value = "";
    return;
  }
  Object.assign(trangThai, { filePdf: file, cacTrang: [], cauHoi: { 1: [], 2: [], 3: [] }, dangNoi: null });
  $("cac-trang").innerHTML = "";
  veDanhSachCau();
  $("tt-pdf").textContent = "Đang đọc file…";

  try {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const trang = await pdf.getPage(i);
      const khung = trang.getViewport({ scale: DO_NET });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(khung.width);
      canvas.height = Math.floor(khung.height);
      await trang.render({ canvasContext: canvas.getContext("2d"), viewport: khung }).promise;
      trangThai.cacTrang.push(canvas);

      const o = document.createElement("div");
      o.className = "trang-pdf";
      o.dataset.trang = i - 1;
      o.append(canvas);
      $("cac-trang").append(o);
      $("buoc-cat").hidden = false;
      $("buoc-luu").hidden = false;
      $("tt-pdf").textContent = `Đang đọc trang ${i}/${pdf.numPages}…`;
    }
    $("tt-pdf").textContent = `${file.name}: ${pdf.numPages} trang, ${(file.size / 1048576).toFixed(1)} MB.`;
  } catch (loi) {
    console.error(loi);
    $("tt-pdf").textContent = "Không đọc được file PDF: " + loi.message;
  }
});

/* ================= BƯỚC 3: KHOANH VÙNG ================= */

// Tọa độ lưu theo tỉ lệ 0..1 của trang, nên không phụ thuộc trang đang hiện to hay nhỏ
let dangVe = null; // { o, trang, x0, y0, khung, vung }

function viTri(e, o) {
  const r = o.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
    y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
  };
}

function datViTri(phanTu, v) {
  Object.assign(phanTu.style, {
    left: v.x * 100 + "%", top: v.y * 100 + "%", width: v.w * 100 + "%", height: v.h * 100 + "%"
  });
}

$("cac-trang").addEventListener("pointerdown", (e) => {
  const o = e.target.closest(".trang-pdf");
  if (!o || e.button !== 0) return;
  e.preventDefault();
  o.setPointerCapture(e.pointerId);
  const p = viTri(e, o);
  const khung = document.createElement("div");
  khung.className = "khung-cat dang-ve";
  o.append(khung);
  dangVe = { o, trang: +o.dataset.trang, x0: p.x, y0: p.y, khung, vung: null };
});

$("cac-trang").addEventListener("pointermove", (e) => {
  if (!dangVe) return;
  const p = viTri(e, dangVe.o);
  dangVe.vung = {
    trang: dangVe.trang,
    x: Math.min(p.x, dangVe.x0), y: Math.min(p.y, dangVe.y0),
    w: Math.abs(p.x - dangVe.x0), h: Math.abs(p.y - dangVe.y0)
  };
  datViTri(dangVe.khung, dangVe.vung);
});

function ketThucVe() {
  if (!dangVe) return;
  const { khung, vung } = dangVe;
  dangVe = null;
  khung.remove();
  if (vung && vung.w > 0.02 && vung.h > 0.01) themVung(vung); // vùng quá nhỏ = lỡ bấm
}
$("cac-trang").addEventListener("pointerup", ketThucVe);
$("cac-trang").addEventListener("pointercancel", ketThucVe);

function themVung(vung) {
  const noi = trangThai.dangNoi;
  if (noi) {
    const cau = trangThai.cauHoi[noi.phan][noi.chiSo];
    cau.vung.push(vung);
    cau.anh = null; // ảnh xem trước phải ghép lại
    trangThai.dangNoi = null;
  } else {
    const phan = trangThai.phan;
    const dapAn = phan === 1 ? null : phan === 2 ? [null, null, null, null] : "";
    trangThai.cauHoi[phan].push({ vung: [vung], dapAn, anh: null });
  }
  trangThai.daLuu = false;
  veKhungCat();
  veDanhSachCau();
  if (!noi) $("bang-cau").scrollTop = $("bang-cau").scrollHeight; // cuộn tới câu vừa thêm
}

// Ghép các vùng của một câu thành một ảnh, xếp chồng từ trên xuống
function ghepAnh(cau) {
  const manh = cau.vung.map((v) => {
    const nguon = trangThai.cacTrang[v.trang];
    return {
      nguon,
      x: Math.round(v.x * nguon.width), y: Math.round(v.y * nguon.height),
      w: Math.max(1, Math.round(v.w * nguon.width)), h: Math.max(1, Math.round(v.h * nguon.height))
    };
  });
  const c = document.createElement("canvas");
  c.width = Math.max(...manh.map((m) => m.w));
  c.height = manh.reduce((tong, m) => tong + m.h, 0);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  let y = 0;
  manh.forEach((m) => {
    ctx.drawImage(m.nguon, m.x, m.y, m.w, m.h, 0, y, m.w, m.h);
    y += m.h;
  });
  return c;
}

// Vẽ khung các câu đã cắt lên trang PDF, kèm nhãn "I.3", "II.1"...
function veKhungCat() {
  document.querySelectorAll(".khung-cat").forEach((k) => k.remove());
  [1, 2, 3].forEach((phan) => trangThai.cauHoi[phan].forEach((cau, i) => {
    cau.vung.forEach((v) => {
      const k = document.createElement("div");
      k.className = "khung-cat";
      k.innerHTML = `<span>${TEN_PHAN[phan]}.${i + 1}</span>`;
      datViTri(k, v);
      document.querySelector(`.trang-pdf[data-trang="${v.trang}"]`).append(k);
    });
  }));
}

/* ---------------- Danh sách câu (cột phải) ---------------- */

function veDanhSachCau() {
  document.querySelectorAll("#tab-phan button").forEach((b) => {
    const phan = +b.dataset.phan;
    b.setAttribute("aria-pressed", String(phan === trangThai.phan));
    b.querySelector("span").textContent = trangThai.cauHoi[phan].length;
  });
  const phan = trangThai.phan;
  const ds = trangThai.cauHoi[phan];
  const noi = trangThai.dangNoi;
  $("goi-y-che-do").textContent = noi
    ? `Khoanh vùng tiếp theo sẽ nối vào Phần ${TEN_PHAN[noi.phan]} câu ${noi.chiSo + 1}.`
    : `Khoanh vùng trên trang PDF để thêm câu ${ds.length + 1} vào Phần ${TEN_PHAN[phan]}.`;
  $("ds-cau").innerHTML = ds.length
    ? ds.map((cau, i) => veTheCau(phan, cau, i)).join("")
    : `<p class="trong">Chưa có câu nào.</p>`;
}

function veTheCau(phan, cau, i) {
  if (!cau.anh) cau.anh = ghepAnh(cau).toDataURL();
  const ten = `p${phan}-${i}`;
  let oDapAn;
  if (phan === 1) {
    oDapAn = `<div class="chon-ds">${CHU_CAI.map((c) => `
      <label><input type="radio" name="${ten}" value="${c}" ${cau.dapAn === c ? "checked" : ""}><span>${c}</span></label>`).join("")}
    </div>`;
  } else if (phan === 2) {
    oDapAn = `<div class="luoi-y">${cau.dapAn.map((d, j) => `
      <div>
        <span class="chu-y">${"abcd"[j]})</span>
        <span class="chon-ds">
          <label><input type="radio" name="${ten}-${j}" value="dung" ${d === true ? "checked" : ""}><span>Đ</span></label>
          <label><input type="radio" name="${ten}-${j}" value="sai" ${d === false ? "checked" : ""}><span>S</span></label>
        </span>
      </div>`).join("")}
    </div>`;
  } else {
    oDapAn = `<label class="hang-dap-an"><span class="nhan">Đáp án</span>
      <input class="o-dap-an" name="${ten}" value="${anToan(cau.dapAn)}" maxlength="4" placeholder="0,5" autocomplete="off">
    </label>`;
  }
  const noi = trangThai.dangNoi;
  const dangNoi = noi && noi.phan === phan && noi.chiSo === i;
  return `
    <div class="the-cau${dangNoi ? " dang-noi" : ""}">
      <div class="dau-cau"><b>Câu ${i + 1}</b>
        <div class="hang-nut">
          <button type="button" class="nut" data-noi="${i}">${dangNoi ? "Hủy nối" : "Nối vùng"}</button>
          <button type="button" class="nut" data-xoa="${i}">Xóa</button>
        </div>
      </div>
      <img src="${cau.anh}" alt="Ảnh câu ${i + 1} phần ${TEN_PHAN[phan]}">
      ${oDapAn}
    </div>`;
}

$("tab-phan").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-phan]");
  if (!b) return;
  trangThai.phan = +b.dataset.phan;
  veDanhSachCau();
});

// Ghi đáp án vào trangThai (không vẽ lại danh sách để khỏi mất chỗ đang gõ)
$("ds-cau").addEventListener("change", (e) => {
  const o = e.target;
  if (o.type !== "radio") return;
  const [phan, i, j] = o.name.slice(1).split("-").map(Number); // "p2-3-1" -> [2, 3, 1]
  const cau = trangThai.cauHoi[phan][i];
  if (phan === 1) cau.dapAn = o.value;
  if (phan === 2) cau.dapAn[j] = o.value === "dung";
  trangThai.daLuu = false;
});

$("ds-cau").addEventListener("input", (e) => {
  const o = e.target;
  if (!o.classList.contains("o-dap-an")) return;
  o.value = o.value.replace(/[^0-9,.\-]/g, "").replace(".", ",");
  const [phan, i] = o.name.slice(1).split("-").map(Number);
  trangThai.cauHoi[phan][i].dapAn = o.value;
  trangThai.daLuu = false;
});

$("ds-cau").addEventListener("click", (e) => {
  const nut = e.target.closest("button");
  if (!nut) return;
  const phan = trangThai.phan;
  if (nut.dataset.xoa !== undefined) {
    const i = +nut.dataset.xoa;
    if (!confirm(`Xóa câu ${i + 1} của Phần ${TEN_PHAN[phan]}?`)) return;
    trangThai.cauHoi[phan].splice(i, 1);
    trangThai.dangNoi = null; // số thứ tự các câu sau đã đổi
  }
  if (nut.dataset.noi !== undefined) {
    const i = +nut.dataset.noi;
    const noi = trangThai.dangNoi;
    trangThai.dangNoi = noi && noi.phan === phan && noi.chiSo === i ? null : { phan, chiSo: i };
  }
  veKhungCat();
  veDanhSachCau();
});

/* ================= BƯỚC 4: LƯU ================= */

function kiemTra(tt) {
  const loi = [];
  if (!tt.mon) loi.push("Chưa nhập môn.");
  if (!tt.ten) loi.push("Chưa nhập tên đề.");
  else if (!tt.id) loi.push("Tên đề phải có chữ hoặc số.");
  if (!(tt.thoiGian > 0)) loi.push("Thời gian phải lớn hơn 0.");
  if (!(tt.diemPhan1 > 0) || !(tt.diemPhan3 > 0)) loi.push("Điểm mỗi câu phải lớn hơn 0.");
  if (tt.id && (DANH_SACH_DE.some((d) => d.id === tt.id) || DANH_SACH_THU_MUC_DE.includes(tt.thuMuc))) {
    loi.push(`Đã có đề ở de-thi/${tt.thuMuc}. Đặt tên đề khác.`);
  }
  if (!trangThai.filePdf) loi.push("Chưa chọn file PDF.");
  else if (!demCau()) loi.push("Chưa cắt câu nào.");
  const ds = trangThai.cauHoi;
  ds[1].forEach((c, i) => { if (!c.dapAn) loi.push(`Phần I câu ${i + 1}: chưa chọn đáp án.`); });
  ds[2].forEach((c, i) => { if (c.dapAn.includes(null)) loi.push(`Phần II câu ${i + 1}: chưa chọn đủ Đ/S cho 4 ý.`); });
  ds[3].forEach((c, i) => { if (chuyenThanhSo(c.dapAn) === null) loi.push(`Phần III câu ${i + 1}: đáp án phải là một số.`); });
  return loi;
}

// Nội dung file de.js, cùng dạng với đề gõ tay (xem de-thi/danh-sach.js)
function taoFileDe(tt) {
  const s = JSON.stringify;
  const ds = trangThai.cauHoi;
  const p1 = ds[1].map((c, i) => `    { hinh: ${s(tenAnh(1, i))}, dapAn: ${s(c.dapAn)} }`);
  const p2 = ds[2].map((c, i) =>
    `    { hinh: ${s(tenAnh(2, i))}, y: [${c.dapAn.map((d) => `{ dapAn: ${d} }`).join(", ")}] }`);
  const p3 = ds[3].map((c, i) => `    { hinh: ${s(tenAnh(3, i))}, dapAn: ${chuyenThanhSo(c.dapAn)} }`);
  const mang = (dong) => (dong.length ? `[\n${dong.join(",\n")}\n  ]` : "[]");
  return `/* ${tt.ten.replace(/\*\//g, "")} · ${tt.mon}
   Tạo bằng trang "Tạo đề từ PDF" ngày ${new Date().toLocaleDateString("vi-VN")}.
   Mỗi câu là một ảnh cắt từ de.pdf. Muốn sửa đáp án thì đổi dapAn bên dưới. */

themDe({
  id: ${s(tt.id)},
  mon: ${s(tt.mon)},
  ten: ${s(tt.ten)},
  moTa: ${s(tt.moTa)},
  thoiGian: ${tt.thoiGian}, // phút
  diemPhan1: ${tt.diemPhan1},
  diemPhan3: ${tt.diemPhan3},
  pdf: "de.pdf", // file học sinh bấm "Tải đề" nhận được

  phan1: ${mang(p1)},

  phan2: ${mang(p2)},

  phan3: ${mang(p3)}
});
`;
}

// Ảnh từng câu + de.pdf + de.js
async function taoCacTep(tt) {
  const tep = [{ ten: "de.pdf", noiDung: trangThai.filePdf }];
  for (const phan of [1, 2, 3]) {
    for (const [i, cau] of trangThai.cauHoi[phan].entries()) {
      const anh = await new Promise((xong) => ghepAnh(cau).toBlob(xong, "image/png"));
      tep.push({ ten: tenAnh(phan, i), noiDung: anh });
    }
  }
  tep.push({ ten: "de.js", noiDung: new Blob([taoFileDe(tt)], { type: "text/javascript" }) });
  return tep;
}

// Thêm một dòng vào cuối DANH_SACH_THU_MUC_DE trong nội dung file danh-sach.js
function themVaoDanhSach(vanBan, thuMuc) {
  const khop = vanBan.match(/(const DANH_SACH_THU_MUC_DE = \[)([\s\S]*?)\n\];/);
  if (!khop) return null;
  // Dòng cuối chưa có dấu phẩy thì thêm, để file vẫn đúng cú pháp
  const dong = khop[2].split("\n");
  for (let i = dong.length - 1; i >= 0; i--) {
    const d = dong[i].trim();
    if (!d || d.startsWith("//")) continue;
    if (!d.endsWith(",")) dong[i] = dong[i].replace(/\s*$/, ",");
    break;
  }
  const mangMoi = khop[1] + dong.join("\n") + `\n  ${JSON.stringify(thuMuc)},\n];`;
  return vanBan.replace(khop[0], () => mangMoi);
}

async function ghiFile(thuMuc, ten, noiDung) {
  const ghi = await (await thuMuc.getFileHandle(ten, { create: true })).createWritable();
  await ghi.write(noiDung);
  await ghi.close();
}

async function ghiVaoThuMuc(goc, thuMuc, tep) {
  let deThi, fileDanhSach;
  try {
    deThi = await goc.getDirectoryHandle("de-thi");
    fileDanhSach = await deThi.getFileHandle("danh-sach.js");
  } catch (e) {
    throw new Error(`Thư mục "${goc.name}" không có de-thi/danh-sach.js. Hãy chọn đúng thư mục web-luyen-de.`);
  }
  const danhSachMoi = themVaoDanhSach(await (await fileDanhSach.getFile()).text(), thuMuc);
  if (!danhSachMoi) throw new Error("Không tìm thấy DANH_SACH_THU_MUC_DE trong de-thi/danh-sach.js.");

  const [maMon, maTen] = thuMuc.split("/");
  const thuMon = await deThi.getDirectoryHandle(maMon, { create: true });
  const daCo = await thuMon.getDirectoryHandle(maTen).then(() => true, () => false);
  if (daCo) throw new Error(`Đã có thư mục de-thi/${thuMuc}. Đặt tên đề khác.`);
  const thuDe = await thuMon.getDirectoryHandle(maTen, { create: true });

  for (const t of tep) await ghiFile(thuDe, t.ten, t.noiDung);
  await ghiFile(deThi, "danh-sach.js", danhSachMoi); // ghi sau cùng: lỡ lỗi giữa chừng thì đề chưa hiện ra
}

async function taiZip(maTen, tep) {
  const zip = new JSZip();
  const thu = zip.folder(maTen);
  tep.forEach((t) => thu.file(t.ten, t.noiDung));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(await zip.generateAsync({ type: "blob" }));
  a.download = maTen + ".zip";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// Trình duyệt không ghi thẳng vào thư mục được (Safari, Firefox) thì chỉ còn cách tải .zip
if (!window.showDirectoryPicker) {
  $("nut-luu").hidden = true;
  $("nut-zip").classList.add("nut-chinh");
}

async function luuDe(e) {
  const cach = e.currentTarget.dataset.cach; // "thu-muc" | "zip"; đọc ngay vì sau await currentTarget thành null
  const tt = layThongTin();
  const o = $("tt-luu");
  const cacLoi = kiemTra(tt);
  if (cacLoi.length) {
    o.className = "trang-thai-luu loi";
    o.innerHTML = "Chưa lưu được:<br>" + cacLoi.map(anToan).join("<br>");
    return;
  }

  const cacNut = [$("nut-luu"), $("nut-zip")];
  cacNut.forEach((n) => { n.disabled = true; });
  o.className = "trang-thai-luu";
  try {
    const [maMon, maTen] = tt.thuMuc.split("/");
    if (cach === "thu-muc") {
      // Mở hộp chọn thư mục trước khi tạo ảnh: Chrome chỉ cho mở trong vài giây sau cú bấm
      let goc;
      try {
        goc = await showDirectoryPicker({ id: "web-luyen-de", mode: "readwrite" });
      } catch (loi) {
        if (loi.name === "AbortError") { o.textContent = ""; return; } // bấm Hủy
        throw loi;
      }
      o.textContent = "Đang tạo ảnh từng câu…";
      const tep = await taoCacTep(tt);
      o.textContent = "Đang ghi file…";
      await ghiVaoThuMuc(goc, tt.thuMuc, tep);
      o.className = "trang-thai-luu ok";
      o.innerHTML = `Đã lưu vào <code>de-thi/${anToan(tt.thuMuc)}/</code> và thêm vào <code>de-thi/danh-sach.js</code>.
        Mở lại trang học sinh trên máy để xem thử, rồi commit và push lên GitHub là học sinh thấy đề.`;
    } else {
      o.textContent = "Đang tạo ảnh từng câu…";
      await taiZip(maTen, await taoCacTep(tt));
      o.className = "trang-thai-luu ok";
      o.innerHTML = `Đã tải về <code>${anToan(maTen)}.zip</code>.
        Giải nén rồi chép thư mục <code>${anToan(maTen)}</code> vào <code>de-thi/${anToan(maMon)}/</code>,
        sau đó thêm dòng <code>"${anToan(tt.thuMuc)}",</code> vào <code>de-thi/danh-sach.js</code>.`;
    }
    trangThai.daLuu = true;
  } catch (loi) {
    console.error(loi);
    o.className = "trang-thai-luu loi";
    o.textContent = "Lỗi khi lưu: " + loi.message;
  } finally {
    cacNut.forEach((n) => { n.disabled = false; });
  }
}
$("nut-luu").addEventListener("click", luuDe);
$("nut-zip").addEventListener("click", luuDe);

// Nhắc trước khi đóng trang nếu đã cắt câu mà chưa lưu
window.addEventListener("beforeunload", (e) => {
  if (demCau() && !trangThai.daLuu) {
    e.preventDefault();
    e.returnValue = "";
  }
});
