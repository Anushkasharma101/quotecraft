# QuoteCraft

**Turn customer enquiries into clear, editable business quotations.**

QuoteCraft helps small sellers move from “How much would this cost?” to a professional quotation. Paste an enquiry, match it against your catalogue, review quantities and prices, and save or export the result.

Built for the **Hacktoberfest Open-Source AI Challenge — Week 2: Side Hustle**.

https://github.com/Anushkasharma101/quotecraft

## The problem

Small businesses repeatedly translate informal customer messages into product selections, prices and documents. QuoteCraft brings those steps into one workspace. The sample catalogue focuses on carpets; the workflow can be adapted to other product-based businesses.

## Features

- Product catalogue with editable specifications and unit prices.
- Customer records with contact details and addresses.
- Enquiry drafting through an open-weight model served by Ollama.
- Explicit demo mode for trying the workflow without a model.
- Multiple quotation items, custom items and editable quantities/rates.
- Server-calculated subtotal, tax and total.
- Configurable business details, payment terms and delivery estimates.
- Saved quotations with customer, business and item snapshots.
- Manual Draft, Sent, Accepted and Declined statuses.
- Quotation search and browser-based PDF export.
- Separate frontend/backend folders with MongoDB persistence.

## How the AI fits

1. The user pastes an enquiry and selects Local AI mode.
2. The backend sends the enquiry and catalogue to Ollama.
3. The model returns structured product IDs, quantities and warnings.
4. The backend validates the IDs and retrieves catalogue prices from MongoDB.
5. Application code calculates the monetary totals.
6. The user reviews the draft before saving or sharing it.

**The model interprets requirements; it does not set catalogue prices or calculate totals.** Human review is still required, particularly for sizes, materials, missing information and quantities.

### AI mode versus demo mode

| Mode | What it does | Requirement |
| --- | --- | --- |
| Local AI · Ollama | Requests structured output from the configured open-weight model | A reachable Ollama service and downloaded model |
| Demo | Simple keyword matching against the catalogue | No model required |

Demo mode is not AI inference. An unavailable model produces an error rather than silently switching to demo mode.

## Why open innovation matters

The Ollama adapter allows the operator to run inference on hardware they control and change the model without rewriting the quotation interface. This avoids a required closed-model API subscription or per-request model API fee, though inference still has hardware, electricity or hosting costs.

Enquiries do not need to be sent to a closed model API. Privacy still depends on where the app, MongoDB and Ollama are hosted. A setup using MongoDB Atlas is not fully offline.

The default model is `qwen2.5:3b`. Check the license of any model you choose before commercial distribution. No accuracy, latency or cost advantage over a closed API has been benchmarked in this project.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript, Vite |
| Backend | Node.js built-in HTTP server |
| Database | MongoDB with the official Node.js driver |
| AI integration | Ollama and a configurable open-weight model |
| PDF export | Browser print dialog / Save as PDF |
| Tests | Node.js test runner; mongodb-memory-server for integration tests |

## Project structure

```text
frontend/
  index.html
  app.js
  package.json
  package-lock.json
  .env.example
backend/
  server.js
  db.js
  services.js
  seed.js
  tests/
  package.json
  package-lock.json
  .env.example
.gitignore
README.md
```

## Prerequisites

- Node.js **22.12 or later**; Node.js 24 is recommended for consistency.
- npm.
- MongoDB Community Server running locally, or a MongoDB Atlas cluster.
- Ollama and the selected model, if using AI mode.

MongoDB Compass is a database client; installing Compass alone does not provide a local database server.

## Local setup

### 1. Clone the repository

```bash
git clone https://github.com/Anushkasharma101/quotecraft.git
cd quotecraft
```

The following commands assume `frontend/` and `backend/` are directly inside this folder.

### 2. Configure and start the backend

```bash
cd backend
npm install
```

Create `.env` from the example. In PowerShell:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
HOST=127.0.0.1
PORT=4101
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=quotecraft
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
```

For Atlas, replace only the `MONGODB_URI` value with your cluster's connection string, for example:

```env
MONGODB_URI=mongodb+srv://YOUR_DB_USER:YOUR_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
```

Use a database user's credentials, URL-encode special characters in the password, and permit your computer's IP in Atlas Network Access. Keep `MONGODB_DB=quotecraft` on a separate line.

Optionally add the sample catalogue and customer:

```bash
npm run seed
```

Then start the API:

```bash
npm start
```

Health check: **http://127.0.0.1:4101/api/health**

The backend connects to MongoDB before it starts listening. Its root `/` is not a webpage; an “API route not found” response there is expected.

### 3. Configure and start the frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm install
```

Copy `.env.example` to `.env` using the command appropriate to your system. Set:

```env
VITE_API_BASE_URL=http://127.0.0.1:4101/api
```

Run:

```bash
npm run dev
```

Open **http://127.0.0.1:5173** and keep both terminals running.

Copy the example environment files only during initial setup; copying again overwrites your configuration. Restart the relevant server after changing environment variables.

### 4. Enable AI mode

Install [Ollama](https://ollama.com) and download the default model:

```bash
ollama pull qwen2.5:3b
```

Keep Ollama running. If it is not already serving, start it with:

```bash
ollama serve
```

Select **Local AI · Ollama** in QuoteCraft. To use another installed compatible model, change `OLLAMA_MODEL` in the backend environment and restart the backend. Hardware requirements and response times depend on the model and context size.

## Try a quotation

1. Run the sample seed or add a matching product manually.
2. Paste: “I need 2 beige wool carpets, size 6x9 feet. Please share a quotation.”
3. Enter a customer name or select an existing one.
4. Choose AI mode or the clearly labelled Demo mode.
5. Click **Draft quotation** and check the matches.
6. Adjust quantities, rates, tax, terms and delivery as needed.
7. Save the quotation.
8. Use **Export PDF**, then choose **Save as PDF** in the print dialog.

The dashboard counts saved quotations. Accepted value counts records marked Accepted; awaiting a reply counts those marked Sent. Seeding products does not create quotations. Status changes do not send messages automatically.

## Commands

Run each command inside its corresponding folder.

| Folder | Command | Purpose |
| --- | --- | --- |
| backend | `npm start` | Start the API |
| backend | `npm run dev` | Restart the API on source changes |
| backend | `npm run seed` | Add sample products and customer once |
| backend | `npm test` | Run service tests |
| backend | `npm run test:integration` | Run API/database integration tests |
| frontend | `npm run dev` | Start the Vite development server |
| frontend | `npm run build` | Generate `dist/` for static hosting |
| frontend | `npm run preview` | Preview the production build locally |

The seed command is not a database reset. It uses a seed marker to avoid repeat sample insertion. If interrupted midway, inspect the records and marker before retrying.

## API overview

All routes use JSON. Errors return `{ "error": "message" }`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API status and configured model |
| GET | `/api/bootstrap` | Products, customers, quotations and settings |
| GET / POST | `/api/products` | List / create products |
| GET / PUT / DELETE | `/api/products/:id` | Read / update / delete a product |
| GET / POST | `/api/customers` | List / create customers |
| GET / PUT / DELETE | `/api/customers/:id` | Read / update / delete a customer |
| GET / POST | `/api/quotes` | List / create quotations |
| GET / PUT / DELETE | `/api/quotes/:id` | Read / update / delete a quotation |
| PUT | `/api/settings` | Update business settings |
| POST | `/api/draft` | Draft an enquiry with `ollama` or `demo` mode |

Example drafting body:

```json
{
  "enquiry": "I need 2 beige wool carpets, size 6x9 feet.",
  "mode": "ollama"
}
```

## Deploy frontend and backend separately

The app supports separate static frontend hosting and Node.js backend hosting. The configuration below assumes Render and a GitHub repository with the structure shown above; this README does not claim a verified live deployment.

### Backend: Render Web Service

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Build command | `npm ci --omit=dev` |
| Start command | `npm start` |
| Health check | `/api/health` |

Set these in Render's environment dashboard; replace all placeholders:

```env
NODE_VERSION=24
HOST=0.0.0.0
MONGODB_URI=mongodb+srv://YOUR_DB_USER:YOUR_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=quotecraft
FRONTEND_ORIGINS=https://YOUR_FRONTEND_DOMAIN
```

Let the host supply `PORT`. Allow its outbound IP addresses/ranges in Atlas Network Access. Keep database credentials on the backend only.

### Frontend: Render Static Site

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` |

Set before building:

```env
NODE_VERSION=24
VITE_API_BASE_URL=https://YOUR_BACKEND_DOMAIN/api
```

Set the backend's `FRONTEND_ORIGINS` to the frontend's exact HTTPS origin, with no trailing slash. Comma separate multiple allowed origins. Rebuild the frontend after changing `VITE_API_BASE_URL`; it is embedded at build time.

### Hosted AI

Deploying the web app does not deploy Ollama. A remote backend cannot use your laptop's `127.0.0.1:11434` address. Provide a reachable Ollama service through private networking and configure backend `OLLAMA_URL` and `OLLAMA_MODEL`. Demo mode works without this, but is not a replacement for demonstrating actual AI inference.

## Verification status

- Five service tests passed for validation, totals, demo matching and mocked Ollama responses.
- The frontend production build passed in the development environment.
- Full MongoDB integration testing was blocked by a database process permission error in that environment; the test suite is included for local execution.
- Real-model inference and visual browser QA have not been independently verified in the development environment.

Integration tests use an isolated temporary MongoDB instance through mongodb-memory-server. Its initial run may download a MongoDB binary; it does not use your configured production database.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `EADDRINUSE` | Change backend `PORT` and frontend `VITE_API_BASE_URL` together, or stop the existing process. |
| `.env not found` locally | Create `backend/.env`; `.env.example` is only a template. |
| `.env not found` on a host | Dashboard-provided environment variables can be used without an `.env` file. |
| MongoDB connection failure | Check URI, database-user credentials, cluster status and allowed client/server IPs. |
| `querySrv ECONNREFUSED` | Check SRV DNS resolution; if needed, obtain the standard non-SRV URI from Atlas rather than just changing its prefix. |
| TLS handshake failure | Verify Atlas network access, exact connection string and runtime/network settings; the alert alone does not establish the cause. Keep TLS verification enabled. |
| Origin not allowed | Match the frontend origin in `FRONTEND_ORIGINS`, then restart/redeploy the backend. |
| Frontend cannot reach API | Check `/api/health`, the configured API URL, and whether the frontend was rebuilt after changes. |
| Empty catalogue | Add products or run the optional sample seed against the same database. |
| Zero quotation counters | Save quotations; sample products alone do not populate these counters. |
| AI unavailable | Confirm Ollama is running at the configured address and the model is installed. |

## Current scope

This is a single-workspace MVP, not a multi-user SaaS. Authentication, authorization and tenant isolation are not implemented. CORS is not authentication: add access control before exposing real customer records publicly.

Attachment parsing, email/WhatsApp sending, payments, automated follow-ups and time-saved tracking are not implemented. PDF export uses the browser print dialog. The default tax rate is illustrative and must be configured for the business.

Never commit `.env` files or real credentials. Keep placeholders in `.env.example`. If a credential is exposed, rotate it; removing it from the latest file does not remove it from Git history.

## Roadmap

- Authentication and per-business workspaces.
- Tests with real enquiries and the configured model.
- Missing-information prompts before drafting.
- Secure hosted inference and deployment verification.
- Document attachments and sharing integrations.

## Contributing

Issues and focused pull requests are welcome. Include reproduction steps for bugs, avoid real customer data in examples, and run the relevant tests/build before submitting a change.

## License

No project license has been specified in this README. Check the repository for a LICENSE file; add a license before inviting reuse under open-source terms. Dependencies and model weights have their own licenses.

## Author

Built by [Anushka Sharma](https://github.com/Anushkasharma101).
