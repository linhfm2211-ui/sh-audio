# Bao cao thiet ke Database Schema - PWA Audio Truyen

Phien ban: 1.0  
Ngay tao: 2026-05-23  
Pham vi: MVP 8 tuan  
Stack lien quan: Supabase PostgreSQL, Supabase Auth, Next.js 15 App Router, Python crawler, Upstash Redis

## 0. Supabase project hien tai

Project Supabase da tao cho MVP:

| Thong tin | Gia tri |
| --- | --- |
| Project name | SH Audio |
| Project ref | `xzzlrmlapawecahoavqn` |
| Region | `ap-southeast-1` |
| API URL | `https://xzzlrmlapawecahoavqn.supabase.co` |
| Migration 1 | `20260523081342_init_audio_truyen_schema` |
| Migration 2 | `20260523083459_add_source_policy_and_fk_indexes` |

Trang thai sau khi tao:

- Security advisor: khong con canh bao.
- Performance advisor: chi bao `unused_index`, binh thuong voi database moi chua co traffic/query.
- Seed data ban dau: 7 tags MVP.

## 1. Muc tieu thiet ke

Database duoc thiet ke cho website PWA Audio Truyen theo mo hinh aggregate. He thong khong host file audio, khong download noi dung YouTube, chi luu metadata va link nguon de hien thi trai nghiem nghe tot hon tren giao dien rieng.

Muc tieu chinh cua schema:

- Luu danh sach truyen, tap, nguon YouTube playlist/video.
- Ho tro crawler Python cap nhat metadata dinh ky.
- Ho tro trang chu, tim kiem, loc theo the loai va SEO.
- Ho tro user resume vi tri nghe, bookmark chuong, theo doi truyen.
- Bat Row Level Security tren tat ca bang public theo khuyen nghi Supabase.
- Tach ro du lieu public va du lieu rieng cua user.
- Giu schema du don gian cho MVP nhung co du diem mo rong sau nay.

## 2. Nguyen tac san pham anh huong den database

### 2.1 Khong host audio

He thong chi luu:

- YouTube playlist ID.
- YouTube video ID.
- URL video.
- Thumbnail.
- Duration.
- View count.
- Trang thai video con kha dung hay khong.

He thong khong luu:

- File audio.
- File video.
- Transcript day du neu khong co co so phap ly ro rang.
- Ban sao noi dung co ban quyen.

### 2.2 Metadata la tai san chinh

Gia tri cua san pham nam o viec lam sach va cau truc metadata:

- Ten truyen dung chuan.
- Thu tu chuong dung.
- Tag/the loai de loc.
- Cover dep.
- Mo ta SEO.
- Trang thai hoan/dang ra.
- Link nguon con hoat dong.

### 2.3 Mobile-first va PWA

Database can phuc vu nhanh cac truy van:

- Trang chu lay danh sach truyen moi/noi bat.
- Trang chi tiet lay story + chapters.
- Tim kiem theo title.
- Lay user progress gan nhat.
- Lay bookmark va library cua user.

### 2.4 Offline caching gioi han

Voi YouTube embed, service worker khong nen va gan nhu khong the cache audio YouTube de nghe offline that su. Cach hieu phu hop cho MVP la:

- Cache app shell.
- Cache metadata cac truyen/tap gan day.
- Cache trang chi tiet va danh sach chuong.
- Khi user nghe, playback van can mang vi audio stream tu YouTube.

Neu sau nay can offline audio that su, san pham phai chuyen sang mo hinh co quyen phan phoi audio hoac hop tac noi dung, khi do schema va phap ly can thiet ke lai.

## 3. Tong quan cac nhom bang

Schema MVP gom 4 nhom bang:

| Nhom | Bang | Vai tro |
| --- | --- | --- |
| Noi dung public | `stories`, `chapters`, `tags`, `story_tags`, `sources` | Metadata truyen, tap, tag, nguon YouTube |
| Du lieu ca nhan | `user_progress`, `bookmarks`, `user_library` | Resume, bookmark, theo doi truyen |
| Enum/domain | `story_status`, `chapter_status` | Rang buoc trang thai |
| Mo rong tuong lai | ratings, comments, reports, playlists | Chua can trong MVP |

## 4. Enum types

### 4.1 `story_status`

```sql
create type story_status as enum ('ongoing', 'completed', 'paused', 'dropped');
```

Y nghia:

- `ongoing`: truyen dang ra tap.
- `completed`: truyen da hoan.
- `paused`: tam dung, chua ro co tiep tuc hay khong.
- `dropped`: bi drop hoac khong con theo doi nua.

Ly do dung enum:

- Giam loi typo trong code/crawler.
- De filter nhanh.
- De UI map sang label tieng Viet on dinh.

### 4.2 `chapter_status`

```sql
create type chapter_status as enum ('available', 'unavailable', 'private', 'deleted');
```

Y nghia:

- `available`: video dang nghe duoc.
- `unavailable`: video loi tam thoi hoac crawler khong xac minh duoc.
- `private`: video bi chuyen sang private.
- `deleted`: video bi xoa.

Khong nen xoa chapter khi video chet. Nen giu record de:

- Khong lam mat lich su nghe/bookmark.
- Co the hien thi fallback UI.
- Co the tim nguon thay the sau nay.

## 5. Bang `sources`

### 5.1 Muc dich

Luu nguon crawl metadata, chu yeu la YouTube playlist/channel.

Bang nay giup truy vet:

- Story/tap den tu playlist nao.
- Lan crawl cuoi la khi nao.
- Playlist nao bi loi hoac can crawl lai.
- Sau nay co the them nguon khac ngoai YouTube.

### 5.2 De xuat DDL

```sql
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'youtube',
  channel_id text,
  channel_title text,
  playlist_id text unique,
  playlist_url text not null,
  created_at timestamptz not null default now(),
  last_crawled_at timestamptz
);
```

### 5.3 Ghi chu cot

| Cot | Kieu | Ghi chu |
| --- | --- | --- |
| `id` | uuid | Khoa chinh noi bo |
| `platform` | text | Mac dinh `youtube`, mo rong cho nguon khac |
| `channel_id` | text | ID kenh YouTube neu crawler lay duoc |
| `channel_title` | text | Ten kenh/reader/nhom doc |
| `playlist_id` | text | Unique de tranh crawl trung playlist |
| `playlist_url` | text | URL nguon |
| `created_at` | timestamptz | Thoi diem them nguon |
| `last_crawled_at` | timestamptz | Lan crawl gan nhat |

### 5.4 RLS

`sources` chi chua metadata nguon YouTube public, nen project hien tai da mo read-only cho `anon` va `authenticated`. Crawler dung `service_role` de insert/update, frontend khong co quyen ghi.

```sql
create policy "Public can read sources"
on public.sources for select
to anon, authenticated
using (true);
```

## 6. Bang `stories`

### 6.1 Muc dich

Luu metadata cap truyen. Day la bang trung tam cua he thong.

### 6.2 De xuat DDL

```sql
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  original_title text,
  author text,
  narrator text,
  description text,
  cover_image_url text,
  status story_status not null default 'ongoing',
  chapter_count int not null default 0,
  total_duration_seconds int not null default 0,
  source_id uuid references public.sources(id) on delete set null,
  yt_playlist_id text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 6.3 Ghi chu cot

| Cot | Kieu | Bat buoc | Ghi chu |
| --- | --- | --- | --- |
| `id` | uuid | Co | ID noi bo |
| `slug` | text | Co | Dung cho URL SEO: `/truyen/{slug}` |
| `title` | text | Co | Ten truyen hien thi |
| `original_title` | text | Khong | Ten goc neu co |
| `author` | text | Khong | Tac gia |
| `narrator` | text | Khong | Nguoi doc/kenh doc |
| `description` | text | Khong | Mo ta phuc vu SEO va trang chi tiet |
| `cover_image_url` | text | Khong | Anh bia, co the lay thumbnail hoac upload rieng |
| `status` | enum | Co | Trang thai truyen |
| `chapter_count` | int | Co | Tong so tap hien co |
| `total_duration_seconds` | int | Co | Tong thoi luong de hien thi |
| `source_id` | uuid | Khong | Link ve playlist/nguon crawl |
| `yt_playlist_id` | text | Khong | Denormalize de crawler/query nhanh |
| `published` | boolean | Co | Kiem soat an/hien tren public site |
| `created_at` | timestamptz | Co | Thoi diem tao |
| `updated_at` | timestamptz | Co | Thoi diem cap nhat |

### 6.4 Truy van chinh

- Trang chu:

```sql
select *
from public.stories
where published = true
order by updated_at desc
limit 20;
```

- SEO detail:

```sql
select *
from public.stories
where slug = :slug and published = true;
```

- Filter theo status:

```sql
select *
from public.stories
where published = true and status = 'completed';
```

## 7. Bang `chapters`

### 7.1 Muc dich

Luu metadata cap tap/chuong, moi row gan voi mot YouTube video.

### 7.2 De xuat DDL

```sql
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  chapter_number int not null,
  title text not null,
  yt_video_id text not null unique,
  yt_url text not null,
  thumbnail_url text,
  duration_seconds int,
  view_count bigint,
  status chapter_status not null default 'available',
  published_at timestamptz,
  crawled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id, chapter_number)
);
```

### 7.3 Ghi chu cot

| Cot | Kieu | Bat buoc | Ghi chu |
| --- | --- | --- | --- |
| `id` | uuid | Co | ID noi bo |
| `story_id` | uuid | Co | Thuoc truyen nao |
| `chapter_number` | int | Co | Thu tu nghe |
| `title` | text | Co | Title da lam sach hoac title YouTube |
| `yt_video_id` | text | Co | Unique de tranh trung video |
| `yt_url` | text | Co | URL embed/play |
| `thumbnail_url` | text | Khong | Anh YouTube |
| `duration_seconds` | int | Khong | Thoi luong video |
| `view_count` | bigint | Khong | View count tu YouTube, co the null |
| `status` | enum | Co | Trang thai link |
| `published_at` | timestamptz | Khong | Ngay video publish |
| `crawled_at` | timestamptz | Co | Lan crawler lay data |
| `created_at` | timestamptz | Co | Thoi diem tao row |
| `updated_at` | timestamptz | Co | Thoi diem cap nhat |

### 7.4 Rang buoc quan trong

- `yt_video_id unique`: mot video YouTube chi nen co mot chapter trong he thong.
- `unique (story_id, chapter_number)`: mot truyen khong co hai chuong cung so.
- `on delete cascade` voi `story_id`: neu xoa story, xoa chapters lien quan. Tuy nhien production nen uu tien `published=false` hon la xoa story.

### 7.5 Truy van chinh

Lay danh sach chuong:

```sql
select *
from public.chapters
where story_id = :story_id and status = 'available'
order by chapter_number asc;
```

Lay chuong tiep theo:

```sql
select *
from public.chapters
where story_id = :story_id
  and chapter_number > :current_chapter_number
  and status = 'available'
order by chapter_number asc
limit 1;
```

## 8. Bang `tags`

### 8.1 Muc dich

Luu danh muc the loai/trope/filter.

Vi du:

- `dam-my`
- `co-dai`
- `hien-dai`
- `he`
- `be`
- `ngot`
- `nguoc`
- `xuyen-khong`
- `trong-sinh`

### 8.2 De xuat DDL

```sql
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);
```

### 8.3 Ghi chu

Tag nen duoc curate thu cong trong MVP. Crawler co the goi y tag bang keyword, nhung khong nen auto publish neu chua review vi tag la yeu to UX/SEO quan trong.

## 9. Bang `story_tags`

### 9.1 Muc dich

Quan he many-to-many giua story va tag.

### 9.2 De xuat DDL

```sql
create table public.story_tags (
  story_id uuid not null references public.stories(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (story_id, tag_id)
);
```

### 9.3 Truy van chinh

Loc story theo tag:

```sql
select s.*
from public.stories s
join public.story_tags st on st.story_id = s.id
join public.tags t on t.id = st.tag_id
where s.published = true
  and t.slug = :tag_slug
order by s.updated_at desc;
```

## 10. Bang `user_progress`

### 10.1 Muc dich

Luu vi tri nghe cuoi cung cua user theo tung chapter.

Bang nay phuc vu:

- Resume tren cung thiet bi.
- Sync resume giua thiet bi khi user login.
- Trang "Tiep tuc nghe".
- Goi y chuong tiep theo.

### 10.2 De xuat DDL

```sql
create table public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  position_seconds int not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);
```

### 10.3 Ghi chu cot

| Cot | Kieu | Ghi chu |
| --- | --- | --- |
| `user_id` | uuid | Lay tu Supabase Auth |
| `chapter_id` | uuid | Chapter dang nghe |
| `story_id` | uuid | Denormalize de query nhanh trang story/progress |
| `position_seconds` | int | Vi tri nghe cuoi |
| `completed` | boolean | Da nghe xong hay chua |
| `updated_at` | timestamptz | Dung sort "tiep tuc nghe" |

### 10.4 Logic cap nhat

Frontend nen debounce update progress, vi du moi 10-30 giay hoac khi pause/unload.

Khi `position_seconds >= duration_seconds * 0.9`, co the danh dau `completed = true`.

### 10.5 Truy van chinh

Trang tiep tuc nghe:

```sql
select *
from public.user_progress
where user_id = :user_id
order by updated_at desc
limit 20;
```

## 11. Bang `bookmarks`

### 11.1 Muc dich

Luu bookmark cua user tai mot vi tri trong chapter.

Co hai use case:

- Bookmark chapter dang nghe.
- Bookmark mot timestamp cu the trong chapter.

### 11.2 De xuat DDL

```sql
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  position_seconds int not null default 0,
  note text,
  created_at timestamptz not null default now()
);
```

### 11.3 Ghi chu

MVP cho phep nhieu bookmark trong cung mot chapter. Neu muon chi co mot bookmark moi chapter/user, them unique:

```sql
create unique index bookmarks_one_per_chapter_idx
on public.bookmarks(user_id, chapter_id);
```

Khuyen nghi MVP: khong them unique nay, vi bookmark timestamp co ich hon.

## 12. Bang `user_library`

### 12.1 Muc dich

Luu danh sach truyen user theo doi/luu vao thu vien.

### 12.2 De xuat DDL

```sql
create table public.user_library (
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  followed boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);
```

### 12.3 Ghi chu

`followed` giup sau nay co the soft-unfollow ma van giu lich su. Neu muon don gian hon, co the xoa row khi unfollow.

## 13. Indexes

### 13.1 Index MVP

```sql
create index stories_title_idx
on public.stories using gin (to_tsvector('simple', title));

create index stories_status_idx
on public.stories(status);

create index chapters_story_order_idx
on public.chapters(story_id, chapter_number);

create index user_progress_user_updated_idx
on public.user_progress(user_id, updated_at desc);

create index bookmarks_user_created_idx
on public.bookmarks(user_id, created_at desc);

create index stories_source_id_idx
on public.stories(source_id);

create index story_tags_tag_id_idx
on public.story_tags(tag_id);

create index user_progress_chapter_id_idx
on public.user_progress(chapter_id);

create index user_progress_story_id_idx
on public.user_progress(story_id);

create index bookmarks_chapter_id_idx
on public.bookmarks(chapter_id);

create index bookmarks_story_id_idx
on public.bookmarks(story_id);

create index user_library_story_id_idx
on public.user_library(story_id);
```

Nhom index FK bo sung duoc them sau khi chay Supabase performance advisor. Cac canh bao `unused_index` co the bo qua trong giai doan moi tao database, vi index chua co co hoi duoc dung boi query thuc te.

### 13.2 Ghi chu tim kiem tieng Viet

Postgres built-in full-text search khong toi uu hoan hao cho tieng Viet khong dau/co dau. Trong MVP co the dung:

- `to_tsvector('simple', title)` cho search co ban.
- `ilike` cho fallback don gian.
- Upstash Redis cache ket qua query pho bien.

Khi scale, nen xem xet:

- `pg_trgm` cho fuzzy search.
- Meilisearch/Typesense neu search la tinh nang trong tam.

De them fuzzy search Postgres:

```sql
create extension if not exists pg_trgm;
create index stories_title_trgm_idx
on public.stories using gin (title gin_trgm_ops);
```

## 14. Row Level Security

### 14.1 Nguyen tac

Tat ca bang trong `public` bat RLS. Ly do:

- Supabase Data API co the expose bang public.
- RLS bao ve du lieu neu frontend bi goi truc tiep bang anon key.
- Du lieu ca nhan cua user phai duoc co lap theo `auth.uid()`.

### 14.2 Enable RLS

```sql
alter table public.sources enable row level security;
alter table public.stories enable row level security;
alter table public.tags enable row level security;
alter table public.story_tags enable row level security;
alter table public.chapters enable row level security;
alter table public.user_progress enable row level security;
alter table public.bookmarks enable row level security;
alter table public.user_library enable row level security;
```

### 14.3 Public read policies

```sql
create policy "Public can read published stories"
on public.stories for select
to anon, authenticated
using (published = true);

create policy "Public can read available chapters"
on public.chapters for select
to anon, authenticated
using (status = 'available');

create policy "Public can read sources"
on public.sources for select
to anon, authenticated
using (true);

create policy "Public can read tags"
on public.tags for select
to anon, authenticated
using (true);

create policy "Public can read story tags"
on public.story_tags for select
to anon, authenticated
using (true);
```

### 14.4 User-owned policies

```sql
create policy "Users manage own progress"
on public.user_progress for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage own bookmarks"
on public.bookmarks for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage own library"
on public.user_library for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

### 14.5 Ghi chu ve crawler va admin writes

Crawler chay trong GitHub Actions nen ghi database bang Supabase service role key o server-side secret.

Quy tac bao mat:

- Khong bao gio dua service role key vao frontend.
- Khong dat service role key trong bien `NEXT_PUBLIC_*`.
- GitHub Actions secret chi dung trong workflow crawler.
- Frontend chi dung publishable/anon key.

Voi RLS, service role co the bypass policy. Day la ly do crawler khong can public insert/update policy.

## 15. SQL tong hop de tao schema MVP

```sql
create extension if not exists pgcrypto;

create type story_status as enum ('ongoing', 'completed', 'paused', 'dropped');
create type chapter_status as enum ('available', 'unavailable', 'private', 'deleted');

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'youtube',
  channel_id text,
  channel_title text,
  playlist_id text unique,
  playlist_url text not null,
  created_at timestamptz not null default now(),
  last_crawled_at timestamptz
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  original_title text,
  author text,
  narrator text,
  description text,
  cover_image_url text,
  status story_status not null default 'ongoing',
  chapter_count int not null default 0,
  total_duration_seconds int not null default 0,
  source_id uuid references public.sources(id) on delete set null,
  yt_playlist_id text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);

create table public.story_tags (
  story_id uuid not null references public.stories(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (story_id, tag_id)
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  chapter_number int not null,
  title text not null,
  yt_video_id text not null unique,
  yt_url text not null,
  thumbnail_url text,
  duration_seconds int,
  view_count bigint,
  status chapter_status not null default 'available',
  published_at timestamptz,
  crawled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id, chapter_number)
);

create table public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  position_seconds int not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  position_seconds int not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create table public.user_library (
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  followed boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

create index stories_title_idx
on public.stories using gin (to_tsvector('simple', title));

create index stories_status_idx
on public.stories(status);

create index chapters_story_order_idx
on public.chapters(story_id, chapter_number);

create index user_progress_user_updated_idx
on public.user_progress(user_id, updated_at desc);

create index bookmarks_user_created_idx
on public.bookmarks(user_id, created_at desc);

create index stories_source_id_idx
on public.stories(source_id);

create index story_tags_tag_id_idx
on public.story_tags(tag_id);

create index user_progress_chapter_id_idx
on public.user_progress(chapter_id);

create index user_progress_story_id_idx
on public.user_progress(story_id);

create index bookmarks_chapter_id_idx
on public.bookmarks(chapter_id);

create index bookmarks_story_id_idx
on public.bookmarks(story_id);

create index user_library_story_id_idx
on public.user_library(story_id);

alter table public.sources enable row level security;
alter table public.stories enable row level security;
alter table public.tags enable row level security;
alter table public.story_tags enable row level security;
alter table public.chapters enable row level security;
alter table public.user_progress enable row level security;
alter table public.bookmarks enable row level security;
alter table public.user_library enable row level security;

create policy "Public can read published stories"
on public.stories for select
to anon, authenticated
using (published = true);

create policy "Public can read available chapters"
on public.chapters for select
to anon, authenticated
using (status = 'available');

create policy "Public can read sources"
on public.sources for select
to anon, authenticated
using (true);

create policy "Public can read tags"
on public.tags for select
to anon, authenticated
using (true);

create policy "Public can read story tags"
on public.story_tags for select
to anon, authenticated
using (true);

create policy "Users manage own progress"
on public.user_progress for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage own bookmarks"
on public.bookmarks for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage own library"
on public.user_library for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

## 16. Du lieu mau de test

```sql
insert into public.tags (slug, name)
values
  ('dam-my', 'Dam my'),
  ('co-dai', 'Co dai'),
  ('hien-dai', 'Hien dai'),
  ('he', 'HE'),
  ('be', 'BE'),
  ('ngot', 'Ngot'),
  ('nguoc', 'Nguoc');
```

Data story/chapter nen de crawler tao tu playlist that thay vi seed tay qua nhieu.

## 17. Mapping voi crawler Python

Crawler playlist dau tien nen lam cac viec sau:

1. Nhan input la YouTube playlist URL hoac playlist ID.
2. Dung `yt-dlp` lay metadata playlist, khong download audio/video.
3. Upsert `sources` theo `playlist_id`.
4. Tao hoac update `stories`.
5. Tao hoac update `chapters` theo `yt_video_id`.
6. Cap nhat `stories.chapter_count`.
7. Cap nhat `stories.total_duration_seconds`.
8. Cap nhat `sources.last_crawled_at`.

Pseudo mapping:

| yt-dlp metadata | Bang/cot |
| --- | --- |
| playlist id | `sources.playlist_id`, `stories.yt_playlist_id` |
| playlist title | `stories.title` |
| channel id | `sources.channel_id` |
| channel title | `sources.channel_title`, `stories.narrator` |
| video id | `chapters.yt_video_id` |
| video url | `chapters.yt_url` |
| video title | `chapters.title` |
| duration | `chapters.duration_seconds` |
| thumbnail | `chapters.thumbnail_url` |
| upload date | `chapters.published_at` |
| view count | `chapters.view_count` |

Crawler nen co co che lam sach title chuong, vi title YouTube thuong chua nhieu noise nhu ten kenh, so tap, emoji, tag.

## 18. Mapping voi Next.js frontend

### 18.1 Route de xuat

| Route | Query chinh |
| --- | --- |
| `/` | `stories` moi/noi bat |
| `/truyen/[slug]` | story detail + chapters |
| `/nghe/[chapterId]` | chapter + story + progress |
| `/tim-kiem?q=` | stories search |
| `/the-loai/[slug]` | stories by tag |
| `/thu-vien` | user_library |
| `/bookmarks` | bookmarks |

### 18.2 Server/client split

- Public pages nen render server-side hoac static de tot cho SEO.
- Player va progress update la client component.
- Supabase server client dung cho SSR.
- Supabase browser client dung cho realtime auth/progress.

## 19. Cac quy tac update du lieu

### 19.1 Story

- Crawler co the update `chapter_count`, `total_duration_seconds`, `updated_at`.
- Curator/admin nen review `title`, `description`, `cover_image_url`, `tags`, `status`.
- Khong nen de crawler ghi de mo ta da curate neu khong co flag ro rang.

### 19.2 Chapter

- Crawler update `duration_seconds`, `view_count`, `thumbnail_url`, `status`, `crawled_at`.
- `chapter_number` nen on dinh sau khi publish, vi thay doi thu tu co the lam user kho theo doi.
- Neu playlist YouTube chen tap o giua, crawler can detect va admin review.

### 19.3 User progress

- Frontend upsert theo `(user_id, chapter_id)`.
- Luon gui `story_id` de query nhanh.
- Nen debounce de tranh ghi qua nhieu.

## 20. Nhung diem co the thay doi sau MVP

### 20.1 Them bang `profiles`

Neu can profile rieng:

- display_name
- avatar_url
- role
- preferences

MVP co the chua can vi Supabase Auth da co user.

### 20.2 Them bang `ratings`

Khi can rating/review:

```sql
create table public.ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, story_id)
);
```

Can RLS user-owned.

### 20.3 Them bang `comments`

Sau MVP moi nen them comment vi can moderation, spam control, report.

### 20.4 Them bang `dead_link_reports`

Neu user report link loi:

- user_id
- chapter_id
- reason
- created_at
- resolved_at

### 20.5 Them bang `crawler_runs`

Khi crawler phuc tap hon, nen log:

- source_id
- started_at
- finished_at
- status
- error_message
- inserted_count
- updated_count
- unavailable_count

Bang nay giup debug GitHub Actions cron.

## 21. Rủi ro va cach fix

### 21.1 User khong xem duoc du lieu public

Kiem tra:

- Da enable policy select cho `anon` chua.
- `stories.published = true` chua.
- `chapters.status = 'available'` chua.
- Supabase Data API co expose schema/table khong.

### 21.2 User khong update duoc progress

Kiem tra:

- User da login chua.
- Request co access token khong.
- `user_id` insert co dung bang `auth.uid()` khong.
- Co select policy khong, vi UPDATE can SELECT policy trong Postgres RLS.

### 21.3 Crawler ghi that bai

Kiem tra:

- Co dung service role key khong.
- Secret co bi dat nham thanh anon key khong.
- `yt_video_id` co bi trung khong.
- `chapter_number` co trung trong cung story khong.
- Enum status co dung gia tri khong.

### 21.4 Search tieng Viet kem

Giai phap ngan han:

- Dung `ilike`.
- Them normalized title khong dau sau nay.
- Them `pg_trgm`.

Giai phap dai han:

- Meilisearch/Typesense.
- Luu keyword/search vector rieng.

### 21.5 Link YouTube chet

Khong xoa chapter. Cap nhat:

```sql
update public.chapters
set status = 'deleted', updated_at = now()
where yt_video_id = :yt_video_id;
```

UI hien thi thong bao than thien va goi y tap/truyen khac.

## 22. Khuyen nghi migration workflow

Khi bat dau setup Supabase local/project:

1. Tao project Supabase.
2. Tao migration dau tien: `init_audio_truyen_schema`.
3. Dua SQL trong muc 15 vao migration.
4. Chay migration.
5. Chay test query voi anon/authenticated.
6. Chay Supabase advisors neu co CLI/MCP.

Khong nen sua schema truc tiep tren production nhieu lan ma khong co migration file, vi sau nay rat kho dong bo local, GitHub Actions va production.

## 23. Ket luan

Schema nay du cho MVP 8 tuan:

- Crawler metadata YouTube playlist.
- Luu truyen va tap co cau truc.
- Trang chu, chi tiet, search/filter co nen tang.
- Resume progress, bookmark, thu vien user.
- Bao mat co ban voi RLS.
- Khong host audio, dung dung mo hinh aggregate.

Nhung phan nen de sau MVP:

- Rating/comment.
- Playlist tuy chinh.
- Recommendation.
- Admin CMS day du.
- Search engine rieng.
- Offline audio that su.

Quyet dinh quan trong nhat can giu on dinh: `stories`, `chapters`, `user_progress`, `bookmarks` la core schema. Cac bang khac co the mo rong dan ma khong pha vo kien truc.
