import { createClient } from '@supabase/supabase-js';

// Supabase bilgilerini doğrudan buraya yazıyorsun:
const SUPABASE_URL = "BURAYA_SUPABASE_URL_YAZ";
const SUPABASE_ANON_KEY = "BURAYA_SUPABASE_ANON_KEY_YAZ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    const { code } = req.query;

    const { data: linkData, error: linkError } = await supabase
        .from('links')
        .select('*, user_id ( id, balance )')
        .eq('code', code.trim().toLowerCase())
        .single();

    if (linkError || !linkData) return res.status(404).send('Hata: Link bulunamadı veya kaldırılmış.');

    const linkOwnerId = linkData.user_id.id;
    const currentOwnerBalance = linkData.user_id.balance;

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const cleanIp = ip.split(',')[0].trim();

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
        await supabase
            .from('profiles')
            .update({ balance: Number(currentOwnerBalance) + 100 })
            .eq('id', linkOwnerId);

        await supabase
            .from('clicks')
            .insert({ user_id: linkOwnerId, ip_address: cleanIp });

        earnStatus = 'success';
    }

    return res.redirect(`/index.html?target=${encodeURIComponent(linkData.target_url)}&earn=${earnStatus}`);
}
