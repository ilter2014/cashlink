import { createClient } from '@supabase/supabase-js';

// Supabase bilgilerini doğrudan buraya yazıyorsun:
const SUPABASE_URL = "BURAYA_SUPABASE_URL_YAZ";
const SUPABASE_ANON_KEY = "BURAYA_SUPABASE_ANON_KEY_YAZ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    const { action } = req.query;
    const { email, password } = req.body;

    if (action === 'register') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) return res.status(400).send(`Hata: ${error.message}`);
        return res.send('Kayıt başarılı! Giriş sayfasına dönebilirsiniz.');
    }

    if (action === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return res.status(400).send(`Hata: ${error.message}`);
        
        res.setHeader('Set-Cookie', `sb_user_id=${data.user.id}; Path=/; HttpOnly; Max-Age=2592000`);
        return res.redirect('/dashboard');
    }
}
