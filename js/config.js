/* =====================================================================
   CẤU HÌNH
   ---------------------------------------------------------------------
   Dán link Web App của Google Apps Script vào đây (xem README, bước 2).
   Để trống "" thì trang vẫn chạy bình thường, chỉ là KHÔNG lưu kết quả.
   ===================================================================== */

const CAU_HINH = {
  LINK_APPS_SCRIPT: "https://script.google.com/macros/s/AKfycbwXKpE5CGzr79dNNxItJZn2GR_ThspbAN4vUHigr7qorNmmPZCc-ylawc-n6NRKhTwl/exec",
  TEN_LOP_HOC: "Lớp luyện thi của MinhVi", // tên hiện trên đầu trang, sửa tùy ý

  // Sau khi nộp bài, học sinh có được xem đáp án và lời giải không.
  //   false: chỉ biết câu nào đúng, câu nào sai (Phần II chỉ biết số ý đúng của cả câu)
  //   true : thấy đáp án đúng, lời giải từng câu
  // Trang admin luôn thấy đủ đáp án.
  HIEN_DAP_AN_CHO_HOC_SINH: false
};
