# iCost

AI-powered expense tracking app. Upload receipt screenshots and let AI parse them into structured transactions.

## How it works

1. **Upload** a receipt screenshot (bank notification, payment confirmation, store receipt)
2. **OCR** via Baidu OCR extracts text from the image
3. **LLM parsing** via DeepSeek identifies merchant, amount, date, and category
4. **Review & save** — single receipts auto-save, batches open a review panel

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS 4, MUI 7, Radix UI, Recharts |
| Backend | Express 5, TypeScript, Drizzle ORM |
| Database | Neon PostgreSQL (serverless) |
| AI | Baidu OCR + DeepSeek API (Anthropic-compatible) |

## Project structure

```
icost/
├── by_figma/          # React frontend (Vite + Tailwind)
│   └── src/
│       ├── app/           # Main app + components
│       └── api/           # API client
├── server/            # Express backend
│   └── src/
│       ├── db.ts          # Database schema (Drizzle)
│       ├── client.ts      # OCR & LLM parsing pipeline
│       ├── routes/        # REST API routes
│       └── index.ts       # Server entry point
└── package.json       # Root orchestration scripts
```

## Getting started

### Prerequisites

- Node.js 18+
- A [Neon PostgreSQL](https://neon.tech) database
- [Baidu OCR](https://console.bce.baidu.com/ai/#/ai/ocr/overview/index) API credentials
- [DeepSeek](https://api.deepseek.com) API key

### Setup

```bash
# 1. Clone and install dependencies
npm install
cd by_figma && npm install && cd ..
cd server && npm install && cd ..

# 2. Configure environment
cp server/.env.example server/.env
# Fill in DATABASE_URL, BAIDU_API_KEY, BAIDU_SECRET_KEY, ANTHROPIC_AUTH_TOKEN

# 3. Run database migration
npm run migrate

# 4. Start development servers
cd server && npm run dev       # Backend on :3001
cd by_figma && npm run dev     # Frontend on :5173

# 5. Build for production
npm run build
npm start
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transactions?month=YYYY-MM` | List transactions |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/budget?month=YYYY-MM` | Get budget |
| PUT | `/api/budget?month=YYYY-MM` | Set budget |
| POST | `/api/transactions/parse-receipt` | Parse receipt image(s) |
| GET | `/api/health` | Health check |

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `ANTHROPIC_BASE_URL` | DeepSeek API base URL |
| `ANTHROPIC_AUTH_TOKEN` | DeepSeek API key |
| `ANTHROPIC_MODEL` | LLM model for general use |
| `ANTHROPIC_PARSING_MODEL` | LLM model for receipt parsing |
| `BAIDU_API_KEY` | Baidu OCR API key |
| `BAIDU_SECRET_KEY` | Baidu OCR secret key |
| `PORT` | Server port (default: 3001) |
