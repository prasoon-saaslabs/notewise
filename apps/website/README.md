# Notewise marketing site

Next.js landing page and product docs for **Notewise**, living in the monorepo at `apps/website`.

## Run locally

From the repo root:

```bash
make setup      # once
make website    # → http://localhost:5174
```

Or directly:

```bash
pnpm --filter @notewise/website dev
```

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Motion (Framer Motion)
- Lenis smooth scroll
- Shared UI tokens from `@notewise/ui`

## Routes

| Path | Description |
| ---- | ----------- |
| `/` | Landing page (from notewise-app) |
| `/download` | macOS DMG + source install |
| `/docs` | Documentation index |
| `/docs/[topic]` | Individual doc pages |
| `/features` | Feature overview |
| `/stories` | User stories |
| `/open-source` | MIT license & contributing |
| `/privacy` | Privacy policy |

## Environment

Copy `.env.example` to `.env.local` for local DMG/GitHub URLs:

```bash
NEXT_PUBLIC_GITHUB_URL=https://github.com/prasoon-saaslabs/notewise
NEXT_PUBLIC_DMG_URL=
NEXT_PUBLIC_DMG_URL_INTEL=
```

These are public build-time values — never put secrets here.

## Deploy

Vercel uses the root [`vercel.json`](../../vercel.json):

```bash
pnpm --filter @notewise/website build
```

Set `NEXT_PUBLIC_*` env vars in Vercel Production + Preview.
