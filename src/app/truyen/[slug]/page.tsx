import { ArrowLeft, BookOpen, Clock3, Headphones, Play } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { Chapter, Story } from "@/types/database";

type StoryDetail = Pick<
  Story,
  | "id"
  | "slug"
  | "title"
  | "author"
  | "narrator"
  | "description"
  | "status"
  | "chapter_count"
  | "total_duration_seconds"
>;

type ChapterListItem = Pick<
  Chapter,
  "id" | "chapter_number" | "title" | "duration_seconds" | "view_count"
>;

type PageProps = {
  params: Promise<{
    slug: string;
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

function statusLabel(status: Story["status"]) {
  const labels: Record<Story["status"], string> = {
    ongoing: "Dang ra",
    completed: "Hoan thanh",
    paused: "Tam dung",
    dropped: "Da drop",
  };

  return labels[status];
}

async function getStory(slug: string) {
  const supabase = await createClient();

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select(
      "id, slug, title, author, narrator, description, status, chapter_count, total_duration_seconds",
    )
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (storyError || !story) {
    return null;
  }

  const { data: chapters, error: chaptersError } = await supabase
    .from("chapters")
    .select("id, chapter_number, title, duration_seconds, view_count")
    .eq("story_id", story.id)
    .eq("status", "available")
    .order("chapter_number", { ascending: true });

  if (chaptersError) {
    console.error("Failed to load chapters", chaptersError);
  }

  return {
    story: story as StoryDetail,
    chapters: (chapters ?? []) as ChapterListItem[],
  };
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const result = await getStory(slug);

  if (!result) {
    return {
      title: "Khong tim thay truyen",
    };
  }

  return {
    title: `Nghe truyen ${result.story.title}`,
    description:
      result.story.description ??
      `Nghe truyen ${result.story.title} audio tu YouTube playlist tren SH Audio.`,
  };
}

export default async function StoryPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getStory(slug);

  if (!result) {
    notFound();
  }

  const { story, chapters } = result;
  const firstChapter = chapters[0];

  return (
    <main className="min-h-dvh pb-28">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <Button variant="secondary" size="icon" asChild>
            <Link href="/" aria-label="Quay lai trang chu">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <p className="text-sm font-medium text-muted-foreground">
            Chi tiet truyen
          </p>
          <div className="size-10" />
        </header>

        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-[linear-gradient(135deg,#1db954_0%,#0f766e_45%,#111827_100%)] text-white">
              <div className="flex size-24 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                <Headphones className="size-12" />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-end rounded-lg border bg-card p-5">
            <span className="w-fit rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {statusLabel(story.status)}
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
              {story.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
              {story.author ? <span>Tac gia: {story.author}</span> : null}
              {story.narrator ? <span>Nguon doc: {story.narrator}</span> : null}
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              {story.description ??
                "Metadata duoc crawl tu YouTube playlist. Noi dung audio duoc phat bang YouTube embed, SH Audio khong host file audio."}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-muted p-3">
                <BookOpen className="mb-2 size-4 text-muted-foreground" />
                <p className="text-lg font-semibold">{story.chapter_count}</p>
                <p className="text-xs text-muted-foreground">tap</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <Clock3 className="mb-2 size-4 text-muted-foreground" />
                <p className="text-lg font-semibold">
                  {formatDuration(story.total_duration_seconds)}
                </p>
                <p className="text-xs text-muted-foreground">tong thoi luong</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild disabled={!firstChapter}>
                <Link href={firstChapter ? `/nghe/${firstChapter.id}` : "#"}>
                  <Play className="size-4 fill-current" />
                  Nghe tu dau
                </Link>
              </Button>
              <Button variant="secondary">Luu vao thu vien</Button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Danh sach chuong</h2>
              <p className="text-sm text-muted-foreground">
                {chapters.length} tap dang kha dung
              </p>
            </div>
          </div>

          <div className="mt-4 divide-y">
            {chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/nghe/${chapter.id}`}
                className="grid grid-cols-[52px_1fr_auto] items-center gap-3 py-3"
              >
                <div className="flex aspect-square items-center justify-center rounded-md bg-muted text-sm font-semibold">
                  {chapter.chapter_number}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium">
                    {chapter.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDuration(chapter.duration_seconds)} •{" "}
                    {formatNumber(chapter.view_count)} luot xem
                  </p>
                </div>
                <Button size="icon" variant="secondary" aria-label="Nghe tap">
                  <Play className="size-4 fill-current" />
                </Button>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
