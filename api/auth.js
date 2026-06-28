import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

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
        // Giriş yapınca direkt panele yolla
        return res.redirect('/dashboard');
    }
}
