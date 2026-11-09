/* =====================================================================
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

const KHO_DE = [
  {
    "ten": "Chương 1",
    "ma": "chuong-1",
    "de": [
      "toan-chuong-i-de-1",
      "toan-chuong-1-de-2",
      "toan-chuong-1-de-3"
    ],
    "con": []
  },
  {
    "ten": "Đề khởi động",
    "ma": "de-khoi-dong",
    "de": [
      "toan-de-khoi-dong-so-11",
      "toan-de-15",
      "toan-de-16",
      "toan-de-17",
      "toan-de-18",
      "toan-de-19",
      "toan-de-20"
    ],
    "con": []
  }
];
