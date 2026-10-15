// API Conversions Meta — reçoit les événements de la page et les renvoie à Meta côté serveur.
// Variables d'environnement à créer sur Vercel (Settings → Environment Variables) :
//   META_CAPI_TOKEN  = jeton d'accès généré dans le Gestionnaire d'événements (obligatoire)
//   META_TEST_CODE   = code de test (facultatif, seulement pendant les tests)
const PIXEL_ID = '1129381852922164';
const ALLOWED = ['PageView', 'ViewContent', 'InitiateCheckout'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return res.status(200).json({ skipped: 'META_CAPI_TOKEN manquant' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  if (!ALLOWED.includes(b.event_name) || !b.event_id) return res.status(400).json({ error: 'bad event' });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
  const user_data = { client_ip_address: ip, client_user_agent: req.headers['user-agent'] || '' };
  if (b.fbp) user_data.fbp = String(b.fbp).slice(0, 200);
  if (b.fbc) user_data.fbc = String(b.fbc).slice(0, 300);
  const ev = {
    event_name: b.event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: String(b.event_id).slice(0, 100),
    action_source: 'website',
    event_source_url: String(b.url || req.headers.referer || '').slice(0, 1000),
    user_data,
    custom_data: { content_name: 'Formation IA Motion Design', content_ids: ['formation-ia-motion-design'], content_type: 'product', value: 6900, currency: 'XOF' }
  };
  const payload = { data: [ev] };
  if (process.env.META_TEST_CODE) payload.test_event_code = process.env.META_TEST_CODE;
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const j = await r.json();
    return res.status(r.ok ? 200 : 502).json(j);
  } catch (e) {
    return res.status(502).json({ error: String(e) });
  }
};
