import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    const cookies = req.headers.cookie || '';
    const userIdCookie = cookies.split('; ').find(row => row.startsWith('sb_user_id='));
    if (!userIdCookie) return res.status(401).send('Yetkisiz işlem.');
    const userId = userIdCookie.split('=')[1];

    const { action } = req.query;

    // 1. Panel Verilerini Getir (Bakiye ve Link Listesi)
    if (action === 'get_data') {
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
        const { data: links } = await supabase.from('links').select('*').eq('user_id', userId);
        return res.status(200).json({ balance: profile?.balance || 0, links: links || [] });
    }

    // 2. Yeni Link Oluştur / Kısalt
    if (action === 'create' && req.method === 'POST') {
        const { target_url, code } = req.body;
        
        // Kod benzersiz mi kontrol et
        const { data: existing } = await supabase.from('links').select('code').eq('code', code).substring();
        if (existing && existing.length > 0) return res.status(400).send('Bu özel kod zaten kullanımda.');

        const { error } = await supabase.from('links').insert({
            user_id: userId,
            code: code.trim().toLowerCase(),
            target_url: target_url.trim()
        });

        if (error) return res.status(500).send(error.message);
        return res.status(200).send('Tamamlandı.');
    }
}
