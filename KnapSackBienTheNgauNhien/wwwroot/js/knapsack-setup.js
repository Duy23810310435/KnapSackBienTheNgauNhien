let currentItems = [];
let isGenerating = false;

// KHAI BÁO MẢNG LƯU TRỮ CÁC TIMEOUT ĐỂ "DIỆT BÓNG MA" dư thừa khi chọn 50 vật phẩm, 500, 1,000....
let activeTimeouts = [];

//KHAI BÁO BIẾN AUDIO CONTEXT TOÀN CỤC
let audioCtx = null;
// 
// HÀM TẠO SỐ NGẪU NHIÊN DỰA TRÊN SEED (PRNG)
// JavaScript mặc định không có hàm Seed, nên cần tự viết một hàm thay thế
// Math.random(). Hàm này sẽ luôn trả về một chuỗi số y hệt nhau nếu Seed giống nhau.
// 
let currentSeed = 12345; // Giá trị Seed mặc định

function randomWithSeed() {
    let x = Math.sin(currentSeed++) * 10000;
    return x - Math.floor(x);
}
function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playTickSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'triangle';
    // 
    // THAY THẾ MATH.RANDOM BẰNG HÀM 'randomWithSeed' TRONG ÂM THANH
    // 
    osc.frequency.setValueAtTime(800 + randomWithSeed() * 200, audioCtx.currentTime);
    //osc.frequency.setValueAtTime(800 + Math.random() * 200, audioCtx.currentTime);


    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function generateRandomItems() {
    // Diệt toàn bộ thẻ cũ đang xếp hàng ngầm trong bộ đếm
    activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    activeTimeouts = []; // Xóa rỗng mảng sau khi diệt xong

    // Mở khóa phòng trường hợp người dùng click quá nhanh
    isGenerating = false;

    const container = document.getElementById('item-container');
    const btnGenerate = document.getElementById('btn-generate');
    const btnSubmit = document.getElementById('btn-submit');
    const countSelect = document.getElementById('item-count'); // Lấy Select Box

    if (!container) return;

    initAudio();
    isGenerating = true;

    if (btnGenerate) {
        btnGenerate.disabled = true;
        btnGenerate.innerHTML = 'Đang quay số...';
        btnGenerate.style.opacity = '0.7';
    }
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.style.opacity = '0.5';
    }

    container.innerHTML = '';
    currentItems = [];

    // Lấy số lượng vật phẩm (N) do người chơi chọn
    const totalItems = countSelect ? parseInt(countSelect.value) : 10;
    // 
    // LẤY MÃ SEED TỪ GIAO DIỆN HTML (NẾU CÓ)
    // Nếu người dùng nhập Seed, lấy giá trị đó. Nếu để trống, dùng mặc định 12345.
    // Việc reset currentSeed ở đây giúp mỗi lần nhấn "Xoay", danh sách vẫn giống hệt nhau!
    //
    const seedInput = document.getElementById('seed-input');
    currentSeed = (seedInput && seedInput.value) ? parseInt(seedInput.value) : 12345;
    // =========================================================================
    const danhSachTenVatPham = [
        "[⌐╦ᡁ᠊╾]Súng lục 1911", "[⌐╦ᡁ᠊╾]Súng lục Baretta M9A4", "[⌐╦ᡁ᠊╾]Súng lục Desert Eagle .50", "[⌐╦ᡁ᠊╾]Súng lục Glock 17",
        "[╾╤デ╦︻]           Súng trường AK-47", "[ᡕᠵデᡁ᠊╾━]       Súng bắn tỉa M24", "[⌯⁍]Hộp đạn 9mm", "[⌯⁍]Băng đạn .45 ACP (1911)",
        "[⌯⁍]Băng đạn .50 AE (Desert Eagle)", "[⌯⁍]Hộp đạn 5.56mm NATO", "[⌯⁍]Băng đạn AK-47 7.62x39",
        "[⌯⁍]Hộp đạn (sniper)", "[⌯⁍]Mag STANAG 30 viên", "[⌯⁍]Drum mag AK-75 viên",
        "[🧨💥]Lựu đạn M67", "[🧨💨]Bom khói M18", "[🧨😵‍💫]     Flashbang M84",
        "[🧰]Băng cứu thương (Medkit)", "[💊]Thuốc giảm đau (Painkillers)",
        "[⛑]Mũ cối Level 3", "[🎽]Giáp chống đạn Level 4", "[⛑]Mũ ACH Level 3A", "[🎽]Plate Carrier với tấm ceramic",
        "[🎽]Áo Giáp Kevlar", "[⛑]Mũ OPS-Core FAST", "[🎽]Áo giáp mềm NIJ Level II", "Kính bảo hộ balistic",
        "Balo chiến thuật", "[🔭]Ống nhòm tầm xa", "Dao găm quân dụng", "Mặt nạ phòng độc",
        "Đèn pin chiến thuật", "Lương khô", "Bình nước", "Kính nhìn đêm NVG",
        "Radio liên lạc", "Dây thừng leo trèo", "Bộ dụng cụ sửa chữa", "Áo ngụy trang",
        "Giày boots quân sự", "Dao đa năng Leatherman", "Pin dự phòng", "Túi ngủ sinh tồn", "La bàn định vị"
    ];

    // BƯỚC 1: XỬ LÝ DỮ LIỆU TỨC THÌ (Tạo mảng cực nhanh trong bộ nhớ)
    for (let i = 1; i <= totalItems; i++) {
        //
        // THAY THẾ TOÀN BỘ MATH.RANDOM() BẰNG RANDOMWITHSEED()
        // Việc này đảm bảo Trọng lượng, Giá trị và Tên vật phẩm luôn cố định theo Seed
        //
        const weight = Math.floor(randomWithSeed() * 20) + 1;
        const value = Math.floor(randomWithSeed() * 90) + 10;
        const viTriNgauNhien = Math.floor(randomWithSeed() * danhSachTenVatPham.length);
        // 
        //const weight = Math.floor(Math.random() * 20) + 1;
        //const value = Math.floor(Math.random() * 90) + 10;
        //const viTriNgauNhien = Math.floor(Math.random() * danhSachTenVatPham.length);
        const tenVatPham = danhSachTenVatPham[viTriNgauNhien];

        currentItems.push({
            Id: i,
            TrongLuong: weight,
            GiaTri: value,
            Ten: tenVatPham
        });
    }

    // BƯỚC 2: HIỂN THỊ UI THÔNG MINH
    // KHÔNG BAO GIỜ vẽ quá 100 DOM Element để tránh sập trình duyệt
    const MAX_DISPLAY = 100;
    const itemsToDisplay = currentItems.slice(0, MAX_DISPLAY);

    // Auto điều chỉnh tốc độ bay vào (Ít thì bay chậm ngắm cho đẹp, nhiều thì bay vèo vèo)
    const renderDelay = totalItems <= 10 ? 150 : (totalItems <= 50 ? 50 : 10);
    let delay = 0;

    itemsToDisplay.forEach((item, index) => {
        // Gán hàm setTimeout vào một biến timerId để lưu trữ
        const timerId = setTimeout(() => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            card.innerHTML = `
                <h4 style="color: #FFD700; font-size: 16px; margin-bottom: 10px;">${item.Ten} (ID:${item.Id})</h4>
                <p><strong>Khối lượng:</strong> ${item.TrongLuong} kg</p>
                <p><strong>Giá trị:</strong> $${item.GiaTri}</p>
                <p><strong>Tỷ lệ:</strong> ${(item.GiaTri / item.TrongLuong).toFixed(2)}</p>
            `;
            container.appendChild(card);

            // Giảm tải âm thanh nếu load quá nhanh (Tránh bị rè loa vì gọi API Audio liên tục)
            if (renderDelay >= 50 || index % 3 === 0) {
                playTickSound();
            }

            // Kết thúc hiệu ứng của thẻ được hiển thị cuối cùng
            if (index === itemsToDisplay.length - 1) {
                // Nếu quy mô lớn hơn mức cho phép hiển thị -> In ra dòng cảnh báo
                if (totalItems > MAX_DISPLAY) {
                    const notice = document.createElement('div');
                    notice.style.width = "100%";
                    notice.style.textAlign = "center";
                    notice.style.marginTop = "30px";
                    notice.style.padding = "20px";
                    notice.style.border = "1px dashed #FFD700";
                    notice.style.borderRadius = "8px";
                    notice.style.backgroundColor = "rgba(0,0,0,0.5)";
                    notice.innerHTML = `
                        <h3 style="color: #e74c3c; margin-bottom:10px;">ĐÃ TẠO THÀNH CÔNG ${totalItems.toLocaleString()} VẬT PHẨM </h3>
                        <p style="color: #b0c4de;"><strong>${(totalItems - MAX_DISPLAY).toLocaleString()}</strong> vật phẩm tiếp theo đang được chạy ngầm trong bộ nhớ.</p>
                        <p style="font-size:13px; color: #888;">(Giao diện tự động ẩn để đảm bảo trình duyệt web không bị sập đồ họa, sẵn sàng test giới hạn AI ở vòng sau).</p>`;
                    container.appendChild(notice);
                }

                // Kích hoạt lại nút bấm
                if (btnGenerate) {
                    btnGenerate.disabled = false;
                    btnGenerate.innerHTML = 'Xoay ngẫu nhiên lại';
                    btnGenerate.style.opacity = '1';
                }
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.style.opacity = '1';
                }
                isGenerating = false;
            }
        }, delay);

        // Đưa ID của thẻ chuẩn bị bay vào danh sách kiểm soát activeTimeouts
        activeTimeouts.push(timerId);

        delay += renderDelay;
    });
}

function submitItems() {
    if (currentItems.length === 0 || isGenerating) return;

    fetch('/Knapsack/LuuTruVatPham', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentItems)
    })
        .then(response => {
            if (response.ok) {
                window.location.href = '/Knapsack/Game';
            } else {
                // Khi gửi N=10000 object, file JSON có thể lên tới vài Megabyte
                // Nếu báo lỗi ở đây, Backend C# của ta đang giới hạn dung lượng Request Size
                alert("Lỗi! Có thể Payload gửi lên quá lớn (Vượt quá dung lượng cho phép của Backend).");
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            alert("Lỗi kết nối máy chủ khi gửi dữ liệu!");
        });
}

document.addEventListener('DOMContentLoaded', generateRandomItems);