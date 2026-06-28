import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const LINK_MAP = {
    "test": "https://google.com",
    "github": "https://github.com",
    "datadev": "https://datadev.site"
};

export default async function handler(req, res) {
    const { code } = req.query;
    const targetUrl = LINK_MAP[code];

    if (!targetUrl) return res.status(404).send('Hata: Geçersiz CashLink kodu.');

    // Cookie'den giriş yapmış kullanıcının ID'sini oku
    const cookies = req.headers.cookie || '';
    const userIdCookie = cookies.split('; ').find(row => row.startsWith('sb_user_id='));
    
    if (!userIdCookie) {
        // Giriş yapmamışsa login sayfasına postala
        return res.redirect('/login');
    }
    
    const userId = userIdCookie.split('=')[1];

    // Profil bilgilerini veritabanından çek
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !profile) return res.status(404).send('Kullanıcı profili bulunamadı.');

    const now = new Date();
    let earnStatus = 'cooldown';
    let updatedBalance = profile.balance;

    // 30 dakika (1800000 milisaniye) kontrolü
    const lastClick = profile.last_click_at ? new Date(profile.last_click_at) : null;
    
    if (!lastClick || (now - lastClick >= 1800000)) {
        // 30 dakika geçmiş veya ilk defa tıklıyor: 100 TL ekle ve süreyi güncelle
        updatedBalance = Number(profile.balance) + 100;
        
        await supabase
            .from('profiles')
            .update({ 
                balance: updatedBalance, 
                last_click_at: now.toISOString() 
            })
            .eq('id', userId);

        earnStatus = 'success';
    }

    return res.redirect(`/index.html?target=${encodeURIComponent(targetUrl)}&earn=${earnStatus}&balance=${updatedBalance}`);
}
