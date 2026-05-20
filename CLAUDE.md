# iCost Project

AI-powered expense tracking app. React 18 + Vite frontend, Express 5 backend, Neon PostgreSQL.

## Run locally with ngrok

```bash
# 1. Build frontend
cd by_figma && npm run build && cd ..

# 2. Start server (production mode — serves API + built frontend on :3001)
cd server && NODE_ENV=production npx tsx src/index.ts &

# 3. Expose via ngrok
ngrok http 3001 &

# 4. Get public URL
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*"'
```

Server runs on port 3001 (or `PORT` env). In production mode it serves both `/api/*` routes and the built frontend from `by_figma/dist`.

### Known issues

- `import.meta.dirname` is `undefined` with tsx. Use `path.dirname(fileURLToPath(import.meta.url))` instead.

## gstack

- Use the `/browse` skill from gstack for all web browsing.
- Never use `mcp__claude-in-chrome__*` tools.

### Available skills

`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/document-generate`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`
