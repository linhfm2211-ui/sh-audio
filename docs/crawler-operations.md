# Crawler Operations

Tai lieu nay mo ta cach nap playlist thu cong va cach chay dead-link detection cho SH Audio.

## 1. Them truyen moi thu cong

Lay YouTube playlist URL, sau do chay dry-run:

```bash
npm run crawler -- "https://www.youtube.com/playlist?list=PLAYLIST_ID" --dry-run --limit 5
```

Kiem tra cac field:

- `story.title`
- `story.slug`
- `story.author`
- `story.narrator`
- `chapters[].title`
- `chapters[].duration_seconds`

Neu on, import vao Supabase:

```bash
npm run crawler -- "https://www.youtube.com/playlist?list=PLAYLIST_ID"
```

## 2. Chay dead-link detection thu cong

Dry-run rieng mot truyen:

```bash
npm run crawler:check-links -- --story-slug tam-doc --dry-run
```

Cap nhat Supabase that:

```bash
npm run crawler:check-links -- --story-slug tam-doc
```

Kiem tra tat ca link dang `available`:

```bash
npm run crawler:check-links -- --dry-run
```

Sau khi on:

```bash
npm run crawler:check-links
```

## 3. Cac trang thai chapter

| Status | Y nghia | UI nen lam gi |
| --- | --- | --- |
| `available` | Video con nghe duoc | Cho hien player |
| `private` | Video bi chuyen private | An nut nghe, bao tap tam thoi khong kha dung |
| `deleted` | Video bi xoa/kenh bi go | An nut nghe, bao link da mat |
| `unavailable` | Loi tam thoi/khong xac dinh | Co the cho retry hoac bao tam thoi loi |

## 4. Chay tu dong sau nay

Project da co san workflow:

```text
.github/workflows/crawler.yml
```

Khi project da len GitHub, dung GitHub Actions:

- Chay crawler import playlist theo danh sach playlist da khai bao.
- Chay dead-link checker 1 lan/ngay.
- Luu secrets trong GitHub Actions, khong commit vao repo.

Secrets can co:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Khuyen nghi lich:

- Crawl metadata playlist: moi 6-12 gio voi truyen dang ra.
- Dead-link detection: moi 24 gio.

### Chay workflow thu cong

Vao GitHub repo -> Actions -> Crawler -> Run workflow.

Muon import playlist moi:

- Dien `playlist_url`.
- De `dry_run = true` lan dau de xem metadata.
- Neu on, chay lai voi `dry_run = false`.

Muon check link:

- De trong `playlist_url`.
- Nhap `story_slug` neu chi muon check mot truyen.
- De trong `story_slug` neu muon check tat ca chapter dang `available`.

## 5. Nguyen tac an toan

- Khong download audio/video.
- Khong dua `SUPABASE_SERVICE_ROLE_KEY` vao frontend.
- Luon chay `--dry-run` voi playlist moi truoc khi import.
- Neu admin da sua tay metadata, crawler sau nay nen tranh ghi de cac field curate.
