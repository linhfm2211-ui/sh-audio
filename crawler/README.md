# SH Audio Crawler

Crawler metadata YouTube playlist cho SH Audio. Script nay chi lay metadata bang `yt-dlp`, khong download audio/video.

## Cai dependencies

```bash
python -m pip install -r crawler/requirements.txt
```

## Chay dry-run

```bash
python crawler/crawl_playlist.py "https://www.youtube.com/playlist?list=PLAYLIST_ID" --dry-run --limit 5
```

Dry-run se in JSON gom `source`, `story`, `chapters`, khong ghi Supabase.

## Ghi vao Supabase

Can bien moi truong:

```text
NEXT_PUBLIC_SUPABASE_URL=https://xzzlrmlapawecahoavqn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

Sau do chay:

```bash
python crawler/crawl_playlist.py "https://www.youtube.com/playlist?list=PLAYLIST_ID"
```

Khong dat `SUPABASE_SERVICE_ROLE_KEY` vao frontend, `.env.local` public, hoac bien `NEXT_PUBLIC_*`.

## Input thu cong playlist moi

Khi muon them truyen moi, chi can lay YouTube playlist URL va chay:

```bash
npm run crawler -- "https://www.youtube.com/playlist?list=PLAYLIST_ID"
```

Nen test truoc bang:

```bash
npm run crawler -- "https://www.youtube.com/playlist?list=PLAYLIST_ID" --dry-run --limit 5
```

Neu dry-run cho title/slug/author sai, sua logic crawler hoac sua thu cong trong Supabase/admin sau khi import.

## Dead link detection

Kiem tra link chet cho tat ca chapter dang `available`:

```bash
npm run crawler:check-links -- --dry-run
```

Kiem tra rieng mot truyen:

```bash
npm run crawler:check-links -- --story-slug tam-doc --dry-run
```

Neu ket qua on, bo `--dry-run` de cap nhat Supabase:

```bash
npm run crawler:check-links -- --story-slug tam-doc
```

Script se cap nhat `chapters.status`:

- `available`: video con lay metadata duoc.
- `private`: video bi private.
- `deleted`: video bi xoa/khong ton tai/kenh bi go.
- `unavailable`: loi tam thoi hoac YouTube/yt-dlp khong xac dinh ro.

Nen chay dinh ky 1 lan/ngay. Sau khi dua project len GitHub, co the tao GitHub Actions cron voi secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Crawler va checker chi dung metadata, khong download audio/video.
