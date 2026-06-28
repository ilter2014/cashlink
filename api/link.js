import { createClient } from '@supabase/supabase-js';

// Koda gömdüğün Supabase bilgilerini buraya yazmayı unutma:
const SUPABASE_URL = "BURAYA_SUPABASE_URL_YAZ";
const SUPABASE_ANON_KEY = "BURAYA_SUPABASE_ANON_KEY_YAZ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 6 Haneli Rastgele Kod Üretme Fonksiyonu
function generateRandomCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export default async function handler(req, res) {
    const cookies = req.headers.cookie || '';
    const userIdCookie = cookies.split('; ').find(row => row.startsWith('sb_user_id='));
    if (!userIdCookie) return res.status(401).send('Yetkisiz işlem.');
    const userId = userIdCookie.split('=')[1];

    const { action } = req.query;

    if (action === 'get_data') {
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
        const { data: links } = await supabase.from('links').select('*').eq('user_id', userId);
        return res.status(200).json({ balance: profile?.balance || 0, links: links || [] });
    }

    if (action === 'create' && req.method === 'POST') {
        const { target_url } = req.body;
        
        let uniqueCode = '';
        let isUnique = false;
        let attempts = 0;

        // Üretilen kodun veritabanında çakışmaması için döngüyle kontrol ediyoruz
        while (!isUnique && attempts < 10) {
            attempts++;
            const testCode = generateRandomCode();
            
            const { data: existing } = await supabase
                .from('links')
                .select('code')
                .eq('code', testCode)
                .maybeSingle();

            if (!existing) {
                uniqueCode = testCode;
                isUnique = true;
            }
        }

        if (!uniqueCode) {
            return res.status(500).send('Benzersiz kod üretilemedi, lütfen tekrar deneyin.');
        }

        const { error } = await supabase.from('links').insert({
            user_id: userId,
            code: uniqueCode,
            target_url: target_url.trim()
        });

        if (error) return res.status(500).send(error.message);
        return res.status(200).send('Tamamlandı.');
    }
}
