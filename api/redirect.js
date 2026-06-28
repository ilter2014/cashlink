import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    const { code } = req.query;

    // Veritabanından linki ve link sahibini bul
    const { data: linkData, error: linkError } = await supabase
        .from('links')
        .select('*, user_id ( id, balance )')
        .eq('code', code.trim().toLowerCase())
        .single();

    if (linkError || !linkData) return res.status(404).send('Hata: Link bulunamadı veya kaldırılmış.');

    const linkOwnerId = linkData.user_id.id; // Linki oluşturan ağanın ID'si
    const currentOwnerBalance = linkData.user_id.balance;

    // Tıklayan kişinin IP adresini çek
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const cleanIp = ip.split(',')[0].trim();

    // Bu IP adresi, bu link sahibinin linklerine en son ne zaman tıklamış kontrol et (30 Dakika Sınırı)
    const { data: lastClick } = await supabase
        .from('clicks')
        .select('created_at')
        .eq('user_id', linkOwnerId)
        .eq('ip_address', cleanIp)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const now = new Date();
    let earnStatus = 'cooldown';

    if (!lastClick || (now - new Date(lastClick.created_at) >= 1800000)) {
        // Son 30 dakikada tıklama yok: Link sahibine 100 TL ekle!
        await supabase
            .from('profiles')
            .update({ balance: Number(currentOwnerBalance) + 100 })
            .eq('id', linkOwnerId);

        // Yeni tıklama logunu IP ile kaydet
        await supabase
            .from('clicks')
            .insert({ user_id: linkOwnerId, ip_address: cleanIp });

        earnStatus = 'success';
    }

    // Sayaç sayfasına yönlendir
    return res.redirect(`/index.html?target=${encodeURIComponent(linkData.target_url)}&earn=${earnStatus}`);
}
