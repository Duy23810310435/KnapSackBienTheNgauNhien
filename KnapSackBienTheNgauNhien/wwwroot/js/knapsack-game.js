document.addEventListener('DOMContentLoaded', () => {
    const items = document.querySelectorAll('.item-card');
    const backpackZone = document.getElementById('backpack-zone');
    const sourceZone = document.getElementById('source-zone');
    const maxCapacity = parseInt(document.getElementById('max-capacity').textContent);
    // Biến toàn cục lưu trữ lịch sử Min/Max qua các lần bấm nút
    let historyRS = { min: Infinity, max: 0 };
    let historyGA = { min: Infinity, max: 0 };
    let activeAnimations = [];

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

    function runAISolver(apiUrl, btnElement, buttonText) {
        playButtonClickSound();

        activeAnimations.forEach(t => clearTimeout(t));
        activeAnimations = [];

        const btnRS = document.getElementById('btn-rs-solve');
        if (btnRS) { btnRS.disabled = false; btnRS.innerText = "Xếp bằng Random Search"; }
        const btnGA = document.getElementById('btn-ga-solve');
        if (btnGA) { btnGA.disabled = false; btnGA.innerText = "Xếp bằng Genetic Algorithm (GA)"; }

        btnElement.disabled = true;
        btnElement.innerText = "⏳ Đang tiến hóa & tính toán...(Điều này có thể mất tối đa 2 phút)";

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

                // Tính toán giá trị của kết quả lần chạy này
                currentItems.forEach((item, index) => {
                    if (boGen[index] === 1) { // Bây giờ boGen[index] mới chạy đúng
                        pickedCount++;
                        totalValue += parseInt(item.dataset.value);
                        totalWeight += parseInt(item.dataset.weight);
                    }
                });

                const efficiency = totalWeight > 0 ? (totalValue / totalWeight).toFixed(2) : 0;
                const isRS = btnElement.id === 'btn-rs-solve';
                const prefix = isRS ? 'rs' : 'ga';

                //  LƯU VÀ CẬP NHẬT LỊCH SỬ TỪNG LẦN CHẠY
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

                // Đổ dữ liệu các chỉ số khác lên giao diện
                document.getElementById(`${prefix}-time`).innerText = timeTaken + " ms";
                document.getElementById(`${prefix}-picked`).innerText = `${pickedCount} / ${totalCount}`;
                document.getElementById(`${prefix}-weight`).innerText = `${totalWeight} kg`;
                document.getElementById(`${prefix}-efficiency`).innerText = `$${efficiency} / kg`;

                // Logic chạy animation rơi đồ vào Balo...
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
                    btnElement.disabled = false;
                    btnElement.innerText = buttonText;
                    updateStatus(false);
                }, delay + 200);

                activeAnimations.push(endId);
            })
            .catch(error => {
                console.error("Lỗi Fetch API:", error);
                btnElement.disabled = false;
                btnElement.innerText = buttonText;
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