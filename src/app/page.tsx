import { Bookmark, Filter, Headphones, Play, Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { Story } from "@/types/database";

const filters = ["Tat ca", "Dang nghe", "Hoan", "Co dai", "Hien dai"];

function formatDuration(seconds: number) {
  const hours = Math.round(seconds / 3600);
  return `${hours} gio`;
}

function storyMeta(story: Pick<Story, "author" | "narrator" | "chapter_count">) {
  return [
    story.author,
    story.narrator,
    `${story.chapter_count} tap`,
  ]
    .filter(Boolean)
    .join(" • ");
}

async function getFeaturedStories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select(
      "id, slug, title, author, narrator, chapter_count, total_duration_seconds, updated_at",
    )
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("Failed to load stories", error);
    return [];
  }

  return data as Pick<
    Story,
    | "id"
    | "slug"
    | "title"
    | "author"
    | "narrator"
    | "chapter_count"
    | "total_duration_seconds"
    | "updated_at"
  >[];
}

export default async function Home() {
  const featuredStories = await getFeaturedStories();
  const leadStory = featuredStories[0];

  return (
    <main className="min-h-dvh pb-28">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              PWA Audio Truyen
            </p>
            <h1 className="text-2xl font-semibold tracking-normal">
              SH Audio
            </h1>
          </div>
          <Button size="icon" variant="secondary" aria-label="Tim kiem">
            <Search className="size-5" />
          </Button>
        </header>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={filter === "Tat ca" ? "default" : "secondary"}
              size="sm"
              className="shrink-0"
            >
              {filter}
            </Button>
          ))}
          <Button size="icon" variant="secondary" aria-label="Bo loc">
            <Filter className="size-4" />
          </Button>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="flex min-h-72 flex-col justify-end bg-[linear-gradient(135deg,#1db954_0%,#0f766e_45%,#111827_100%)] p-5 text-white">
              <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                <Headphones className="size-8" />
              </div>
              <p className="text-sm text-white/75">
                {leadStory ? "Moi crawl tu YouTube" : "Tiep tuc nghe"}
              </p>
              <h2 className="mt-2 max-w-lg text-3xl font-semibold tracking-normal">
                {leadStory?.title ?? "Khong mat dau tap, khong lac playlist"}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
                {leadStory
                  ? `${storyMeta(leadStory)} • ${formatDuration(
                      leadStory.total_duration_seconds,
                    )}`
                  : "Luu metadata tu YouTube playlist, phat bang embed, tap trung vao trai nghiem nghe truyen dai tap tren mobile."}
              </p>
              <div className="mt-6 flex gap-3">
                <Button asChild>
                  <Link href={leadStory ? `/truyen/${leadStory.slug}` : "#"}>
                    <Play className="size-4 fill-current" />
                    Mo truyen
                  </Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href={leadStory ? `/truyen/${leadStory.slug}` : "#"}>
                    <Bookmark className="size-4" />
                    Thu vien
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <aside className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Dang noi bat</h2>
              <Button variant="ghost" size="sm">
                Xem tat ca
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {featuredStories.length > 0 ? (
                featuredStories.map((story, index) => (
                  <Link
                    key={story.id}
                    href={`/truyen/${story.slug}`}
                    className="grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-md p-2 hover:bg-muted"
                  >
                    <div className="flex aspect-square items-center justify-center rounded-md bg-muted text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-medium">
                        {story.title}
                      </h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {storyMeta(story)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(story.total_duration_seconds)}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                  Chua co truyen nao. Hay chay crawler de nap metadata dau tien.
                </div>
              )}
            </div>
          </aside>
        </section>
      </section>

      <nav className="fixed inset-x-0 bottom-0 border-t bg-card/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 text-xs text-muted-foreground">
          <a className="flex flex-col items-center gap-1 text-foreground" href="#">
            <Headphones className="size-5" />
            Nghe
          </a>
          <a className="flex flex-col items-center gap-1" href="#">
            <Search className="size-5" />
            Tim
          </a>
          <a className="flex flex-col items-center gap-1" href="#">
            <Bookmark className="size-5" />
            Luu
          </a>
        </div>
      </nav>
    </main>
  );
}
