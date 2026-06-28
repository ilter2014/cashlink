import { createClient } from '@supabase/supabase-js';

// Supabase bilgilerini doğrudan buraya yazıyorsun:
const SUPABASE_URL = "https://ormipzmeduwvfnmwqvwx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ybWlwem1lZHV3dmZubXdxdnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTY4OTQsImV4cCI6MjA5ODIzMjg5NH0.v28C4SulluycvUyGPH05gK_N2RVfX07UZnDv35YPPrc";

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
