import http from 'node:http';
import { connectDatabase } from './db.js';
import { APIError, text, number, calculate, validateCustomer, draftEnquiry } from './services.js';
const origins = new Set((process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(x => x.trim()).filter(Boolean));
async function readBody(req) { let chunks = [], size = 0; for await (const chunk of req) { size += chunk.length; if (size > 1024 * 1024) throw new APIError('Request too large', 413); chunks.push(chunk) } let b; try { b = JSON.parse(Buffer.concat(chunks).toString() || '{}') } catch { throw new APIError('Invalid JSON') } if (!b || typeof b !== 'object' || Array.isArray(b)) throw new APIError('Expected a JSON object'); return b }
function send(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)) }
async function start() {
    const { client, repo } = await connectDatabase();
    const server = http.createServer(async (req, res) => {
        try {
            const origin = req.headers.origin;
            if (origin) { if (!origins.has(origin)) throw new APIError('Origin not allowed. Check FRONTEND_ORIGINS.', 403); res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin') }
            if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' }); return res.end() }
            const p = new URL(req.url, 'http://localhost').pathname, method = req.method;
            if (p === '/api/health' && method === 'GET') return send(res, 200, { status: 'ok', database: 'mongodb', model: process.env.OLLAMA_MODEL || 'qwen2.5:3b' });
            if (p === '/api/bootstrap' && method === 'GET') { const [products, customers, quotes, settings] = await Promise.all([repo.list('products'), repo.list('customers'), repo.list('quotes'), repo.settings()]); return send(res, 200, { products, customers, quotes, settings }) }
            if (p === '/api/settings' && method === 'PUT') { let b = await readBody(req); return send(res, 200, await repo.saveSettings({ businessName: text(b.businessName, 'business name', 120, true), address: text(b.address, 'address'), taxRate: number(b.taxRate, 'tax rate', 0, 100), terms: text(b.terms, 'terms', 2000), delivery: text(b.delivery, 'delivery', 500) })) }
            if (p === '/api/draft' && method === 'POST') { let b = await readBody(req); if (!['demo', 'ollama'].includes(b.mode)) throw new APIError('Select demo or ollama mode'); return send(res, 200, await draftEnquiry(b, repo)) }
            const m = p.match(/^\/api\/(products|customers|quotes)(?:\/(\d+))?$/);
            if (!m) throw new APIError('API route not found', 404);
            const [, entity, rawId] = m, id = Number(rawId); if (rawId && !Number.isSafeInteger(id)) throw new APIError('Invalid record ID');
            if (method === 'GET') { let result = rawId ? await repo.get(entity, id) : await repo.list(entity); if (!result) throw new APIError('Record not found', 404); return send(res, 200, result) }
            if (method === 'DELETE' && rawId) { if (entity === 'customers' && await repo.hasQuotes(id)) throw new APIError('This customer has saved quotations. Delete those quotations first.', 409); if (!await repo.delete(entity, id)) throw new APIError('Record not found', 404); return send(res, 200, { deleted: true }) }
            if (!['POST', 'PUT'].includes(method)) throw new APIError('Method not allowed', 405);
            if (method === 'POST' && rawId) throw new APIError('Use POST on the collection endpoint', 405);
            if (method === 'PUT' && (!rawId || !await repo.get(entity, id))) throw new APIError('Record not found', 404);
            const b = await readBody(req); let data;
            if (entity === 'products') data = { name: text(b.name, 'product name', 200, true), detail: text(b.detail, 'product detail'), price: number(b.price, 'price', 0, 1e7) };
            else if (entity === 'customers') data = validateCustomer(b);
            else {
                const customerId = number(b.customerId, 'customer ID', 1, Number.MAX_SAFE_INTEGER), customer = await repo.get('customers', customerId); if (!customer) throw new APIError('Select a valid customer');
                if (!Array.isArray(b.items) || !b.items.length || b.items.length > 100) throw new APIError('Add between 1 and 100 quotation items');
                const status = b.status || 'Draft'; if (!['Draft', 'Sent', 'Accepted', 'Declined'].includes(status)) throw new APIError('Invalid quotation status');
                const taxRate = number(b.taxRate, 'tax rate', 0, 100), validDays = number(b.validDays, 'validity', 1, 365);
                data = { customerId, customer, business: await repo.settings(), validDays, taxRate, status, terms: text(b.terms, 'terms', 2000), delivery: text(b.delivery, 'delivery', 500), enquiry: text(b.enquiry, 'enquiry', 10000), ...calculate(b.items, taxRate) };
                if (method === 'POST') data.createdAt = new Date().toISOString(); data.updatedAt = new Date().toISOString();
            }
            const record = method === 'POST' ? await repo.insert(entity, data) : await repo.update(entity, id, data); if (!record) throw new APIError('Record no longer exists', 404); return send(res, method === 'POST' ? 201 : 200, record);
        } catch (e) { if (!e.status) console.error('API request failed:', e.name); send(res, e.status || 500, { error: e.status ? e.message : 'Database or server error. Check the backend terminal.' }) }
    });
    server.on('error', async e => { console.error(e.code === 'EADDRINUSE' ? 'Port already in use. Change PORT in backend/.env and VITE_API_BASE_URL in frontend/.env, then restart both.' : `Server error: ${e.code || e.name}`); await client.close(); process.exitCode = 1 });
    server.listen(Number(process.env.PORT || 4101), process.env.HOST || '127.0.0.1', () => console.log(`QuoteCraft API ready at http://${process.env.HOST || '127.0.0.1'}:${server.address().port}`));
    async function shutdown() { server.close(async () => { await client.close(); process.exit(0) }); setTimeout(() => process.exit(0), 5000).unref() }
    process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
start().catch((error) => {
    console.error('MongoDB connection error:', error.message);
    process.exitCode = 1;
});