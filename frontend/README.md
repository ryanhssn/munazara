# Munazara — Frontend

Next.js debate room UI for the [Munazara](../) AI debate arena.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Munazara backend URL |

## Stack

- **Next.js 15** (App Router)
- **Tailwind CSS**
- Fonts: Source Serif 4, IBM Plex Mono, IBM Plex Sans, Noto Naskh Arabic

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run lint     # ESLint
```
