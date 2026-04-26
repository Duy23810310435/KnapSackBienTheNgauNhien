document.addEventListener('DOMContentLoaded', () => {
    const items = document.querySelectorAll('.item-card');
    const backpackZone = document.getElementById('backpack-zone');
    const sourceZone = document.getElementById('source-zone');
    const maxCapacity = parseInt(document.getElementById('max-capacity').textContent);

    // Biến toàn cục lưu trữ lịch sử Min/Max qua các lần bấm nút
    let historyRS = { min: Infinity, max: 0 };
    let historyGA = { min: Infinity, max: 0 };
    let activeAnimations = [];
    let runCounter = 0; //Biến đếm số thứ tự lần chạy cho bảng lịch sử

    // 
    // CHỨC NĂNG XUẤT FILE BÁO CÁO
    // 
    const btnExport = document.getElementById('btn-export-data');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            let content = "BÁO CÁO THÔNG SỐ VẬT PHẨM - KNAPSACK PROBLEM\n";
            content += "=================================================================================================\n";
            content += `Tổng số vật phẩm: ${items.length}\n`;
            content += `Sức chứa tối đa của Balo: ${maxCapacity} kg\n\n`;

            // Căn chỉnh lại Header cho vừa vặn
            content += "STT   | Tên vật phẩm                            | Trọng lượng (kg)  | Giá trị ($)  | Tỷ lệ ($/kg)\n";
            content += "-------------------------------------------------------------------------------------------------\n";

            const allItems = document.querySelectorAll('.item-card');
            allItems.forEach((item, index) => {
                let name = item.querySelector('h4').textContent;

                // XỬ LÝ LỆCH CỘT: 
                // 1. replace(/^\[.*?\]/, ''): Cắt bỏ toàn bộ cụm icon/emoji trong ngoặc vuông ở đầu (nếu có)
                // 2. replace(/\s+/g, ' '): Gom tất cả khoảng trắng dư thừa thành 1 khoảng trắng duy nhất
                // 3. trim(): Xóa khoảng trắng thừa ở hai đầu
                name = name.replace(/^\[.*?\]/, '').replace(/\s+/g, ' ').trim();

                const weight = item.dataset.weight;
                const value = item.dataset.value;
                const ratio = (value / weight).toFixed(2);

                // Khớp chính xác độ dài (padEnd) với Header bên trên
                content += `${(index + 1).toString().padEnd(5)} | ${name.padEnd(39)} | ${weight.padEnd(17)} | ${value.padEnd(12)} | ${ratio}\n`;
            });

            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `DanhSachVatPham_N${items.length}.txt`;
            a.click();
            window.URL.revokeObjectURL(url);
        });
    }

    // Âm thanh của hệ thống
    function playDropSound(isError = false) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        if (isError) {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
        }

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    }

    function playButtonClickSound() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    }

    document.addEventListener('dragover', (e) => {
        const scrollSpeed = 15;
        const edgeSize = 50;
        if (e.clientY < edgeSize) window.scrollBy(0, -scrollSpeed);
        else if (window.innerHeight - e.clientY < edgeSize) window.scrollBy(0, scrollSpeed);
    });

    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', item.id);
            setTimeout(() => item.classList.add('dragging'), 0);
        });
        item.addEventListener('dragend', () => item.classList.remove('dragging'));
    });

    setupDropZone(backpackZone);
    setupDropZone(sourceZone);

    function setupDropZone(zone) {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');

            const itemId = e.dataTransfer.getData('text/plain');
            const draggableElement = document.getElementById(itemId);

            if (draggableElement) {
                zone.appendChild(draggableElement);
                updateStatus();
            }
        });
    }

    function updateStatus(isSilent = false) {
        let currentWeight = 0;
        let currentValue = 0;

        const weightDisplay = document.getElementById('current-weight');
        const progressBar = document.getElementById('weight-progress');
        const donutChart = document.getElementById('capacity-donut');
        const donutText = document.getElementById('donut-text');

        backpackZone.classList.remove('zone-overweight');
        document.querySelectorAll('.item-card').forEach(item => item.classList.remove('item-overweight'));

        backpackZone.querySelectorAll('.item-card').forEach(item => {
            let itemWeight = parseInt(item.dataset.weight);
            currentWeight += itemWeight;
            currentValue += parseInt(item.dataset.value);

            if (currentWeight > maxCapacity) {
                item.classList.add('item-overweight');
            }
        });

        weightDisplay.textContent = currentWeight;
        document.getElementById('current-value').textContent = '$' + currentValue;

        let percent = (currentWeight / maxCapacity) * 100;
        let displayPercent = percent > 100 ? 100 : percent;

        progressBar.style.width = displayPercent + '%';
        donutChart.style.setProperty('--percent', displayPercent + '%');
        donutText.textContent = Math.round(percent) + '%';

        if (currentWeight > maxCapacity) {
            progressBar.classList.add('overloaded');
            donutChart.style.background = `conic-gradient(#e74c3c 0%, #e74c3c var(--percent), #2c3e50 var(--percent), #2c3e50 100%)`;
            if (!isSilent) playDropSound(true);
        } else {
            progressBar.classList.remove('overloaded');
            donutChart.style.background = `conic-gradient(#FFD700 0%, #FFD700 var(--percent), #2c3e50 var(--percent), #2c3e50 100%)`;
            if (currentWeight > 0 && !isSilent) playDropSound(false);
        }
    }

    //
    // LOGIC THUẬT TOÁN
    // 
    function runAISolver(apiUrl, btnElement, buttonText) {
        playButtonClickSound();

        activeAnimations.forEach(t => clearTimeout(t));
        activeAnimations = [];

        // KHÓA TOÀN BỘ CÁC NÚT VÀ BIẾN CHÚNG THÀNH MÀU XÁM MỜ
        const btnRS = document.getElementById('btn-rs-solve');
        const btnGA = document.getElementById('btn-ga-solve');
        const btnExportData = document.getElementById('btn-export-data');

        if (btnRS) {
            btnRS.disabled = true;
            btnRS.style.opacity = '0.5';
            btnRS.style.filter = 'grayscale(100%)';
            btnRS.style.cursor = 'not-allowed';
        }
        if (btnGA) {
            btnGA.disabled = true;
            btnGA.style.opacity = '0.5';
            btnGA.style.filter = 'grayscale(100%)';
            btnGA.style.cursor = 'not-allowed';
        }
        if (btnExportData) {
            btnExportData.disabled = true;
            btnExportData.style.opacity = '0.5';
            btnExportData.style.filter = 'grayscale(100%)';
            btnExportData.style.cursor = 'not-allowed';
        }

        // Riêng nút ĐANG CHẠY thì cho sáng lên một chút và có màu để phân biệt
        btnElement.innerText = "⏳ Đang tiến hóa & tính toán...(Điều này có thể mất tối đa 2 phút)";
        btnElement.style.opacity = '0.9';
        btnElement.style.filter = 'none';

        const sourceZone = document.getElementById('source-zone');
        const backpackZone = document.getElementById('backpack-zone');

        const currentItems = Array.from(document.querySelectorAll('.item-card'));
        currentItems.sort((a, b) => {
            const idA = parseInt(a.id.replace('item-', ''));
            const idB = parseInt(b.id.replace('item-', ''));
            return idA - idB;
        });

        currentItems.forEach(item => sourceZone.appendChild(item));
        updateStatus(true);

        const startTime = performance.now();

        fetch(apiUrl, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                const boGen = data.boGen || data;
                const endTime = performance.now();
                const timeTaken = (endTime - startTime).toFixed(2);

                const totalCount = currentItems.length;
                let pickedCount = 0;
                let totalValue = 0;
                let totalWeight = 0;

                // Tính toán kết quả
                currentItems.forEach((item, index) => {
                    if (boGen[index] === 1) {
                        pickedCount++;
                        totalValue += parseInt(item.dataset.value);
                        totalWeight += parseInt(item.dataset.weight);
                    }
                });

                const efficiency = totalWeight > 0 ? (totalValue / totalWeight).toFixed(2) : 0;
                const isRS = btnElement.id === 'btn-rs-solve';
                const prefix = isRS ? 'rs' : 'ga';

                // LƯU MIN/MAX
                if (isRS) {
                    if (totalValue < historyRS.min) historyRS.min = totalValue;
                    if (totalValue > historyRS.max) historyRS.max = totalValue;

                    document.getElementById('rs-min-value').innerText = `$${historyRS.min}`;
                    document.getElementById('rs-max-value').innerText = `$${historyRS.max}`;
                } else {
                    if (totalValue < historyGA.min) historyGA.min = totalValue;
                    if (totalValue > historyGA.max) historyGA.max = totalValue;

                    document.getElementById('ga-min-value').innerText = `$${historyGA.min}`;
                    document.getElementById('ga-max-value').innerText = `$${historyGA.max}`;
                }

                // CẬP NHẬT GIAO DIỆN BẢNG A/B
                document.getElementById(`${prefix}-time`).innerText = timeTaken + " ms";
                document.getElementById(`${prefix}-picked`).innerText = `${pickedCount} / ${totalCount}`;
                document.getElementById(`${prefix}-weight`).innerText = `${totalWeight} kg`;
                document.getElementById(`${prefix}-efficiency`).innerText = `$${efficiency} / kg`;

                // XUẤT LỊCH SỬ CHẠY XUỐNG BẢNG MỚI
                runCounter++;
                const historyBody = document.getElementById('history-body');
                if (historyBody) {
                    const rowColor = isRS ? "rgba(52, 152, 219, 0.2)" : "rgba(46, 204, 113, 0.2)";
                    const algoName = isRS ? "Random Search" : "Genetic Algorithm";

                    const tr = document.createElement('tr');
                    tr.style.backgroundColor = rowColor;
                    tr.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
                    tr.innerHTML = `
                        <td style="padding: 8px;">#${runCounter}</td>
                        <td style="padding: 8px; font-weight: bold;">${algoName}</td>
                        <td style="padding: 8px; color: #e74c3c;">${timeTaken} ms</td>
                        <td style="padding: 8px;">${pickedCount}/${totalCount}</td>
                        <td style="padding: 8px; color: #e67e22;">${totalWeight} kg</td>
                        <td style="padding: 8px; color: #2ecc71; font-weight: bold;">$${totalValue}</td>
                    `;
                    historyBody.prepend(tr); // Đưa dòng mới nhất lên đầu
                }

                // HOẠT ẢNH RƠI ĐỒ VÀO BALO
                let speed = 300;
                let delay = 0;
                currentItems.forEach((item, index) => {
                    if (boGen[index] === 1) {
                        const tId = setTimeout(() => {
                            backpackZone.appendChild(item);
                            updateStatus(false);
                        }, delay);
                        activeAnimations.push(tId);
                        delay += speed;
                    }
                });

                const endId = setTimeout(() => {
                    // MỞ KHÓA VÀ KHÔI PHỤC MÀU SẮC GỐC KHI KẾT THÚC
                    if (btnRS) {
                        btnRS.disabled = false;
                        btnRS.innerText = "Xếp bằng Random Search";
                        btnRS.style.opacity = '1';
                        btnRS.style.filter = 'none';
                        btnRS.style.cursor = 'pointer';
                    }
                    if (btnGA) {
                        btnGA.disabled = false;
                        btnGA.innerText = "Xếp bằng Genetic Algorithm (GA)";
                        btnGA.style.opacity = '1';
                        btnGA.style.filter = 'none';
                        btnGA.style.cursor = 'pointer';
                    }
                    if (btnExportData) {
                        btnExportData.disabled = false;
                        btnExportData.style.opacity = '1';
                        btnExportData.style.filter = 'none';
                        btnExportData.style.cursor = 'pointer';
                    }

                    updateStatus(false);
                }, delay + 200);

                activeAnimations.push(endId);
            })
            .catch(error => {
                console.error("Lỗi Fetch API:", error);

                // KHÔI PHỤC NÚT KHI GẶP LỖI SERVER
                const btnRS = document.getElementById('btn-rs-solve');
                const btnGA = document.getElementById('btn-ga-solve');
                const btnExportData = document.getElementById('btn-export-data');

                if (btnRS) {
                    btnRS.disabled = false;
                    btnRS.innerText = "Xếp bằng Random Search";
                    btnRS.style.opacity = '1';
                    btnRS.style.filter = 'none';
                    btnRS.style.cursor = 'pointer';
                }
                if (btnGA) {
                    btnGA.disabled = false;
                    btnGA.innerText = "Xếp bằng Genetic Algorithm (GA)";
                    btnGA.style.opacity = '1';
                    btnGA.style.filter = 'none';
                    btnGA.style.cursor = 'pointer';
                }
                if (btnExportData) {
                    btnExportData.disabled = false;
                    btnExportData.style.opacity = '1';
                    btnExportData.style.filter = 'none';
                    btnExportData.style.cursor = 'pointer';
                }
            });
    }

    const btnRS = document.getElementById('btn-rs-solve');
    if (btnRS) {
        btnRS.addEventListener('click', () => {
            runAISolver('/Knapsack/GiaiQuyetBangAI', btnRS, "Xếp bằng Random Search");
        });
    }

    const btnGA = document.getElementById('btn-ga-solve');
    if (btnGA) {
        btnGA.addEventListener('click', () => {
            runAISolver('/Knapsack/GiaiQuyetBangGA', btnGA, "Xếp bằng Genetic Algorithm (GA)");
        });
    }

    updateStatus();
});