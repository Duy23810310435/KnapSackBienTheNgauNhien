using KnapSackBienTheNgauNhien.Models;
using Microsoft.AspNetCore.Mvc;

namespace KnapSackBienTheNgauNhien.Controllers
{
    public class KnapsackController : Controller
    {
        //lưu trữ tạm thời trong bộ nhớ
        public static List<VatPham> _danhSachVatPham = new List<VatPham>();
        public static int _sucChuaBaLo = 50;//sức chứa của balo

        //màn hình khởi tạo cho n = 10 vật phẩm (được cho các giá trị ngẫu nhiên)
        public IActionResult Index()
        {
            return View();
        }

        //Một khi đã chốt 10 vật phẩm, thì hệ thống sẽ kiểm tra danh sách NULL??
        //Nếu Danh sách OK và không NULL thì lưu trữ vật phẩm đã chốt từ JS gửi lên
        [HttpPost]
        public IActionResult LuuTruVatPham([FromBody] List<VatPham> danhSach)
        {
            if (danhSach != null && danhSach.Count > 0)
            {
                _danhSachVatPham = danhSach;
                return Ok(new { success = true });
            }
            //trả về kết quả lỗi 400 nếu dữ liệu không hợp lệ
            return BadRequest();
        }

        //Màn hình chơi (Kéo thả thủ công hoặc AI)
        //Đưa đến giao diện của Bước 2, tại đây sẽ có thêm 1 ngăn Balo đang rỗng túi của người chơi
        public IActionResult Game()
        {
            ViewBag.SucChua = _sucChuaBaLo;
            return View(_danhSachVatPham);
        }

        //
        // Thuật toán Random Search giải quyết bài toán KnapSack
        //
        [HttpPost]
        public IActionResult GiaiQuyetBangAI(int soLanLap = 10000)
        {
            // KHỞI TẠO THÔNG SỐ BÀI TOÁN
            int soLuong = _danhSachVatPham.Count;

            // Giá trị lớn nhất và kém nhất tìm được sau nhiều lần thử
            int giaTriTotNhat = 0;
            int giaTriKemNhat = int.MaxValue; // THÊM BIẾN LƯU MIN

            // Mảng nhị phân lưu phương án tốt nhất
            int[] phuongAnTotNhat = new int[soLuong];
            Random rnd = new Random();

            // VÒNG LẶP CHÍNH (KHÁM PHÁ NGẪU NHIÊN)
            for (int i = 0; i < soLanLap; i++)
            {
                int[] phuongAnHienTai = new int[soLuong];
                int tongTrongLuong = 0;
                int tongGiaTri = 0;

                // XÁO TRỘN THỨ TỰ VẬT PHẨM
                List<int> danhSachIndex = Enumerable.Range(0, soLuong)
                                                    .OrderBy(x => rnd.Next())
                                                    .ToList();

                // XÂY DỰNG NGHIỆM (GREEDY NGẪU NHIÊN)
                foreach (int j in danhSachIndex)
                {
                    if (tongTrongLuong + _danhSachVatPham[j].TrongLuong <= _sucChuaBaLo)
                    {
                        phuongAnHienTai[j] = 1;
                        tongTrongLuong += _danhSachVatPham[j].TrongLuong;
                        tongGiaTri += _danhSachVatPham[j].GiaTri;
                    }
                }

                // CẬP NHẬT NGHIỆM TỐT NHẤT VÀ KÉM NHẤT
                if (tongGiaTri > giaTriTotNhat)
                {
                    giaTriTotNhat = tongGiaTri;
                    Array.Copy(phuongAnHienTai, phuongAnTotNhat, soLuong);
                }

                // Cập nhật giá trị Min
                if (tongGiaTri < giaTriKemNhat)
                {
                    giaTriKemNhat = tongGiaTri;
                }
            }

            // TRẢ VỀ CHUỖI JSON ĐÃ BAO GỒM MIN VÀ MAX
            return Ok(new
            {
                boGen = phuongAnTotNhat,
                minVal = giaTriKemNhat,
                maxVal = giaTriTotNhat
            });
        }


        // Thuật toán Genetic Algorithm (GA) giải quyết bài toán KnapSack - MAX POWER POTENTIAL
        // Biến thể GA hybrid
        /*
         TÓM TẮT “TƯ DUY AI” CỦA BẢN MAX POWER
            - Không chỉ tìm nghiệm tốt → mà còn:
            - Giữ nghiệm tốt (Elitism)
            - Sửa nghiệm sai (Repair)
            - Cải thiện nghiệm (Local Search)
            - Tránh kẹt (Mutation)
            - Dừng thông minh (Early Stop)

             GA hybrid là sự kết hợp của:
                - Genetic Algorithm
                - Greedy
                - Local Optimization
                - Heuristic Repair
         */
        [HttpPost]
        public IActionResult GiaiQuyetBangGA()
        {
            // Lấy số lượng vật phẩm hiện có
            int soLuong = _danhSachVatPham.Count;

            // Trường hợp không có dữ liệu → trả về rỗng
            if (soLuong == 0) return Ok(new { boGen = new int[0], minVal = 0, maxVal = 0 });

            //  
            // 1. CẤU HÌNH THAM SỐ KHỔNG LỒ (ÉP GA PHẢI NGHĨ SÂU HƠN)
            //  

            // Kích thước quần thể tăng mạnh → tăng độ đa dạng lời giải
            // Số lượng cá thể càng lớn → khả năng bao phủ không gian nghiệm càng rộng
            int kichThuocQuanThe = soLuong <= 100 ? 500 : (soLuong <= 1000 ? 1000 : 2000);

            // Số thế hệ tối đa → tăng khả năng tiến hóa lâu dài
            // Cho phép thuật toán có đủ thời gian “leo dốc” tới nghiệm tối ưu
            int soTheHeToida = soLuong <= 100 ? 2000 : (soLuong <= 1000 ? 5000 : 10000);

            // Early stopping nâng cấp:
            // Chỉ dừng khi KHÔNG cải thiện trong rất nhiều thế hệ liên tiếp
            int maxTheHeKhongDoi = soLuong <= 100 ? 300 : 1000;

            // Tỷ lệ đột biến thích ứng:
            // - Bài toán nhỏ → mutation cao hơn
            // - Bài toán lớn → mutation nhỏ lại để ổn định
            double tyLeDotBien = Math.Max(0.01, Math.Min(0.05, 2.0 / soLuong));

            // Bộ đếm thời gian thực → tránh việc thuật toán chạy vô hạn
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            int maxThoiGianSuyNghiMs = 120000; // 2 phút

            //
            // HÀM FITNESS (ĐÁNH GIÁ CÁ THỂ)
            //
            int TinhFitness(int[] gen, out int tongTrongLuong)
            {
                int tongGiaTri = 0;
                tongTrongLuong = 0;

                // Duyệt từng gene → mỗi gene tương ứng 1 vật phẩm
                for (int i = 0; i < soLuong; i++)
                {
                    if (gen[i] == 1)
                    {
                        tongTrongLuong += _danhSachVatPham[i].TrongLuong;
                        tongGiaTri += _danhSachVatPham[i].GiaTri;
                    }
                }

                // KHÁC BIỆT QUAN TRỌNG:
                // Fitness trả về là TRỌNG LƯỢNG (không phải giá trị)
                // → dùng để kiểm soát constraint trước
                return tongTrongLuong;
            }

            //  
            // 2. KHỞI TẠO QUẦN THỂ BAN ĐẦU
            //  

            // Mỗi cá thể gồm:
            // - Gen (mảng 0/1)
            // - Fitness (giá trị đánh giá)
            List<(int[] Gen, int Fitness)> quanThe = new List<(int[], int)>(kichThuocQuanThe);

            Random rnd = new Random();

            // Lưu nghiệm tốt nhất và tệ nhất toàn cục
            int[] bestGenToanCuc = new int[soLuong];
            int bestFitnessToanCuc = 0;
            int worstFitnessToanCuc = int.MaxValue;

            //
            // SINH QUẦN THỂ BAN ĐẦU THEO KIỂU GREEDY NGẪU NHIÊN
            //
            for (int i = 0; i < kichThuocQuanThe; i++)
            {
                int[] gen = new int[soLuong];

                int tongTL = 0;
                int tongGT = 0;

                // Xáo trộn thứ tự vật phẩm → đảm bảo mỗi cá thể có cấu trúc khác nhau
                List<int> danhSachIndex = Enumerable.Range(0, soLuong)
                                                    .OrderBy(x => rnd.Next())
                                                    .ToList();

                // Nhặt vật phẩm theo thứ tự ngẫu nhiên nhưng vẫn đảm bảo không vượt quá sức chứa
                foreach (int idx in danhSachIndex)
                {
                    if (tongTL + _danhSachVatPham[idx].TrongLuong <= _sucChuaBaLo)
                    {
                        gen[idx] = 1;
                        tongTL += _danhSachVatPham[idx].TrongLuong;
                        tongGT += _danhSachVatPham[idx].GiaTri;
                    }
                }

                // Lưu cá thể
                quanThe.Add((gen, tongGT));

                // Cập nhật best toàn cục
                if (tongGT > bestFitnessToanCuc)
                {
                    bestFitnessToanCuc = tongGT;
                    Array.Copy(gen, bestGenToanCuc, soLuong);
                }

                // Cập nhật worst toàn cục (để phân tích độ phân tán)
                if (tongGT < worstFitnessToanCuc) worstFitnessToanCuc = tongGT;
            }

            int soDoiKhongTienHoa = 0;

            // Số lượng elite = top 5%
            int soLuongElite = Math.Max(2, kichThuocQuanThe * 5 / 100);

            //  
            // 3. TIẾN HÓA SÂU VÀ TỐI ƯU HÓA CỤC BỘ
            //  

            for (int theHe = 0; theHe < soTheHeToida; theHe++)
            {
                List<(int[] Gen, int Fitness)> quanTheMoi = new List<(int[], int)>(kichThuocQuanThe);

                bool coDotPhaHienTai = false;

                //
                //   ELITISM: GIỮ LẠI NHỮNG CÁ THỂ TỐT NHẤT
                //
                // Sắp xếp giảm dần theo fitness
                quanThe = quanThe.OrderByDescending(x => x.Fitness).ToList();

                // Sao chép top 5% sang thế hệ mới
                for (int i = 0; i < soLuongElite; i++)
                {
                    int[] eliteGen = new int[soLuong];
                    Array.Copy(quanThe[i].Gen, eliteGen, soLuong);

                    quanTheMoi.Add((eliteGen, quanThe[i].Fitness));
                }

                //
                // SINH CÁ THỂ MỚI CHO PHẦN CÒN LẠI
                //
                for (int i = soLuongElite; i < kichThuocQuanThe; i++)
                {
                    //
                    //   TOURNAMENT SELECTION (k=3)
                    // → chọn cá thể mạnh nhất trong 3 ứng viên ngẫu nhiên
                    //
                    int[] ChonLoc()
                    {
                        var t1 = quanThe[rnd.Next(kichThuocQuanThe)];
                        var t2 = quanThe[rnd.Next(kichThuocQuanThe)];
                        var t3 = quanThe[rnd.Next(kichThuocQuanThe)];

                        if (t1.Fitness >= t2.Fitness && t1.Fitness >= t3.Fitness) return t1.Gen;
                        if (t2.Fitness >= t1.Fitness && t2.Fitness >= t3.Fitness) return t2.Gen;
                        return t3.Gen;
                    }

                    int[] cha = ChonLoc();
                    int[] me = ChonLoc();

                    //
                    //   UNIFORM CROSSOVER
                    // → mỗi gene được chọn ngẫu nhiên từ cha hoặc mẹ
                    //
                    int[] con = new int[soLuong];
                    for (int j = 0; j < soLuong; j++)
                        con[j] = (rnd.NextDouble() < 0.5) ? cha[j] : me[j];

                    //
                    //   MUTATION
                    // → lật bit với xác suất nhỏ
                    // → tạo đột phá, tránh kẹt local optimum
                    //
                    for (int j = 0; j < soLuong; j++)
                    {
                        if (rnd.NextDouble() < tyLeDotBien)
                            con[j] = 1 - con[j];
                    }

                    //
                    //   REPAIR (SỬA NGHIỆM)
                    // → đảm bảo không vượt quá sức chứa balo
                    //
                    int tlCon = TinhFitness(con, out _);

                    while (tlCon > _sucChuaBaLo)
                    {
                        int vutRandom = rnd.Next(0, soLuong);

                        if (con[vutRandom] == 1)
                        {
                            con[vutRandom] = 0;
                            tlCon -= _danhSachVatPham[vutRandom].TrongLuong;
                        }
                    }

                    //
                    //   LOCAL SEARCH (TỐI ƯU CỤC BỘ)
                    // → tận dụng khoảng trống còn lại trong balo
                    // → thử nhét thêm vật phẩm phù hợp
                    //
                    for (int loop = 0; loop < 10; loop++)
                    {
                        int thuNhet = rnd.Next(0, soLuong);

                        if (con[thuNhet] == 0 &&
                            tlCon + _danhSachVatPham[thuNhet].TrongLuong <= _sucChuaBaLo)
                        {
                            con[thuNhet] = 1;
                            tlCon += _danhSachVatPham[thuNhet].TrongLuong;
                        }
                    }

                    //
                    // TÍNH GIÁ TRỊ THỰC (Fitness thật)
                    //
                    int gtCon = 0;
                    for (int j = 0; j < soLuong; j++)
                        if (con[j] == 1) gtCon += _danhSachVatPham[j].GiaTri;

                    quanTheMoi.Add((con, gtCon));

                    //
                    // CẬP NHẬT NGHIỆM TỐT NHẤT
                    //
                    if (gtCon > bestFitnessToanCuc)
                    {
                        bestFitnessToanCuc = gtCon;
                        Array.Copy(con, bestGenToanCuc, soLuong);
                        coDotPhaHienTai = true;
                    }

                    //
                    // CẬP NHẬT NGHIỆM TỆ NHẤT (PHÂN TÍCH ĐỘ PHÂN TÁN)
                    //
                    if (gtCon < worstFitnessToanCuc)
                    {
                        worstFitnessToanCuc = gtCon;
                    }
                }

                // Chuyển sang thế hệ mới
                quanThe = quanTheMoi;

                //
                //   EARLY STOPPING
                //
                if (coDotPhaHienTai)
                    soDoiKhongTienHoa = 0;
                else
                    soDoiKhongTienHoa++;

                if (soDoiKhongTienHoa >= maxTheHeKhongDoi) break;

                // Giới hạn thời gian chạy
                if (stopwatch.ElapsedMilliseconds > maxThoiGianSuyNghiMs) break;
            }

            //
            // TRẢ KẾT QUẢ:
            // - boGen: nghiệm tốt nhất
            // - minVal: nghiệm tệ nhất (để đánh giá độ đa dạng)
            // - maxVal: nghiệm tốt nhất (giá trị tối đa)
            //
            return Ok(new { boGen = bestGenToanCuc, minVal = worstFitnessToanCuc, maxVal = bestFitnessToanCuc });
        }
    }
}