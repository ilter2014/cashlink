import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ormipzmeduwvfnmwqvwx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ybWlwem1lZHV3dmZubXdxdnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTY4OTQsImV4cCI6MjA5ODIzMjg5NH0.v28C4SulluycvUyGPH05gK_N2RVfX07UZnDv35YPPrc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// TIKLAMA BAŞINA VERİLECEK FİYAT (İleride burayı değiştirebilirsin)
const CLICK_PRICE = 10.00; 

export default async function handler(req, res) {
    const { code } = req.query;
    if (!code) return res.status(400).send('Geçersiz link kodu.');

    // 1. Koda ait linki bul
    const { data: link, error: linkError } = await supabase
        .from('links')
        .select('*')
        .eq('code', code)
        .maybeSingle();

    if (linkError || !link) {
        return res.status(404).send('<h1>404 - Link Bulunamadı veya Silinmiş</h1>');
    }

    // 2. Giren kişinin IP Adresini Al
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0';
    const cleanIp = ip.split(',')[0].trim();

    // 3. Cooldown Kontrolü (Bu IP son 24 saatte bu link sahibine kazandırmış mı?)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentClick } = await supabase
        .from('clicks')
        .select('id')
        .eq('user_id', link.user_id)
        .eq('ip_address', cleanIp)
        .gt('created_at', oneDayAgo)
        .maybeSingle();

    // Eğer son 24 saatte tıklamadıysa, ödülü ekle ve logla
    if (!recentClick) {
        // Tıklamayı kaydet
        await supabase.from('clicks').insert({
            user_id: link.user_id,
            ip_address: cleanIp
        });

        // Link sahibinin profilini çekip bakiyesini CLICK_PRICE kadar arttır
        const { data: profile } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', link.user_id)
            .single();

        if (profile) {
            const newBalance = Number(profile.balance) + CLICK_PRICE;
            await supabase
                .from('profiles')
                .update({ balance: newBalance })
                .eq('id', link.user_id);
        }
    }

    // 4. Giren kişiye gösterilecek TEMİZ HTML şablonu (Giren kişi para eklendiğini bilmeyecek)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Güvenli Bağlantı Noktası</title>
            <style>
                body { background-color: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .box { text-align: center; padding: 30px; background: #1e293b; border-radius: 12px; border: 1px solid #334155; max-width: 400px; width: 90%; }
                h2 { color: #38bdf8; margin-bottom: 10px; font-size: 20px; }
                p { color: #94a3b8; font-size: 14px; margin-bottom: 20px; }
                .loader { border: 4px solid #334155; border-top: 4px solid #38bdf8; border-radius: 50%; width: 35px; height: 35px; animation: spin 1s linear infinite; margin: 0 auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
            <script>
                // 3 saniye sonra gerçek hedefe yönlendir
                setTimeout(() => {
                    window.location.href = "${link.target_url}";
                }, 3000);
            </script>
        </head>
        <body>
            <div class="box">
                <div class="loader"></div>
                <h2 style="margin-top:20px;">Bağlantı Güvenli Şekilde Doğrulanıyor</h2>
                <p>Lütfen bekleyin, gitmek istediğiniz adrese yönlendiriliyorsunuz...</p>
            </div>
        </body>
        </html>
    `);
}
