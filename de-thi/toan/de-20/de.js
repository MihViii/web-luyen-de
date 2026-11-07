/* ĐỀ 20 · Toán
   Tạo bằng trang "Tạo đề từ PDF" ngày 8/11/2026.
   Mỗi câu là một ảnh cắt từ de.pdf. Muốn sửa đáp án thì đổi dapAn bên dưới. */

themDe({
  id: "toan-de-20",
  mon: "Toán",
  ten: "ĐỀ 20",
  moTa: "",
  thoiGian: 90, // phút
  diemPhan1: 0.25,
  diemPhan3: 0.5,
  pdf: "de.pdf", // file học sinh bấm "Tải đề" nhận được

  phan1: [
    { hinh: "p1-01.png", dapAn: "D" },
    { hinh: "p1-02.png", dapAn: "A" },
    { hinh: "p1-03.png", dapAn: "D" },
    { hinh: "p1-04.png", dapAn: "B" },
    { hinh: "p1-05.png", dapAn: "C" },
    { hinh: "p1-06.png", dapAn: "B" },
    { hinh: "p1-07.png", dapAn: "D" },
    { hinh: "p1-08.png", dapAn: "C" },
    { hinh: "p1-09.png", dapAn: "C" },
    { hinh: "p1-10.png", dapAn: "A" },
    { hinh: "p1-11.png", dapAn: "A" },
    { hinh: "p1-12.png", dapAn: "B" }
  ],

  phan2: [
    { hinh: "p2-01.png", y: [{ dapAn: true }, { dapAn: false }, { dapAn: true }, { dapAn: false }] },
    { hinh: "p2-02.png", y: [{ dapAn: false }, { dapAn: false }, { dapAn: true }, { dapAn: false }] },
    { hinh: "p2-03.png", y: [{ dapAn: false }, { dapAn: false }, { dapAn: false }, { dapAn: true }] },
    { hinh: "p2-04.png", y: [{ dapAn: false }, { dapAn: true }, { dapAn: true }, { dapAn: false }] }
  ],

  phan3: [
    { hinh: "p3-01.png", dapAn: 0.5 },
    { hinh: "p3-02.png", dapAn: 13.3 },
    { hinh: "p3-03.png", dapAn: 0.46 },
    { hinh: "p3-04.png", dapAn: 27.9 },
    { hinh: "p3-05.png", dapAn: 684 },
    { hinh: "p3-06.png", dapAn: 61.2 }
  ]
});
