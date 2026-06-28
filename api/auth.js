import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    const { action } = req.query;
    const { email, password } = req.body;

    if (action === 'register') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) return res.status(400).send(`Kayıt Hatası: ${error.message}`);
        return res.send('Kayıt başarılı! E-posta adresinize gelen onay linkine tıkladıktan sonra giriş yapabilirsiniz. (Supabase ayarlarından e-posta onayını kapatabilirsiniz)');
    }

    if (action === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return res.status(400).send(`Giriş Hatası: ${error.message}`);
        
        // Kullanıcı ID'sini cookie içine kaydediyoruz (Güvenlik için basit sürüm)
        res.setHeader('Set-Cookie', `sb_user_id=${data.user.id}; Path=/; HttpOnly; Max-Age=2592000`);
        return res.send('Giriş başarılı! Artık cashlink kodlarını kullanabilirsiniz. Örn: siteadi.com/test');
    }
}
