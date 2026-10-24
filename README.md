# Phòng Luyện Đề

Trang web để học sinh chọn đề, làm bài có đếm giờ, nộp bài và xem điểm ngay. Kết quả tự ghi vào Google Sheet của gia sư, kèm trang thống kê có mật khẩu.

Cấu trúc đề theo kỳ thi tốt nghiệp THPT từ 2025:

| Phần | Dạng câu hỏi | Cách chấm (môn Toán) |
|---|---|---|
| I | Trắc nghiệm 4 lựa chọn | 0,25 điểm/câu |
| II | Đúng/Sai, mỗi câu 4 ý | Đúng 1 ý 0,1 · 2 ý 0,25 · 3 ý 0,5 · 4 ý 1 điểm |
| III | Trả lời ngắn (điền số) | 0,5 điểm/câu |

---

## 1. Tổ chức thư mục

```
web-luyen-de/
├── index.html          Trang học sinh (khung HTML của 4 màn hình)
├── admin.html          Trang thống kê cho gia sư
├── css/
│   └── style.css       Toàn bộ giao diện (màu, font, bố cục)
├── js/
│   ├── config.js       Cấu hình: link Apps Script, tên lớp   ← SỬA FILE NÀY
│   ├── cham-diem.js    Logic chấm điểm (hàm thuần, không đụng giao diện)
│   ├── tai-de.js       Nạp các file đề theo danh sách
│   ├── app.js          Điều khiển trang học sinh
│   └── admin.js        Điều khiển trang thống kê
├── de-thi/             Ngân hàng đề, mỗi đề một thư mục      ← THÊM ĐỀ Ở ĐÂY
│   ├── danh-sach.js    Liệt kê các đề đang dùng
│   └── toan/
│       └── de-01/
│           ├── de.js   Nội dung đề
│           └── *.png   Ảnh của đề (nếu có)
└── apps-script/
    └── Code.gs         Code dán vào Google Apps Script (máy chủ lưu kết quả)
```

Nguyên tắc chia file: **dữ liệu** (đề thi), **logic** (chấm điểm), **giao diện** (app.js, style.css) và **cấu hình** nằm riêng. Muốn thêm đề thì chỉ làm trong thư mục `de-thi`, không cần đụng code.

---

## 2. Chạy thử trên máy (MacBook)

1. Mở thư mục `web-luyen-de` bằng VS Code.
2. Cài extension **Live Server** (của Ritwick Dey).
3. Chuột phải vào `index.html` → **Open with Live Server**. Trình duyệt tự mở trang.

Lúc này trang chạy ở **chế độ thử**: làm bài, chấm điểm bình thường, chỉ là chưa lưu kết quả.

---

## 3. Kết nối Google Sheet để lưu kết quả

1. Vào [sheets.new](https://sheets.new) tạo một Google Sheet mới, đặt tên ví dụ "Kết quả luyện đề".
2. Menu **Tiện ích mở rộng → Apps Script**.
3. Xóa hết code mẫu, dán toàn bộ nội dung file `apps-script/Code.gs`.
4. Sửa dòng `const MAT_KHAU = "doi-mat-khau-nay";` thành mật khẩu của bạn. Bấm biểu tượng lưu.
5. Bấm **Triển khai (Deploy) → Tùy chọn triển khai mới (New deployment)**:
   - Bấm bánh răng → chọn **Ứng dụng web (Web app)**.
   - **Thực thi dưới tên (Execute as):** Tôi (tài khoản của bạn).
   - **Người có quyền truy cập (Who has access):** Bất kỳ ai (Anyone).
   - Bấm **Triển khai**, cấp quyền cho tài khoản Google (nếu hiện cảnh báo "Google chưa xác minh ứng dụng" thì bấm **Nâng cao → Đi tới ... (không an toàn)**, đây là script của chính bạn).
6. Copy **URL ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`).
7. Mở `js/config.js`, dán vào:
   ```js
   LINK_APPS_SCRIPT: "https://script.google.com/macros/s/.../exec",
   ```

Thử làm một bài và nộp: trong Sheet sẽ xuất hiện trang tính **KetQua** với một dòng mới.

> Mỗi lần **sửa Code.gs**, phải vào **Triển khai → Quản lý các bản triển khai → sửa (bút chì) → Phiên bản: Phiên bản mới → Triển khai** thì thay đổi mới có hiệu lực. Link giữ nguyên.

---

## 4. Đưa lên mạng miễn phí (GitHub Pages)

1. Tạo tài khoản [github.com](https://github.com) nếu chưa có.
2. Tạo repository mới, ví dụ `phong-luyen-de`, chọn **Public**.
3. Bấm **uploading an existing file**, kéo thả toàn bộ nội dung thư mục `web-luyen-de` vào (giữ nguyên cấu trúc thư mục con), bấm **Commit changes**.
4. Vào **Settings → Pages**, mục **Branch** chọn `main`, thư mục `/ (root)`, bấm **Save**.
5. Đợi 1–2 phút, link t˝rang sẽ là:
   - Học sinh: `https://<tên-github>.github.io/phong-luyen-de/`
   - Gia sư: `https://<tên-github>.github.io/phong-luyen-de/admin.html`

Sau này thêm đề: upload thư mục đề mới (giữ đúng vị trí trong `de-thi/`) và file `de-thi/danh-sach.js` đã sửa lên GitHub.

---

## 5. Thêm đề mới

Mỗi đề là một thư mục trong `de-thi/`, chia theo môn (`toan/`, `ly/`, `hoa/`... tùy ý đặt):

1. Copy cả thư mục một đề có sẵn, vd `de-thi/toan/de-01` → `de-thi/toan/de-02`.
2. Mở `de.js` trong thư mục mới và sửa (xem bên dưới).
3. Mở `de-thi/danh-sach.js`, thêm một dòng đường dẫn thư mục mới:
   ```js
   const DANH_SACH_THU_MUC_DE = [
     "toan/de-01",
     "toan/de-02",
   ];
   ```
   Thứ tự trong danh sách là thứ tự hiện trên trang. Muốn tạm ẩn một đề thì thêm `//` trước dòng của nó.

Trong `de.js` cần sửa:

- `id`: mã đề, **không được trùng** (vd `"toan-de-02"`). Đề đã có học sinh làm thì **đừng đổi id**, vì bảng điểm nhận đề theo id.
- `mon`, `ten`, `moTa`, `thoiGian` (phút).
- `diemPhan1`, `diemPhan3`: Toán là 0.25 và 0.5. Lý/Hóa/Sinh thường là 0.25 và 0.25.
- Câu hỏi các phần.

**Công thức Toán** viết LaTeX giữa hai dấu `$`. Trong file JavaScript, mỗi dấu `\` phải gõ thành `\\`:

| Muốn hiện | Gõ trong file |
|---|---|
| ½ (phân số) | `"$\\dfrac{1}{2}$"` |
| căn x | `"$\\sqrt{x}$"` |
| tích phân 0→1 | `"$\\displaystyle\\int_0^1 f(x)\\,dx$"` |
| vectơ AB | `"$\\overrightarrow{AB}$"` |
| số thập phân 0,5 | `"$0{,}5$"` |

**Đáp án phần III** là con số, dùng dấu chấm: `dapAn: 0.17`. Học sinh gõ `0,17` hay `0.17` đều được tính đúng.

**Câu có hình** (đồ thị, bảng biến thiên, hình không gian): bỏ ảnh vào **cùng thư mục với `de.js`** của đề đó, rồi thêm dòng `hinh` vào câu hỏi. Hình hiện dưới đề bài, cả lúc làm bài lẫn lúc xem lại.

```js
{
  noiDung: "Cho hàm số $y = f(x)$ có đồ thị như hình bên. Hàm số đồng biến trên khoảng nào?",
  hinh: "cau5.png",
  luaChon: ["$(-1; 1)$", "$(1; +\\infty)$", "$(-\\infty; 0)$", "$(0; 2)$"],
  dapAn: "B"
}
```

- Tên file nên viết **không dấu, không khoảng trắng** (`cau5.png`, không phải `Câu 5.png`), và gõ đúng hoa/thường: GitHub Pages phân biệt `Cau5.png` với `cau5.png`.
- Dùng PNG hoặc JPG, ngang khoảng 800–1200px là đủ nét. Ảnh chụp điện thoại nên cắt gọn và giảm dung lượng trước, để học sinh dùng 4G tải nhanh.
- Hình trong đáp án A/B/C/D hoặc lời giải thì gõ thẻ ảnh với đường dẫn đầy đủ: `"<img class=\"hinh-de\" src=\"de-thi/toan/de-02/cau5-a.png\">"`.

> Nếu thêm đề xong mà đề không hiện: mở **Inspect → Console** (Cmd + Option + I) để xem lỗi. Thường gặp: gõ sai đường dẫn trong `danh-sach.js` ("Không tìm thấy file đề"), trùng `id`, hoặc trong `de.js` thiếu dấu phẩy, thiếu `}`, quên gõ `\\`.

---

## 6. Cách hoạt động (để vấn đáp)

**Luồng dữ liệu:**

```
Học sinh chọn đề ─► nhập tên ─► làm bài (lưu tạm vào localStorage)
                                     │
                         nộp bài / hết giờ
                                     ▼
                   cham-diem.js: chamBai(de, baiLam)
                                     │
               ┌─────────────────────┴─────────────────────┐
               ▼                                           ▼
     Hiện điểm + xem lại câu sai             fetch POST ─► Apps Script doPost
                                                           ─► thêm dòng vào Sheet
                                                                    │
            admin.html ─► fetch GET (kèm mật khẩu) ─► doGet ─► trả JSON ─► bảng thống kê
```

**Các điểm kỹ thuật chính:**

- **Single Page Application đơn giản:** 4 màn là 4 `<section>`, chỉ bật/tắt thuộc tính `hidden`, không tải lại trang.
- **State tập trung:** biến `trangThai` trong `app.js` giữ đề đang làm, bài làm, thời gian.
- **Đồng hồ:** lưu thời điểm hết giờ (`hetGio`) thay vì đếm lùi từng giây, nên dù tab bị treo hay tải lại trang thời gian vẫn đúng. Hết giờ thì gọi `nopBai(true)`.
- **Chống mất bài:** mỗi lần chọn đáp án, bài làm được lưu vào `localStorage`. Tải lại trang sẽ mở lại đúng bài đang làm.
- **Chấm điểm là hàm thuần (pure function):** `chamBai(de, baiLam)` không phụ thuộc giao diện, nên có thể chạy thử độc lập bằng Node.js.
- **So sánh số thực:** phần III dùng `Math.abs(a - b) < 1e-9` vì máy tính tính `0.1 + 0.2 = 0.30000000000000004`.
- **CORS:** gửi dữ liệu với `Content-Type: text/plain` để trình duyệt không gửi request "preflight" mà Apps Script không hỗ trợ.
- **LockService** trong Apps Script: hai học sinh nộp cùng lúc không ghi đè nhau.
- **Chống XSS:** tên học sinh được escape (`anToan()`) trước khi đưa vào HTML.

**Giới hạn cần biết:**

- Đáp án nằm trong các file `de.js` trên trình duyệt, học sinh rành công nghệ có thể mở xem. Muốn giấu đáp án thì phải chuyển việc chấm sang máy chủ (Apps Script hoặc backend Python), đây là hướng nâng cấp tiếp theo.
- Không có đăng nhập: học sinh tự nhập tên, nên có thể nhập sai/giả tên.
