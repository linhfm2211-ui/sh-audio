# SH Audio

PWA Audio Truyen theo mo hinh aggregate: frontend hien thi metadata tu YouTube playlist, khong host va khong download audio.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS 4
- shadcn/ui style components
- Supabase PostgreSQL + Auth
- next-pwa

## Supabase

Project hien tai:

- URL: `https://xzzlrmlapawecahoavqn.supabase.co`
- Publishable key: xem `.env.example`
- Schema report: [docs/database-schema-report.md](docs/database-schema-report.md)

Khong dua `SUPABASE_SERVICE_ROLE_KEY` vao client hoac bien `NEXT_PUBLIC_*`.

## Local Development

```bash
npm install
npm run dev
```

Mo app tai:

```text
http://127.0.0.1:3000
```

Tren may Windows hien tai, Next native SWC khong load duoc, nen script `dev/build/start` tu dong dung SWC WASM fallback neu package co san.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run crawler -- "https://www.youtube.com/playlist?list=PLAYLIST_ID" --dry-run --limit 5
```

## Project Structure

```text
src/
  app/                 App Router routes, layout, global styles
  components/ui/       shadcn/ui-style primitives
  config/              Site-level config
  lib/                 Shared utilities and Supabase clients
  types/               Database and local type declarations
docs/                  Product and database documentation
public/                PWA manifest, icons, static assets
scripts/               Local command wrappers
crawler/               Python YouTube metadata crawler
```

## Next Steps

1. Add a real playlist URL and run crawler dry-run.
2. Add `SUPABASE_SERVICE_ROLE_KEY` in a server-only environment.
3. Build real data queries from Supabase for home/search/story detail.
4. Add player page and user progress sync.
