from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from typing import Any

from yt_dlp import DownloadError, YoutubeDL

from crawl_playlist import load_supabase_client, now_iso, video_url


@dataclass
class ChapterCheckResult:
    id: str
    title: str
    yt_video_id: str
    old_status: str
    new_status: str
    reason: str | None


def classify_error(error: Exception) -> tuple[str, str]:
    message = str(error).lower()

    if "private video" in message or "private" in message:
        return "private", str(error)

    if (
        "video unavailable" in message
        or "removed" in message
        or "does not exist" in message
        or "not available" in message
        or "has been terminated" in message
    ):
        return "deleted", str(error)

    return "unavailable", str(error)


def check_video_status(yt_video_id: str) -> tuple[str, str | None, dict[str, Any] | None]:
    ydl_opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            metadata = ydl.extract_info(video_url(yt_video_id), download=False)
    except DownloadError as exc:
        status, reason = classify_error(exc)
        return status, reason, None
    except Exception as exc:
        status, reason = classify_error(exc)
        return status, reason, None

    if not metadata:
        return "unavailable", "yt-dlp returned no metadata", None

    return "available", None, metadata


def fetch_chapters(
    story_slug: str | None,
    status: str,
    limit: int | None,
) -> list[dict[str, Any]]:
    client = load_supabase_client()
    query = (
        client.table("chapters")
        .select("id, story_id, title, yt_video_id, status, stories!inner(slug)")
        .eq("status", status)
        .order("updated_at", desc=False)
    )

    if story_slug:
        query = query.eq("stories.slug", story_slug)

    if limit:
        query = query.limit(limit)

    return query.execute().data


def update_chapter_status(
    chapter_id: str,
    status: str,
    metadata: dict[str, Any] | None,
) -> None:
    client = load_supabase_client()
    payload: dict[str, Any] = {
        "status": status,
        "crawled_at": now_iso(),
        "updated_at": now_iso(),
    }

    if metadata:
        duration = metadata.get("duration")
        view_count = metadata.get("view_count")
        thumbnail = metadata.get("thumbnail")

        if duration is not None:
            payload["duration_seconds"] = int(duration)
        if view_count is not None:
            payload["view_count"] = int(view_count)
        if thumbnail:
            payload["thumbnail_url"] = thumbnail

    client.table("chapters").update(payload).eq("id", chapter_id).execute()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Check YouTube chapter links and update chapter status."
    )
    parser.add_argument(
        "--story-slug",
        default=None,
        help="Only check chapters belonging to this story slug",
    )
    parser.add_argument(
        "--status",
        default="available",
        choices=["available", "unavailable", "private", "deleted"],
        help="Only check chapters currently in this status",
    )
    parser.add_argument("--limit", type=int, default=None, help="Limit checked rows")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print results without updating Supabase",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    chapters = fetch_chapters(args.story_slug, args.status, args.limit)
    results: list[ChapterCheckResult] = []

    for chapter in chapters:
        new_status, reason, metadata = check_video_status(chapter["yt_video_id"])

        if not args.dry_run:
            update_chapter_status(chapter["id"], new_status, metadata)

        results.append(
            ChapterCheckResult(
                id=chapter["id"],
                title=chapter["title"],
                yt_video_id=chapter["yt_video_id"],
                old_status=chapter["status"],
                new_status=new_status,
                reason=reason,
            )
        )

    summary = {
        "checked": len(results),
        "dry_run": args.dry_run,
        "available": sum(1 for item in results if item.new_status == "available"),
        "unavailable": sum(1 for item in results if item.new_status == "unavailable"),
        "private": sum(1 for item in results if item.new_status == "private"),
        "deleted": sum(1 for item in results if item.new_status == "deleted"),
        "results": [item.__dict__ for item in results],
    }

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"dead-link checker error: {exc}", file=sys.stderr)
        raise SystemExit(1)
