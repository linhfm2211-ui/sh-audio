import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { YouTubePlayer } from "@/components/player/youtube-player";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { Chapter, Story } from "@/types/database";

type ListenChapter = Pick<
  Chapter,
  | "id"
  | "story_id"
  | "chapter_number"
  | "title"
  | "yt_video_id"
  | "duration_seconds"
  | "view_count"
>;

type ListenStory = Pick<
  Story,
  "id" | "slug" | "title" | "author" | "narrator" | "chapter_count"
>;

type PageProps = {
  params: Promise<{
    chapterId: string;
  }>;
};

function formatDuration(seconds: number | null) {
  if (!seconds) {
    return "Chua ro";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours <= 0) {
    return `${minutes} phut`;
  }

  return `${hours} gio ${minutes} phut`;
}

function formatNumber(value: number | null) {
  if (!value) {
    return "0";
  }

  return new Intl.NumberFormat("vi-VN").format(value);
}

async function getListenData(chapterId: string) {
  const supabase = await createClient();

  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .select(
      "id, story_id, chapter_number, title, yt_video_id, duration_seconds, view_count",
    )
    .eq("id", chapterId)
    .eq("status", "available")
    .single();

  if (chapterError || !chapter) {
    return null;
  }

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, slug, title, author, narrator, chapter_count")
    .eq("id", chapter.story_id)
    .eq("published", true)
    .single();

  if (storyError || !story) {
    return null;
  }

  const { data: siblingChapters, error: siblingsError } = await supabase
    .from("chapters")
    .select("id, chapter_number, title, duration_seconds, view_count")
    .eq("story_id", story.id)
    .eq("status", "available")
    .order("chapter_number", { ascending: true });

  if (siblingsError) {
    console.error("Failed to load sibling chapters", siblingsError);
  }

  const chapters = (siblingChapters ?? []) as Pick<
    Chapter,
    "id" | "chapter_number" | "title" | "duration_seconds" | "view_count"
  >[];
  const currentIndex = chapters.findIndex((item) => item.id === chapter.id);

  return {
    chapter: chapter as ListenChapter,
    story: story as ListenStory,
    chapters,
    previousChapter: currentIndex > 0 ? chapters[currentIndex - 1] : null,
    nextChapter:
      currentIndex >= 0 && currentIndex < chapters.length - 1
        ? chapters[currentIndex + 1]
        : null,
  };
}

export async function generateMetadata({ params }: PageProps) {
  const { chapterId } = await params;
  const result = await getListenData(chapterId);

  if (!result) {
    return {
      title: "Khong tim thay chuong",
    };
  }

  return {
    title: `${result.chapter.title} - ${result.story.title}`,
    description: `Nghe ${result.chapter.title} trong truyen ${result.story.title} tren SH Audio.`,
  };
}

export default async function ListenPage({ params }: PageProps) {
  const { chapterId } = await params;
  const result = await getListenData(chapterId);

  if (!result) {
    notFound();
  }

  const { chapter, story, chapters, previousChapter, nextChapter } = result;

  return (
    <main className="min-h-dvh pb-28">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <Button variant="secondary" size="icon" asChild>
            <Link href={`/truyen/${story.slug}`} aria-label="Quay lai truyen">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <p className="max-w-[60vw] truncate text-sm font-medium text-muted-foreground">
            {story.title}
          </p>
          <div className="size-10" />
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border bg-card">
            <YouTubePlayer title={chapter.title} videoId={chapter.yt_video_id} />
            <div className="p-5">
              <p className="text-sm text-muted-foreground">
                Tap {chapter.chapter_number} / {story.chapter_count}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal">
                {chapter.title}
              </h1>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>{story.author ? `Tac gia: ${story.author}` : story.title}</span>
                {story.narrator ? <span>Nguon doc: {story.narrator}</span> : null}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-muted p-3">
                  <Clock3 className="mb-2 size-4 text-muted-foreground" />
                  <p className="text-base font-semibold">
                    {formatDuration(chapter.duration_seconds)}
                  </p>
                  <p className="text-xs text-muted-foreground">thoi luong</p>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <Headphones className="mb-2 size-4 text-muted-foreground" />
                  <p className="text-base font-semibold">
                    {formatNumber(chapter.view_count)}
                  </p>
                  <p className="text-xs text-muted-foreground">luot xem YT</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  asChild
                  disabled={!previousChapter}
                >
                  <Link
                    href={
                      previousChapter ? `/nghe/${previousChapter.id}` : "#"
                    }
                  >
                    <ChevronLeft className="size-4" />
                    Tap truoc
                  </Link>
                </Button>
                <Button asChild disabled={!nextChapter}>
                  <Link href={nextChapter ? `/nghe/${nextChapter.id}` : "#"}>
                    Tap tiep
                    <ChevronRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <aside className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Danh sach tap</h2>
                <p className="text-sm text-muted-foreground">
                  {chapters.length} tap kha dung
                </p>
              </div>
              <Button variant="secondary" size="icon" asChild>
                <Link href={`/truyen/${story.slug}`} aria-label="Chi tiet truyen">
                  <BookOpen className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-4 max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {chapters.map((item) => {
                const active = item.id === chapter.id;

                return (
                  <Link
                    key={item.id}
                    href={`/nghe/${item.id}`}
                    className={`grid grid-cols-[44px_1fr] items-center gap-3 rounded-md p-2 ${
                      active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <div
                      className={`flex aspect-square items-center justify-center rounded-md text-sm font-semibold ${
                        active ? "bg-black/10" : "bg-muted"
                      }`}
                    >
                      {item.chapter_number}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-medium">
                        {item.title}
                      </h3>
                      <p
                        className={`mt-1 text-xs ${
                          active
                            ? "text-primary-foreground/75"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatDuration(item.duration_seconds)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
