/* ĐỀ 15 · Toán
   Tạo bằng trang "Tạo đề từ PDF" ngày 7/11/2026.
   Mỗi câu là một ảnh cắt từ de.pdf. Muốn sửa đáp án thì đổi dapAn bên dưới. */

themDe({
  id: "toan-de-15",
  mon: "Toán",
  ten: "ĐỀ 15",
  moTa: "",
  thoiGian: 90, // phút
  diemPhan1: 0.25,
  diemPhan3: 0.5,
  pdf: "de.pdf", // file học sinh bấm "Tải đề" nhận được

  phan1: [
    { hinh: "p1-01.png", dapAn: "B" },
    { hinh: "p1-02.png", dapAn: "C" },
    { hinh: "p1-03.png", dapAn: "B" },
    { hinh: "p1-04.png", dapAn: "D" },
    { hinh: "p1-05.png", dapAn: "C" },
    { hinh: "p1-06.png", dapAn: "D" },
    { hinh: "p1-07.png", dapAn: "D" },
    { hinh: "p1-08.png", dapAn: "A" },
    { hinh: "p1-09.png", dapAn: "B" },
    { hinh: "p1-10.png", dapAn: "C" },
    { hinh: "p1-11.png", dapAn: "B" },
    { hinh: "p1-12.png", dapAn: "C" }
  ],

  phan2: [
    { hinh: "p2-01.png", y: [{ dapAn: true }, { dapAn: false }, { dapAn: true }, { dapAn: true }] },
    { hinh: "p2-02.png", y: [{ dapAn: true }, { dapAn: true }, { dapAn: false }, { dapAn: true }] },
    { hinh: "p2-03.png", y: [{ dapAn: true }, { dapAn: false }, { dapAn: false }, { dapAn: true }] },
    { hinh: "p2-04.png", y: [{ dapAn: true }, { dapAn: false }, { dapAn: false }, { dapAn: true }] }
  ],

  phan3: [
    { hinh: "p3-01.png", dapAn: 0.63 },
    { hinh: "p3-02.png", dapAn: 4 },
    { hinh: "p3-03.png", dapAn: 12 },
    { hinh: "p3-04.png", dapAn: 34.4 },
    { hinh: "p3-05.png", dapAn: 36 },
    { hinh: "p3-06.png", dapAn: 3148 }
  ]
});
