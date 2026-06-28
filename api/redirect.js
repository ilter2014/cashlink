import { kv } from '@vercel/kv';

// KISALTTIĞIN LİNKLERİ BURAYA EKLE:
// "kod": "gideceği_gerçek_link"
const LINK_MAP = {
    "code1": "https://google.com",
    "datadev": "https://datadev.site",
    "hediye": "https://github.com"
};

export default async function handler(req, res) {
    const { code } = req.query;
    const targetUrl = LINK_MAP[code];

    // Eğer kod havuzda yoksa hata ver
    if (!targetUrl) {
        return res.status(404).send('CashLink: Girdiğiniz kod sistemde bulunamadı.');
    }

    // Kullanıcının gerçek IP adresini Vercel üzerinden güvenli alıyoruz
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const cleanIp = ip.split(',')[0].trim();

    // Veritabanı anahtarları
    const cooldownKey = `cooldown:${cleanIp}`;
    const balanceKey = `balance:${cleanIp}`;

    // 1. Güvenlik Kontrolü: Bu IP son 30 dakikada girdi mi?
    const isLocked = await kv.get(cooldownKey);
    let earnStatus = 'cooldown';

    if (!isLocked) {
        // Eğer 30 dakika içinde girmediyse: 100 TL ekle
        const currentBalance = await kv.get(balanceKey) || 0;
        await kv.set(balanceKey, Number(currentBalance) + 100);
        
        // Bu IP'yi 30 dakika (1800 saniye) boyunca kilitle
        await kv.set(cooldownKey, 'locked', { ex: 1800 });
        earnStatus = 'success';
    }

    // Bilgileri arayüze (index.html'e) gönder ve sayfayı aç
    return res.redirect(`/index.html?target=${encodeURIComponent(targetUrl)}&earn=${earnStatus}`);
}