/* =====================================================================
   KHO ĐỀ: xếp đề vào thư mục để tìm đề và lấy link nhanh (chỉ dùng ở trang admin)
   ---------------------------------------------------------------------
   Nên sắp xếp bằng trang admin: mục Kho đề -> Sắp xếp thư mục -> Lưu.
   Sửa tay cũng được: mỗi thư mục gồm tên, mã (dùng trong link thư mục gửi
   học sinh, ĐỪNG đổi mã khi đã gửi link) và danh sách id đề theo thứ tự hiện.
   Trang học sinh cũng xếp đề theo đúng các thư mục này.
   Đề không nằm trong thư mục nào sẽ hiện ở mục "Chưa xếp thư mục" (admin),
   "Đề khác" (trang học sinh).
   ===================================================================== */

const KHO_DE = [
  {
    "ten": "Chương 1",
    "ma": "chuong-1",
    "de": [
      "toan-chuong-i-de-1",
      "toan-chuong-1-de-2"
    ]
  },
  {
    "ten": "Đề khởi động",
    "ma": "de-khoi-dong",
    "de": [
      "toan-de-khoi-dong-so-11"
    ]
  }
];
