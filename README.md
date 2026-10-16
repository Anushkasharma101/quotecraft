# QuoteCraft — separate frontend + MongoDB backend

This version keeps the QuoteCraft design and replaces SQLite with MongoDB. Frontend and backend run independently and can be hosted separately. It is a new MongoDB project; records from your previous SQLite database are not automatically transferred.

## Folders

- **frontend/** — HTML/CSS/JavaScript interface built with Vite, frontend environment settings, production build
- **backend/** — Node.js JSON API, MongoDB connection/repository, validation, quotation calculations, Ollama integration, seed command, tests

Requires Node.js 22.12+ (your Node.js 24 works), npm, and either a running MongoDB Community Server or a MongoDB Atlas connection. MongoDB Compass alone is a database client, not the database server.

## 1. Configure MongoDB

For local MongoDB, install/start MongoDB Community Server. The default URI is:

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=quotecraft
```

For Atlas, create a cluster and database user, allow your current IP under Network Access, and copy the Node.js driver connection string into `backend/.env`. Replace its username/password with your database user's credentials; URL-encode special characters in the password. Keep this URI out of frontend files and Git.

```env
MONGODB_URI=mongodb+srv://YOUR_DB_USER:YOUR_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=quotecraft
```

The backend creates collections as they are used. No SQL tables or setup-db command are needed. Collections: products, customers, quotes, settings, counters, seeds. Numeric `_id` counters preserve readable quotation numbers and the existing frontend API contract.

## 2. Start the backend — terminal 1

From the extracted project's root:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edit `backend/.env` to set your MongoDB URI. Then:

```powershell
npm run seed
npm start
```

- API: **http://127.0.0.1:4101/api**
- Health: **http://127.0.0.1:4101/api/health**
- The API only starts listening after MongoDB connects.
- `npm run seed` adds three sample carpet products and Priya Mehta. Re-running it does not repeat the sample seed. This command is optional; you can add products/customers manually.
- Seed is not a reset command. If a seed run is interrupted, inspect the partial data before changing its marker in the seeds collection.

## 3. Start the frontend — terminal 2

From the extracted project's root:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open **http://127.0.0.1:5173**. Keep both terminals running.

Only copy `.env.example` on initial setup; repeating it overwrites your settings. Linux/macOS: replace `Copy-Item` with `cp`.

`frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:4101/api
```

`backend/.env`:

```env
HOST=127.0.0.1
PORT=4101
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=quotecraft
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
```

If port 4101 is occupied, choose another backend PORT and update VITE_API_BASE_URL to match. Restart both servers after environment changes. Frontend port 5173 is strict: if occupied, stop the other app or update the frontend dev command and FRONTEND_ORIGINS together.

## 4. AI drafting

Install Ollama and pull the configured model:

```text
ollama pull qwen2.5:3b
```

Keep Ollama running. Choose **Local AI · Ollama** in the enquiry screen. The backend sends the enquiry and catalogue to the configured Ollama server, validates product IDs/quantities, and gets catalogue prices from MongoDB. Totals are calculated by code.

Choose **Demo** to test the app without a model; this is explicitly a simple keyword matcher, not AI. AI errors do not silently switch to demo mode. Review all specifications, quantities, taxes and delivery details before sharing a quote. Default tax is sample configuration; adjust it for your business.

## Included workflows

- Product create, edit, delete and catalogue selection
- Customer create, edit, delete, with deletion blocked for customers with quotations
- Enquiry draft via Ollama or explicit demo mode
- Multiple line items, custom items, editable names/details/quantities/rates
- Server-calculated quotation totals
- Save and update quotations; customer/product/business snapshots
- Manual Draft, Sent, Accepted and Declined status (no automatic messages are sent)
- Quotation search, PDF printing through the browser
- Business settings, tax rate, delivery estimate and payment terms
- Persistence in MongoDB across server restarts

## Build / deployment configuration

Frontend:

```text
npm run build
```

Host `frontend/dist` on a static host. Set `VITE_API_BASE_URL=https://your-api-domain/api` **before building**; Vite embeds it into the output. No MongoDB credentials belong in VITE variables.

Backend: deploy the **backend/** folder on a Node.js host. Install production packages with `npm ci --omit=dev`, run `npm start`, and configure:

- HOST=0.0.0.0
- PORT supplied by the host
- MONGODB_URI and MONGODB_DB for your database
- FRONTEND_ORIGINS=https://your-frontend-domain (exact origins, no trailing slash; comma separate additional origins)
- OLLAMA_URL pointing to an AI service reachable privately by the backend
- OLLAMA_MODEL matching its installed model

MongoDB Atlas network rules must permit the backend host's outbound IP. A hosted backend's 127.0.0.1 points to that host, not to your laptop. Deploying the app does not deploy Ollama automatically.

This remains a single-workspace MVP with no authentication or tenant isolation. CORS restricts browser origins but is not authentication. Add login/authorization before putting real business data in a public deployment. This package does not purchase or deploy hosting; the earlier hosted design link remains unchanged.

## Verification

Backend:

```text
npm test
npm run test:integration
```

- `npm test`: 5 passing service tests for totals, input validation, demo matching, no-match cases and mocked Ollama structured responses/unknown IDs.
- `npm run test:integration`: real MongoDB API/persistence/CORS workflow using mongodb-memory-server. This downloads/starts a temporary MongoDB server, uses an isolated database and cleans it up. It never points to your real database.
- Frontend production build passed.
- The integration suite could not complete in the generation environment: MongoDB exited with an `open: Operation not permitted` error. Run it on your computer to verify the complete database flow. MongoDB persistence has not been confirmed here.
- Real model inference and browser visual QA have not been performed.

## Troubleshooting

- **Could not connect to MongoDB:** start the local database service or check Atlas URI, database-user password and allowed IPs. Compass by itself does not start MongoDB.
- **Origin not allowed:** add the exact frontend origin to FRONTEND_ORIGINS and restart the backend.
- **Cannot connect to backend:** verify the API health URL, backend terminal and frontend API URL; restart Vite after changing its environment.
- **AI unavailable:** start Ollama, pull the configured model and check its URL. Initial loading may be slow; timeout is 90 seconds.
- **Blank catalogue:** run `npm run seed` inside backend or add products manually.
- **PDF:** choose Save as PDF in the print dialog; disable browser headers/footers if desired.

Official references:
- https://www.mongodb.com/docs/drivers/node/current/crud/compound-operations/
- https://vite.dev/guide/env-and-mode
- https://github.com/ollama/ollama/blob/main/docs/api.md
