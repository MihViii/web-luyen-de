/* Đề luyện tập số 1 · Toán
   Cách viết đề (cấu trúc, đáp án, công thức, hình): xem đầu file de-thi/danh-sach.js */

themDe({
  id: "toan-minh-hoa-01",
  mon: "Toán",
  ten: "Đề luyện tập số 1",
  moTa: "Ôn tập tổng hợp: đạo hàm, tích phân, Oxyz, xác suất",
  thoiGian: 90, // phút
  diemPhan1: 0.25,
  diemPhan3: 0.5,

  phan1: [
    {
      noiDung: "Họ nguyên hàm của hàm số $f(x) = 3x^2$ là",
      luaChon: ["$x^3 + C$", "$6x + C$", "$\\dfrac{x^3}{3} + C$", "$3x^3 + C$"],
      dapAn: "A",
      loiGiai: "$\\int 3x^2\\,dx = 3\\cdot\\dfrac{x^3}{3} + C = x^3 + C$."
    },
    {
      noiDung: "Giá trị của $\\displaystyle\\int_0^1 2x\\,dx$ bằng",
      luaChon: ["$2$", "$1$", "$\\dfrac{1}{2}$", "$0$"],
      dapAn: "B",
      loiGiai: "$\\int_0^1 2x\\,dx = x^2\\Big|_0^1 = 1 - 0 = 1$."
    },
    {
      noiDung: "Hàm số $y = x^3 - 3x + 1$ đạt cực đại tại",
      luaChon: ["$x = 1$", "$x = -1$", "$x = 0$", "$x = 3$"],
      dapAn: "B",
      loiGiai: "$y' = 3x^2 - 3 = 0 \\Leftrightarrow x = \\pm 1$. $y'$ đổi dấu từ $+$ sang $-$ khi đi qua $x = -1$ nên hàm số đạt cực đại tại $x = -1$."
    },
    {
      noiDung: "Tiệm cận đứng của đồ thị hàm số $y = \\dfrac{2x + 1}{x - 1}$ là đường thẳng",
      luaChon: ["$x = 1$", "$x = 2$", "$y = 2$", "$x = -1$"],
      dapAn: "A",
      loiGiai: "Mẫu bằng $0$ khi $x = 1$ và tử khác $0$ tại đó, nên tiệm cận đứng là $x = 1$. ($y = 2$ là tiệm cận ngang.)"
    },
    {
      noiDung: "Trong không gian $Oxyz$, cho $\\vec{a} = (1; 2; -2)$. Độ dài của $\\vec{a}$ bằng",
      luaChon: ["$9$", "$3$", "$\\sqrt{5}$", "$1$"],
      dapAn: "B",
      loiGiai: "$|\\vec{a}| = \\sqrt{1^2 + 2^2 + (-2)^2} = \\sqrt{9} = 3$."
    },
    {
      noiDung: "Trong không gian $Oxyz$, mặt phẳng $(P): 2x - y + 2z - 3 = 0$ có một vectơ pháp tuyến là",
      luaChon: ["$(2; 1; 2)$", "$(2; -1; 2)$", "$(-1; 2; -3)$", "$(2; -1; -3)$"],
      dapAn: "B",
      loiGiai: "Mặt phẳng $ax + by + cz + d = 0$ có vectơ pháp tuyến $(a; b; c) = (2; -1; 2)$."
    },
    {
      noiDung: "Cho cấp số cộng $(u_n)$ có $u_1 = 2$ và công sai $d = 3$. Giá trị của $u_5$ bằng",
      luaChon: ["$14$", "$17$", "$11$", "$15$"],
      dapAn: "A",
      loiGiai: "$u_5 = u_1 + 4d = 2 + 4\\cdot 3 = 14$."
    },
    {
      noiDung: "Tập nghiệm của bất phương trình $\\log_2 x < 3$ là",
      luaChon: ["$(0; 8)$", "$(-\\infty; 8)$", "$(8; +\\infty)$", "$(0; 9)$"],
      dapAn: "A",
      loiGiai: "Điều kiện $x > 0$. $\\log_2 x < 3 \\Leftrightarrow x < 2^3 = 8$. Vậy $S = (0; 8)$."
    },
    {
      noiDung: "Đạo hàm của hàm số $y = e^{2x}$ là",
      luaChon: ["$y' = e^{2x}$", "$y' = 2e^{2x}$", "$y' = \\dfrac{1}{2}e^{2x}$", "$y' = 2x\\,e^{2x-1}$"],
      dapAn: "B",
      loiGiai: "$(e^{u})' = u'\\,e^{u}$ với $u = 2x$, nên $y' = 2e^{2x}$."
    },
    {
      noiDung: "Trong không gian $Oxyz$, khoảng cách từ điểm $M(1; 2; 3)$ đến mặt phẳng $(Oxy)$ bằng",
      luaChon: ["$1$", "$2$", "$3$", "$\\sqrt{14}$"],
      dapAn: "C",
      loiGiai: "Mặt phẳng $(Oxy)$ có phương trình $z = 0$, nên khoảng cách bằng $|z_M| = 3$."
    },
    {
      noiDung: "Gieo một con xúc xắc cân đối và đồng chất một lần. Xác suất để xuất hiện mặt có số chấm chẵn là",
      luaChon: ["$\\dfrac{1}{6}$", "$\\dfrac{1}{3}$", "$\\dfrac{1}{2}$", "$\\dfrac{2}{3}$"],
      dapAn: "C",
      loiGiai: "Có 3 mặt chẵn (2, 4, 6) trên tổng 6 mặt, nên $P = \\dfrac{3}{6} = \\dfrac{1}{2}$."
    },
    {
      noiDung: "Cho hai biến cố độc lập $A$, $B$ với $P(A) = 0{,}4$ và $P(B) = 0{,}5$. Xác suất $P(AB)$ bằng",
      luaChon: ["$0{,}9$", "$0{,}2$", "$0{,}1$", "$0{,}45$"],
      dapAn: "B",
      loiGiai: "$A, B$ độc lập nên $P(AB) = P(A)\\cdot P(B) = 0{,}4 \\cdot 0{,}5 = 0{,}2$."
    }
  ],

  phan2: [
    {
      noiDung: "Cho hàm số $f(x) = x^3 - 3x^2 + 2$.",
      y: [
        { noiDung: "$f'(x) = 3x^2 - 6x$.", dapAn: true },
        { noiDung: "Hàm số đồng biến trên khoảng $(0; 2)$.", dapAn: false },
        { noiDung: "Giá trị cực tiểu của hàm số bằng $-2$.", dapAn: true },
        { noiDung: "Giá trị lớn nhất của $f(x)$ trên đoạn $[-1; 3]$ bằng $2$.", dapAn: true }
      ],
      loiGiai: "a) Đúng. b) Sai: $f'(x) < 0$ trên $(0; 2)$ nên hàm số nghịch biến. c) Đúng: $f(2) = 8 - 12 + 2 = -2$. d) Đúng: $f(-1) = -2$, $f(0) = 2$, $f(2) = -2$, $f(3) = 2$, nên GTLN là $2$."
    },
    {
      noiDung: "Trong không gian $Oxyz$, cho ba điểm $A(1; 0; 0)$, $B(0; 2; 0)$, $C(0; 0; 3)$.",
      y: [
        { noiDung: "$\\overrightarrow{AB} = (-1; 2; 0)$.", dapAn: true },
        { noiDung: "Mặt phẳng $(ABC)$ có phương trình $\\dfrac{x}{1} + \\dfrac{y}{2} + \\dfrac{z}{3} = 1$.", dapAn: true },
        { noiDung: "Trung điểm của đoạn $AB$ là $M(1; 2; 0)$.", dapAn: false },
        { noiDung: "Khoảng cách từ $O$ đến mặt phẳng $(ABC)$ bằng $\\dfrac{6}{7}$.", dapAn: true }
      ],
      loiGiai: "a) Đúng. b) Đúng (phương trình đoạn chắn). c) Sai: trung điểm là $\\left(\\tfrac{1}{2}; 1; 0\\right)$. d) Đúng: $(ABC): 6x + 3y + 2z - 6 = 0$, $d = \\dfrac{6}{\\sqrt{36 + 9 + 4}} = \\dfrac{6}{7}$."
    },
    {
      noiDung: "Một hộp có 5 viên bi đỏ và 3 viên bi xanh. Lấy ngẫu nhiên lần lượt 2 viên bi, không hoàn lại.",
      y: [
        { noiDung: "Xác suất lần thứ nhất lấy được bi đỏ là $\\dfrac{5}{8}$.", dapAn: true },
        { noiDung: "Xác suất lần thứ hai lấy được bi đỏ, biết lần thứ nhất lấy được bi đỏ, là $\\dfrac{4}{7}$.", dapAn: true },
        { noiDung: "Xác suất cả hai viên đều là bi đỏ bằng $\\dfrac{25}{64}$.", dapAn: false },
        { noiDung: "Xác suất lần thứ hai lấy được bi xanh bằng $\\dfrac{3}{8}$.", dapAn: true }
      ],
      loiGiai: "a) Đúng. b) Đúng: còn 4 đỏ trên 7 bi. c) Sai: $\\dfrac{5}{8}\\cdot\\dfrac{4}{7} = \\dfrac{5}{14}$. d) Đúng: $\\dfrac{5}{8}\\cdot\\dfrac{3}{7} + \\dfrac{3}{8}\\cdot\\dfrac{2}{7} = \\dfrac{21}{56} = \\dfrac{3}{8}$."
    },
    {
      noiDung: "Một vật chuyển động với vận tốc $v(t) = 3t^2 + 2$ (m/s), trong đó $t$ là thời gian tính bằng giây.",
      y: [
        { noiDung: "Gia tốc của vật tại thời điểm $t = 1$ là $6$ m/s².", dapAn: true },
        { noiDung: "Quãng đường vật đi được từ $t = 0$ đến $t = 2$ là $10$ m.", dapAn: false },
        { noiDung: "Vận tốc của vật tại thời điểm $t = 2$ là $14$ m/s.", dapAn: true },
        { noiDung: "Vận tốc trung bình của vật trong khoảng $[0; 2]$ là $7$ m/s.", dapAn: false }
      ],
      loiGiai: "a) Đúng: $a(t) = v'(t) = 6t$, $a(1) = 6$. b) Sai: $s = \\int_0^2 (3t^2 + 2)\\,dt = (t^3 + 2t)\\Big|_0^2 = 12$ m. c) Đúng: $v(2) = 14$. d) Sai: $v_{tb} = \\dfrac{12}{2} = 6$ m/s."
    }
  ],

  phan3: [
    {
      noiDung: "Tính tích phân $\\displaystyle I = \\int_1^2 (2x + 1)\\,dx$.",
      dapAn: 4,
      loiGiai: "$I = (x^2 + x)\\Big|_1^2 = 6 - 2 = 4$."
    },
    {
      noiDung: "Cho cấp số nhân $(u_n)$ có $u_1 = 3$ và công bội $q = 2$. Tính tổng 5 số hạng đầu tiên.",
      dapAn: 93,
      loiGiai: "$S_5 = u_1\\cdot\\dfrac{q^5 - 1}{q - 1} = 3\\cdot\\dfrac{32 - 1}{1} = 93$."
    },
    {
      noiDung: "Có bao nhiêu cách chọn ra 2 học sinh từ một nhóm gồm 6 học sinh?",
      dapAn: 15,
      loiGiai: "$C_6^2 = \\dfrac{6\\cdot 5}{2} = 15$."
    },
    {
      noiDung: "Tìm giá trị nhỏ nhất của hàm số $f(x) = x + \\dfrac{4}{x}$ trên khoảng $(0; +\\infty)$.",
      dapAn: 4,
      loiGiai: "Theo bất đẳng thức Cauchy: $x + \\dfrac{4}{x} \\ge 2\\sqrt{4} = 4$, dấu bằng khi $x = 2$."
    },
    {
      noiDung: "Trong không gian $Oxyz$, tính khoảng cách giữa hai điểm $A(1; 2; 3)$ và $B(3; 4; 4)$.",
      dapAn: 3,
      loiGiai: "$AB = \\sqrt{2^2 + 2^2 + 1^2} = \\sqrt{9} = 3$."
    },
    {
      noiDung: "Tính diện tích hình phẳng giới hạn bởi đồ thị hai hàm số $y = x^2$ và $y = x$ (làm tròn kết quả đến hàng phần trăm).",
      dapAn: 0.17,
      loiGiai: "Hoành độ giao điểm $x = 0$, $x = 1$. $S = \\int_0^1 (x - x^2)\\,dx = \\dfrac{1}{2} - \\dfrac{1}{3} = \\dfrac{1}{6} \\approx 0{,}17$."
    }
  ]
});
