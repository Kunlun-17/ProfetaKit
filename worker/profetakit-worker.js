/* =====================================================================
   ProfetaKit store server (Cloudflare Worker)
   ---------------------------------------------------------------------
   POST /checkout {product}        start a PayMongo payment, returns the checkout URL
   POST /webhook                   PayMongo says a payment is paid -> mark the order paid
   GET  /order?id=ORDER            the thank-you page asks: is this order paid, what can I download?
   GET  /download?id=ORDER&file=N  stream a purchased file from the private R2 bucket
   GET  /geo                       the visitor's country (from Cloudflare), used to show local prices

   Bindings (Cloudflare -> Worker -> Settings):
     ORDERS  -> a KV namespace (stores orders)
     FILES   -> an R2 bucket (private, holds the product files)
   Secrets / variables:
     PAYMONGO_SECRET_KEY, PAYMONGO_WEBHOOK_SECRET          [secrets]
     SITE_URL (https://kunlun-17.github.io/ProfetaKit)     [text]
     PAYMENT_METHODS (e.g. qrph,gcash,paymaya,card)        [text]
   ===================================================================== */

/* Products. Prices are in centavos (₱249.00 = 24900). Files are R2 object keys. */
const PRODUCTS = {
  'online-seller-tracker': {
    name: "Online Seller Bookkeeping & Inventory Tracker", price: 49900,
    files: ["seller/online-seller-tracker.xlsx", "seller/quick-start-guide.pdf"],
  },
  'money-reset-bundle': {
    name: "Money Reset Bundle", price: 39900,
    files: ["money/monthly-budget-tracker.xlsx", "money/debt-payoff-tracker.xlsx", "money/savings-goal-tracker.xlsx", "money/quick-start-guide.pdf"],
  },
  'debt-payoff-tracker': {
    name: "Debt Payoff Tracker", price: 24900,
    files: ["money/debt-payoff-tracker.xlsx", "money/quick-start-guide.pdf"],
  },
  'monthly-budget-tracker': {
    name: "Monthly Budget Tracker", price: 24900,
    files: ["money/monthly-budget-tracker.xlsx", "money/quick-start-guide.pdf"],
  },
  'wedding-planner-spreadsheet': {
    name: "Wedding Planner Spreadsheet", price: 39900,
    files: ["wedding/wedding-planner.xlsx", "wedding/quick-start-guide.pdf"],
  },
  'ats-resume-template-pack': {
    name: "ATS-Friendly Resume Template Pack", price: 29900,
    files: ["resume/ats-resume-pack.zip"],
  },
  'kitboard-admin-dashboard': {
    name: "Kitboard Admin Dashboard Template", price: 69900,
    files: ["code/kitboard-admin-dashboard.zip"],
  },
};

const ORDER_DAYS = 365;   // how long a download link keeps working

const site = env => (env.SITE_URL || 'https://kunlun-17.github.io/ProfetaKit').replace(/\/+$/, '');
const origin = env => new URL(site(env)).origin;
const cors = (env, extra = {}) => ({
  'Access-Control-Allow-Origin': origin(env), 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type', ...extra,
});
const json = (env, obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: cors(env, { 'Content-Type': 'application/json' }) });
class UserError extends Error {}

const pm = (env, path, body) => fetch('https://api.paymongo.com/v1/' + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + btoa(env.PAYMONGO_SECRET_KEY + ':') },
  body: JSON.stringify(body),
}).then(async r => {
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('PayMongo: ' + ((j.errors || []).map(e => e.detail || e.code).join('; ') || ('HTTP ' + r.status)));
  return j;
});

/* Order IDs are long and random, so nobody can guess someone else's download link. */
const newOrderId = () => 'PK-' + [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, '0')).join('');
const getOrder = async (env, id) => (/^PK-[0-9a-f]{24}$/.test(id || '') ? JSON.parse((await env.ORDERS.get('order:' + id)) || 'null') : null);
const putOrder = (env, o) => env.ORDERS.put('order:' + o.id, JSON.stringify(o), { expirationTtl: ORDER_DAYS * 86400 });

/* ---------------- start a payment ---------------- */
async function checkout(req, env) {
  const { product } = await req.json().catch(() => ({}));
  const P = PRODUCTS[product];
  if (!P) throw new UserError('That product does not exist.');
  if (!env.ORDERS || !env.ORDERS.put) throw new Error('Setup: the ORDERS KV namespace is not bound to this Worker.');
  if (!env.PAYMONGO_SECRET_KEY) throw new Error('Setup: the PAYMONGO_SECRET_KEY secret is missing.');
  const id = newOrderId();
  const s = await pm(env, 'checkout_sessions', { data: { attributes: {
    line_items: [{ name: P.name, amount: P.price, currency: 'PHP', quantity: 1 }],
    payment_method_types: (env.PAYMENT_METHODS || 'qrph,gcash,paymaya,card').split(',').map(x => x.trim()).filter(Boolean),
    description: 'ProfetaKit · ' + P.name, reference_number: id,
    send_email_receipt: true, show_description: true, show_line_items: true,
    success_url: site(env) + '/thanks.html?order=' + id,
    cancel_url: site(env) + '/' + product + '.html',
    metadata: { store: 'profetakit', order: id, product },
  } } });
  await putOrder(env, { id, product, price: P.price, status: 'pending', session: s.data.id, t: Date.now() });
  return json(env, { url: s.data.attributes.checkout_url });
}

/* ---------------- PayMongo webhook ---------------- */
async function validSignature(env, header, raw) {
  const parts = Object.fromEntries((header || '').split(',').map(p => p.split('=')));
  if (!parts.t) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.PAYMONGO_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(parts.t + '.' + raw));
  const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('');
  const sig = (env.PAYMONGO_SECRET_KEY || '').startsWith('sk_live') ? parts.li : parts.te;
  return !!sig && sig === hex;
}

async function webhook(req, env) {
  const raw = await req.text();
  if (!(await validSignature(env, req.headers.get('Paymongo-Signature'), raw))) return new Response('bad signature', { status: 401 });
  const ev = JSON.parse(raw).data.attributes;
  if (ev.type !== 'checkout_session.payment.paid') return new Response('ignored');
  const a = ev.data.attributes || {}, md = a.metadata || {};
  if (md.store !== 'profetakit') return new Response('not a store order');      // e.g. a Card Battle payment
  const o = await getOrder(env, md.order), P = PRODUCTS[md.product];
  if (!o || !P || o.product !== md.product) return new Response('unknown order');
  if (o.status === 'paid') return new Response('already paid');                   // PayMongo may resend events
  const paid = (a.payments || []).reduce((s, p) => s + ((p.attributes && p.attributes.status === 'paid') ? p.attributes.amount : 0), 0);
  if (paid < P.price) return new Response('amount mismatch', { status: 400 });
  o.status = 'paid'; o.paidAt = Date.now();
  const email = a.billing && a.billing.email; if (email) o.email = email;
  await putOrder(env, o);
  return new Response('ok');
}

/* ---------------- thank-you page + downloads ---------------- */
async function orderStatus(url, env) {
  const o = await getOrder(env, url.searchParams.get('id'));
  if (!o) throw new UserError('We could not find that order. Check the link in your receipt email.');
  const P = PRODUCTS[o.product];
  return json(env, {
    status: o.status, product: P.name,
    files: o.status === 'paid' ? P.files.map((f, i) => ({ n: i, name: f.split('/').pop() })) : [],
  });
}

async function download(url, env) {
  const o = await getOrder(env, url.searchParams.get('id'));
  if (!o || o.status !== 'paid') return new Response('This download is not available. Finish payment first.', { status: 403 });
  const key = PRODUCTS[o.product].files[+url.searchParams.get('file')];
  const obj = key && await env.FILES.get(key);
  if (!obj) return new Response('File not found. Message us and we will send it.', { status: 404 });
  return new Response(obj.body, { headers: {
    'Content-Type': obj.httpMetadata && obj.httpMetadata.contentType || 'application/octet-stream',
    'Content-Disposition': 'attachment; filename="' + key.split('/').pop() + '"',
    'Cache-Control': 'private, no-store',
  } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    try {
      if (req.method === 'POST' && url.pathname === '/checkout') return await checkout(req, env);
      if (req.method === 'POST' && url.pathname === '/webhook') return await webhook(req, env);
      if (req.method === 'GET' && url.pathname === '/order') return await orderStatus(url, env);
      if (req.method === 'GET' && url.pathname === '/download') return await download(url, env);
      if (req.method === 'GET' && url.pathname === '/health') return json(env, {
        version: '2026-11-04b',
        products: Object.keys(PRODUCTS).length,
        ORDERS_binding: !!(env.ORDERS && env.ORDERS.put),
        FILES_binding: !!(env.FILES && env.FILES.get),
        PAYMONGO_SECRET_KEY: env.PAYMONGO_SECRET_KEY ? (String(env.PAYMONGO_SECRET_KEY).startsWith('sk_live') ? 'set (live)' : String(env.PAYMONGO_SECRET_KEY).startsWith('sk_test') ? 'set (test)' : 'set, but it should start with sk_live or sk_test') : 'missing',
        PAYMONGO_WEBHOOK_SECRET: env.PAYMONGO_WEBHOOK_SECRET ? 'set' : 'missing',
        SITE_URL: env.SITE_URL || 'missing (using default)',
        PAYMENT_METHODS: env.PAYMENT_METHODS || 'missing (using qrph,gcash,paymaya,card)',
      });
      if (req.method === 'GET' && url.pathname === '/geo')
        return json(env, { country: (req.cf && req.cf.country) || '' });
      return new Response('ProfetaKit store OK');
    } catch (e) {
      if (e instanceof UserError) return json(env, { error: e.message }, 400);
      return json(env, { error: 'Store server error', detail: String(e.message || e) }, 500);
    }
  },
};
