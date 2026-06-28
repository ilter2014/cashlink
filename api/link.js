import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ormipzmeduwvfnmwqvwx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ybWlwem1lZHV3dmZubXdxdnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTY4OTQsImV4cCI6MjA5ODIzMjg5NH0.v28C4SulluycvUyGPH05gK_N2RVfX07UZnDv35YPPrc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

    const { action, id } = req.query;

    // DATA GETİRME
    if (action === 'get_data') {
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
        const { data: links } = await supabase.from('links').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        return res.status(200).json({ balance: profile?.balance || 0, links: links || [] });
    }

    // LİNK OLUŞTURMA
    if (action === 'create' && req.method === 'POST') {
        const { target_url } = req.body;
        let uniqueCode = '';
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            attempts++;
            const testCode = generateRandomCode();
            const { data: existing } = await supabase.from('links').select('code').eq('code', testCode).maybeSingle();
            if (!existing) { uniqueCode = testCode; isUnique = true; }
        }

        if (!uniqueCode) return res.status(500).send('Kod üretilemedi.');

        const { error } = await supabase.from('links').insert({
            user_id: userId,
            code: uniqueCode,
            target_url: target_url.trim()
        });

        if (error) return res.status(500).send(error.message);
        return res.status(200).send('Tamamlandı.');
    }

    // LİNK SİLME
    if (action === 'delete' && req.method === 'DELETE') {
        if (!id) return res.status(400).send('ID eksik.');
        
        // Güvenlik kontrolü: Sadece link sahibi silebilir
        const { error } = await supabase.from('links').delete().eq('id', id).eq('user_id', userId);
        
        if (error) return res.status(500).send(error.message);
        return res.status(200).send('Link silindi.');
    }
}
