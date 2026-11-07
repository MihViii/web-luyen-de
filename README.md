# Phòng Luyện Đề

Trang web để học sinh chọn đề, làm bài có đếm giờ, nộp bài và xem điểm ngay. Kết quả tự ghi vào Google Sheet của gia sư, kèm trang thống kê có mật khẩu, trong đó gia sư mở được bài làm của từng học sinh để xem sai câu nào.

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
├── tao-de.html         Trang tạo đề từ file PDF (cho gia sư)
├── css/
│   └── style.css       Toàn bộ giao diện (màu, font, bố cục)
├── js/
│   ├── config.js       Cấu hình: link Apps Script, tên lớp   ← SỬA FILE NÀY
│   ├── cham-diem.js    Logic chấm điểm (hàm thuần, không đụng giao diện)
│   ├── xem-lai.js      Vẽ phần xem lại từng câu (dùng chung cho trang học sinh và thống kê)
│   ├── kho-de.js       Đọc/ghi Kho đề (thư mục đề ở trang admin)
│   ├── tai-de.js       Nạp các file đề theo danh sách
│   ├── app.js          Điều khiển trang học sinh
│   ├── admin.js        Điều khiển trang thống kê
│   └── tao-de.js       Cắt câu từ PDF, xuất thư mục đề
├── de-thi/             Ngân hàng đề, mỗi đề một thư mục      ← THÊM ĐỀ Ở ĐÂY
│   ├── danh-sach.js    Liệt kê các đề đang dùng
│   ├── kho-de.js       Xếp đề vào thư mục (sửa bằng trang admin)
│   └── toan/
│       └── de-khoi-dong-so-11/
│           ├── de.js   Nội dung đề
│           ├── de.pdf  File PDF cho học sinh tải (đề tạo từ PDF)
│           └── *.png   Ảnh của đề
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

### Xem bài làm của từng học sinh

Mở `admin.html`, nhập mật khẩu, bấm **Tải kết quả**, rồi bấm vào một dòng (hoặc nút **Xem bài**) trong bảng điểm. Trang hiện:

- Điểm từng phần và một lưới ô số câu tô màu: xanh là đúng, đỏ là sai, vàng là đúng một phần (Phần II), trắng là bỏ trống. Rê chuột lên ô để xem học sinh chọn gì, bấm vào ô để nhảy tới câu đó.
- Từng câu kèm ảnh/đề bài: ô đỏ là phương án học sinh chọn sai, ô xanh là đáp án. Phần II, III ghi rõ học sinh trả lời gì và đáp án là gì. Nút **Chỉ câu sai** ẩn các câu làm đúng.
- Nút **Bài trước / Bài sau** đi lần lượt theo đúng thứ tự và bộ lọc đang chọn trong bảng (vd lọc một đề, sắp theo tên để xem hết cả lớp). Nút Back của trình duyệt/điện thoại quay về bảng điểm.

Bài làm được **chấm lại theo đáp án hiện tại trong `de.js`**. Nếu bạn sửa đáp án sau khi học sinh đã nộp, trang ghi chú điểm lúc nộp bên cạnh để bạn biết.

> Bản Code.gs cũ không gửi bài làm về trang thống kê. Nếu bấm Xem bài mà báo "Máy chủ chưa gửi bài làm về", hãy mở Apps Script, trong hàm `doGet` thêm dấu phẩy vào cuối dòng `chiTiet: docJson(r[12])` rồi thêm ngay bên dưới dòng `baiLam: docJson(r[13])`, sau đó triển khai phiên bản mới như trên. Đừng dán đè cả file `Code.gs` trong máy lên, vì file đó để mật khẩu mẫu `doi-mat-khau-nay` (nếu lỡ dán thì sửa lại `MAT_KHAU`). Các bài nộp từ trước vẫn xem được, vì bài làm vẫn luôn được lưu ở cột **Bài làm** trong Sheet.

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

### Gửi link riêng từng đề

Mỗi đề có một link riêng dạng `https://<tên-github>.github.io/phong-luyen-de/?de=<id đề>`. Học sinh mở link là vào thẳng đề đó, nút "Chọn đề khác" bị ẩn nên không làm nhầm đề.

- Lấy link: mở `admin.html`, trong mục **Kho đề** mở thư mục (hoặc gõ tên đề vào ô tìm), bấm **Sao chép** cạnh đề cần gửi. Không cần mật khẩu.
- Đề phải được push lên GitHub rồi thì link mới dùng được.
- Link chung (không có `?de=`) vẫn hiện đủ danh sách đề như cũ.
- Link nhận đề theo `id`, nên đã gửi link rồi thì đừng đổi `id` của đề. Đề bị ẩn khỏi `danh-sach.js` thì link báo "Link này không đúng hoặc đề đã bị ẩn".

### Kho đề: cây thư mục đề

Mục **Kho đề** ở đầu trang admin xếp đề thành **cây thư mục**: thư mục chứa được thư mục con (bao nhiêu tầng cũng được), vd `Toán 12 / Chương 1 / Bài 1`. Bấm vào thư mục để mở ra thư mục con và đề bên trong. **Trang học sinh cũng hiện đúng cây này** (thư mục đóng sẵn, bấm để mở); đề chưa xếp vào thư mục nào hiện ở nhóm "Đề khác".

- **Khi tạo đề:** ở trang Tạo đề từ PDF, gõ hoặc chọn **Thư mục trong Kho đề**. Thư mục con viết cách nhau bằng dấu `/`, vd `Toán 12 / Chương 2`; thư mục nào chưa có thì tự tạo. Bỏ trống thì đề vào mục "Chưa xếp thư mục".
- **Sắp xếp lại:** bấm **Sắp xếp thư mục**:
  - **+ Thư mục mới** (ngoài cùng), **+ Thư mục con** (bên trong một thư mục), đổi tên trong ô tên.
  - Ô **Nằm trong**: đưa cả thư mục (kèm mọi thứ bên trong) vào thư mục khác hoặc ra ngoài cùng. ↑ ↓: đổi thứ tự thư mục.
  - Ô bên phải mỗi đề: chuyển đề sang thư mục khác. ↑ ↓: đổi thứ tự đề.
  - **Xóa**: thư mục con và đề bên trong được đưa ra thư mục cha (xóa thư mục ngoài cùng thì đề thành "Chưa xếp"), không mất gì.
  - Xong bấm **Lưu vào thư mục project**, chọn thư mục `web-luyen-de`, rồi push lên GitHub. Bấm **Hủy** thì bỏ hết thay đổi.
- **Link cả thư mục:** mở thư mục trong Kho đề, dòng **Cả thư mục** (tô xanh) có link dạng `.../?thu-muc=<mã>`. Học sinh mở link này chỉ thấy thư mục đó (gồm thư mục con và đề), làm xong một đề thì bấm **Chọn đề khác** để làm tiếp. Thêm đề vào thư mục rồi push thì học sinh mở lại link là thấy đề mới.
- Mỗi thư mục có một **mã** cố định (vd `chuong-1`, tạo từ tên lúc lập thư mục). Link thư mục đi theo mã, nên đổi tên hay chuyển thư mục sang chỗ khác thì link đã gửi vẫn dùng được; xóa thư mục thì link báo "thư mục đã bị xóa".
- Cây lưu trong `de-thi/kho-de.js`, nên máy nào mở trang (sau khi push) cũng thấy giống nhau. Đổi thư mục không làm đổi link riêng của đề.

## 5. Thêm đề mới

Có hai cách: **tạo từ file PDF** (nhanh, không phải gõ đề) hoặc **gõ tay** (gõ công thức LaTeX, có lời giải từng câu).

### Cách 1: Tạo đề từ PDF

Mỗi câu là một ảnh cắt từ PDF, học sinh xem ảnh rồi chọn đáp án trên phiếu. File PDF được lưu kèm, học sinh bấm **Tải đề (PDF)** ở đầu bài làm để xem cho dễ. Nút này chỉ hiện sau khi bấm **Bắt đầu làm bài** (đồng hồ đã chạy), để học sinh không tải về làm trước rồi mới vào điền đáp án.

1. Mở `admin.html` (trên máy hoặc trên GitHub Pages), bấm **Tạo đề từ PDF**. Nên dùng **Chrome hoặc Edge**.
2. Nhập môn, tên đề, thời gian. Trang hiện sẵn thư mục sẽ lưu, vd `de-thi/toan/de-thi-thu-so-2/`.
3. Chọn file PDF. **File này học sinh tải về được, nên đừng để đáp án trong đó.**
4. Chọn **Phần I** ở cột phải, kéo chuột khoanh từng câu trên trang PDF theo thứ tự (khoanh cả phương án A–D), rồi bấm chọn đáp án ngay dưới ảnh mỗi câu. Làm tiếp với Phần II (chọn Đ/S cho 4 ý) và Phần III (gõ số).
   - Câu bị ngắt sang trang sau: bấm **Nối vùng** ở câu đó rồi khoanh nốt phần còn lại, hai vùng được ghép thành một ảnh.
   - Khoanh sai: bấm **Xóa** rồi khoanh lại.
5. Bấm **Lưu đề**, chọn thư mục `web-luyen-de` trên máy, bấm **Cho phép** khi Chrome hỏi quyền sửa. Trang tự tạo thư mục đề (ảnh `p1-01.png`..., `de.pdf`, `de.js`) và thêm đề vào `de-thi/danh-sach.js`.
6. Mở trang học sinh trên máy xem thử, rồi **commit và push** lên GitHub.

> Safari/Firefox không cho trang web ghi thẳng vào thư mục, nên sẽ tải về một file `.zip`: giải nén, chép thư mục đề vào `de-thi/<môn>/` và tự thêm dòng vào `danh-sach.js` như hướng dẫn hiện trên trang.

Muốn sửa đáp án sau khi lưu: mở `de.js` của đề đó, đổi giá trị `dapAn`. Trang tạo đề chạy hoàn toàn trên máy, file PDF không bị gửi lên mạng.

### Cách 2: Gõ tay

Mỗi đề là một thư mục trong `de-thi/`, chia theo môn (`toan/`, `ly/`, `hoa/`... tùy ý đặt):

1. Tạo thư mục mới, vd `de-thi/toan/de-02`, trong đó tạo file `de.js` theo mẫu:
   ```js
   themDe({
     id: "toan-de-02",
     mon: "Toán",
     ten: "Đề luyện tập số 2",
     moTa: "Ôn tập đạo hàm, tích phân",
     thoiGian: 90, // phút
     diemPhan1: 0.25,
     diemPhan3: 0.5,

     phan1: [
       {
         noiDung: "Họ nguyên hàm của hàm số $f(x) = 3x^2$ là",
         luaChon: ["$x^3 + C$", "$6x + C$", "$\\dfrac{x^3}{3} + C$", "$3x^3 + C$"],
         dapAn: "A",
         loiGiai: "$\\int 3x^2\\,dx = x^3 + C$." // không bắt buộc
       }
     ],

     phan2: [
       {
         noiDung: "Cho hàm số $f(x) = x^3 - 3x^2 + 2$.",
         y: [
           { noiDung: "$f'(x) = 3x^2 - 6x$.", dapAn: true },
           { noiDung: "Hàm số đồng biến trên $(0; 2)$.", dapAn: false },
           { noiDung: "Giá trị cực tiểu bằng $-2$.", dapAn: true },
           { noiDung: "$f(3) = 2$.", dapAn: true }
         ]
       }
     ],

     phan3: [
       { noiDung: "Tính $\\displaystyle\\int_1^2 (2x + 1)\\,dx$.", dapAn: 4 }
     ]
   });
   ```
2. Sửa thông tin và câu hỏi (xem bên dưới). Mỗi phần thêm bao nhiêu câu cũng được, các câu cách nhau bằng dấu phẩy.
3. Mở `de-thi/danh-sach.js`, thêm một dòng đường dẫn thư mục mới:
   ```js
   const DANH_SACH_THU_MUC_DE = [
     "toan/de-khoi-dong-so-11",
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
- Dùng PNG hoặc JPG. Ảnh hiện trên trang **bằng nửa chiều rộng thật** để nét trên màn hình retina: ảnh ngang 1000px hiện rộng 500px. Ảnh chụp điện thoại nên cắt gọn và giảm còn khoảng 800–1200px, để học sinh dùng 4G tải nhanh.
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
                                                                             │
                                                     bấm một dòng ─► chamBai(de, baiLam) ─► xem lại từng câu
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
- **Chống XSS:** tên học sinh được escape (`anToan()`) trước khi đưa vào HTML. Bài làm đọc từ Sheet được lọc lại (`chuanHoaBaiLam()` trong `admin.js`) vì ai có link Apps Script cũng gửi dữ liệu lên được.
- **Dùng chung code xem lại:** `xem-lai.js` chứa `veXemLai()`, `veBangDiem()`, nên trang học sinh và trang thống kê hiện bài giống hệt nhau. Trang thống kê không lưu kết quả chấm sẵn mà chấm lại từ `baiLam` + đề hiện tại.
- **Bộ nhớ đệm (cache):** GitHub Pages cho trình duyệt giữ bản cũ của mỗi file tới 10 phút. Vì vậy `tai-de.js` nạp mọi file trong `de-thi/` kèm `?t=<thời điểm>` để lúc nào cũng lấy bản mới nhất (vừa push đề là link dùng được ngay). Còn `css/` và `js/` gắn số phiên bản `?v=...` trong 3 file HTML: **sửa code thì tăng số này ở cả 3 trang**, nếu không trình duyệt có thể ghép trang mới với CSS cũ (giao diện vỡ) cho tới khi bấm Cmd + Shift + R.
- **Nạp đề bằng thẻ `<script>`:** `tai-de.js` tạo thẻ `<script>` cho từng `de.js` trong danh sách (không dùng `fetch`, nên mở thẳng file `index.html` vẫn chạy). Mỗi `de.js` gọi `themDe()`, hàm này ghi nhớ thư mục của đề qua `document.currentScript` để tính đường dẫn ảnh.
- **Tạo đề từ PDF:** thư viện PDF.js vẽ từng trang ra `<canvas>`. Vùng khoanh lưu theo tỉ lệ 0–1 của trang nên không phụ thuộc trang đang hiện to hay nhỏ. Lúc lưu, `drawImage` cắt các vùng ra canvas mới rồi `toBlob` thành PNG. File được ghi thẳng vào thư mục project bằng **File System Access API** (`showDirectoryPicker`), trình duyệt không hỗ trợ thì đóng gói `.zip` bằng JSZip.

**Giới hạn cần biết:**

- Đáp án nằm trong các file `de.js` trên trình duyệt, học sinh rành công nghệ có thể mở xem. Muốn giấu đáp án thì phải chuyển việc chấm sang máy chủ (Apps Script hoặc backend Python), đây là hướng nâng cấp tiếp theo.
- Không có đăng nhập: học sinh tự nhập tên, nên có thể nhập sai/giả tên.
