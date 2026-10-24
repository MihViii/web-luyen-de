/* =====================================================================
   NGÂN HÀNG ĐỀ THI
   ---------------------------------------------------------------------
   Mỗi đề nằm trong một thư mục riêng, gồm file de.js và ảnh của đề đó:

     de-thi/
     ├── danh-sach.js      <- file này: liệt kê các đề đang dùng
     └── toan/
         ├── de-01/
         │   ├── de.js
         │   └── cau5.png
         └── de-02/
             └── de.js

   THÊM ĐỀ MỚI:
     1. Copy cả thư mục một đề có sẵn (vd toan/de-01 -> toan/de-02).
     2. Mở de.js trong thư mục mới, đổi "id" (KHÔNG được trùng đề khác),
        rồi sửa nội dung câu hỏi.
     3. Thêm đường dẫn thư mục vào DANH_SACH_THU_MUC_DE bên dưới.
   Muốn ẩn một đề: xóa (hoặc thêm // trước) dòng của nó ở bên dưới.
   ĐỪNG đổi "id" của đề đã có học sinh làm, vì bảng điểm nhận đề theo id.

   CÔNG THỨC TOÁN: viết bằng LaTeX, đặt giữa hai dấu $ ... $
   LƯU Ý: trong chuỗi JavaScript, dấu "\" phải viết thành "\\".
     Ví dụ muốn hiện  \frac{1}{2}  thì gõ  "$\\frac{1}{2}$"

   CẤU TRÚC MỘT ĐỀ:
     phan1: trắc nghiệm 4 lựa chọn  -> dapAn: "A" | "B" | "C" | "D"
     phan2: đúng/sai, mỗi câu 4 ý   -> mỗi ý có dapAn: true (Đúng) | false (Sai)
     phan3: trả lời ngắn            -> dapAn: một con số (dùng dấu chấm, vd 0.17)

   HÌNH ẢNH: bỏ file ảnh vào cùng thư mục với de.js, rồi thêm vào câu hỏi
     hinh: "cau5.png"     (câu nào không có hình thì bỏ dòng này)

   THANG ĐIỂM (theo quy chế thi tốt nghiệp THPT từ 2025):
     diemPhan1: điểm mỗi câu phần I    (Toán 0.25)
     diemPhan3: điểm mỗi câu phần III  (Toán 0.5, Lý/Hóa/Sinh 0.25)
     Phần II tính chung mọi môn: đúng 1 ý 0.1đ, 2 ý 0.25đ, 3 ý 0.5đ, 4 ý 1đ
   ===================================================================== */

// Đường dẫn tính từ thư mục de-thi. Thứ tự ở đây là thứ tự hiện trên trang.
const DANH_SACH_THU_MUC_DE = [
  "toan/de-01",
];
