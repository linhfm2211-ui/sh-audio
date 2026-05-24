from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any
from urllib.parse import parse_qs, urlparse

from dotenv import load_dotenv
from supabase import Client, create_client
from yt_dlp import YoutubeDL


@dataclass
class SourcePayload:
    platform: str
    channel_id: str | None
    channel_title: str | None
    playlist_id: str | None
    playlist_url: str
    last_crawled_at: str


@dataclass
class StoryPayload:
    slug: str
    title: str
    author: str | None
    narrator: str | None
    source_id: str | None
    yt_playlist_id: str | None
    chapter_count: int
    total_duration_seconds: int
    published: bool
    updated_at: str


@dataclass
class ChapterPayload:
    story_id: str | None
    chapter_number: int
    title: str
    yt_video_id: str
    yt_url: str
    thumbnail_url: str | None
    duration_seconds: int | None
    view_count: int | None
    status: str
    published_at: str | None
    crawled_at: str
    updated_at: str


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_upload_date(value: str | None) -> str | None:
    if not value:
        return None

    try:
        parsed = datetime.strptime(value, "%Y%m%d").replace(tzinfo=timezone.utc)
    except ValueError:
        return None

    return parsed.isoformat()


def extract_playlist_id(playlist_url: str, metadata: dict[str, Any]) -> str | None:
    if metadata.get("id"):
        return str(metadata["id"])

    query = parse_qs(urlparse(playlist_url).query)
    values = query.get("list")
    return values[0] if values else None


def slugify(value: str) -> str:
    value = value.replace("\u0111", "d").replace("\u0110", "D")
    normalized = unicodedata.normalize("NFD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug or "untitled"


def clean_chapter_title(title: str, fallback_number: int) -> str:
    cleaned = re.sub(r"\s+", " ", title).strip(" -|")
    return cleaned or f"Tap {fallback_number}"


def clean_story_metadata(raw_title: str) -> tuple[str, str | None]:
    title = re.sub(r"\s+", " ", raw_title).strip()
    author: str | None = None

    author_match = re.search(
        r"(?:t[a\u00e1]c\s*gi[a\u1ea3]|author)\s*:?\s*(.+)$",
        title,
        flags=re.IGNORECASE,
    )

    if author_match:
        author = author_match.group(1).strip(" -|()[]")
        title = title[: author_match.start()].strip(" -|")

    title = re.sub(r"\((?:full|ho[a\u00e0]n|complete|tr[o\u1ecd]n\s*b[o\u1ed9])\)", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\[(?:full|ho[a\u00e0]n|complete|tr[o\u1ecd]n\s*b[o\u1ed9])\]", "", title, flags=re.IGNORECASE)
    title = title.strip(" -|()[]")

    return title or raw_title.strip(), author or None


def video_url(video_id: str) -> str:
    return f"https://www.youtube.com/watch?v={video_id}"


def fetch_playlist_metadata(playlist_url: str, limit: int | None) -> dict[str, Any]:
    ydl_opts: dict[str, Any] = {
        "extract_flat": False,
        "ignoreerrors": True,
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "playlistend": limit,
    }

    with YoutubeDL(ydl_opts) as ydl:
        return ydl.extract_info(playlist_url, download=False)


def build_payloads(
    playlist_url: str,
    metadata: dict[str, Any],
) -> tuple[SourcePayload, StoryPayload, list[ChapterPayload]]:
    crawled_at = now_iso()
    playlist_id = extract_playlist_id(playlist_url, metadata)
    entries = [entry for entry in metadata.get("entries", []) if entry]
    playlist_title = metadata.get("title") or "Untitled Playlist"
    story_title, author = clean_story_metadata(playlist_title)
    channel_id = metadata.get("channel_id") or metadata.get("uploader_id")
    channel_title = metadata.get("channel") or metadata.get("uploader")

    chapters: list[ChapterPayload] = []

    for index, entry in enumerate(entries, start=1):
        entry_id = entry.get("id")
        if not entry_id:
            continue

        duration = entry.get("duration")
        view_count = entry.get("view_count")

        chapters.append(
            ChapterPayload(
                story_id=None,
                chapter_number=index,
                title=clean_chapter_title(entry.get("title") or "", index),
                yt_video_id=str(entry_id),
                yt_url=entry.get("webpage_url") or video_url(str(entry_id)),
                thumbnail_url=entry.get("thumbnail"),
                duration_seconds=int(duration) if duration is not None else None,
                view_count=int(view_count) if view_count is not None else None,
                status="available",
                published_at=parse_upload_date(entry.get("upload_date")),
                crawled_at=crawled_at,
                updated_at=crawled_at,
            )
        )

    total_duration = sum(chapter.duration_seconds or 0 for chapter in chapters)

    source = SourcePayload(
        platform="youtube",
        channel_id=channel_id,
        channel_title=channel_title,
        playlist_id=playlist_id,
        playlist_url=playlist_url,
        last_crawled_at=crawled_at,
    )

    story = StoryPayload(
        slug=slugify(story_title),
        title=story_title,
        author=author,
        narrator=channel_title,
        source_id=None,
        yt_playlist_id=playlist_id,
        chapter_count=len(chapters),
        total_duration_seconds=total_duration,
        published=True,
        updated_at=crawled_at,
    )

    return source, story, chapters


def load_supabase_client() -> Client:
    load_dotenv()
    load_dotenv(".env.local")

    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not service_role_key:
        raise RuntimeError(
            "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
        )

    return create_client(url, service_role_key)


def upsert_to_supabase(
    client: Client,
    source: SourcePayload,
    story: StoryPayload,
    chapters: list[ChapterPayload],
) -> dict[str, Any]:
    source_result = (
        client.table("sources")
        .upsert(asdict(source), on_conflict="playlist_id")
        .execute()
    )
    source_row = source_result.data[0]

    story_payload = asdict(story)
    story_payload["source_id"] = source_row["id"]

    story_result = (
        client.table("stories")
        .upsert(story_payload, on_conflict="slug")
        .execute()
    )
    story_row = story_result.data[0]

    chapter_rows: list[dict[str, Any]] = []
    for chapter in chapters:
        chapter_payload = asdict(chapter)
        chapter_payload["story_id"] = story_row["id"]
        chapter_rows.append(chapter_payload)

    if chapter_rows:
        client.table("chapters").upsert(chapter_rows, on_conflict="yt_video_id").execute()

    return {
        "source_id": source_row["id"],
        "story_id": story_row["id"],
        "chapters_upserted": len(chapter_rows),
    }


def print_payload(
    source: SourcePayload,
    story: StoryPayload,
    chapters: list[ChapterPayload],
) -> None:
    output = {
        "source": asdict(source),
        "story": asdict(story),
        "chapters": [asdict(chapter) for chapter in chapters],
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Crawl metadata from one YouTube playlist. Does not download audio/video."
    )
    parser.add_argument("playlist_url", help="YouTube playlist URL")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit videos for test runs",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print JSON payload and skip Supabase writes",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    metadata = fetch_playlist_metadata(args.playlist_url, args.limit)
    source, story, chapters = build_payloads(args.playlist_url, metadata)

    if args.dry_run:
        print_payload(source, story, chapters)
        return 0

    client = load_supabase_client()
    result = upsert_to_supabase(client, source, story, chapters)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"crawler error: {exc}", file=sys.stderr)
        raise SystemExit(1)
