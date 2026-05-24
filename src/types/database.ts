export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StoryStatus = "ongoing" | "completed" | "paused" | "dropped";

export type ChapterStatus =
  | "available"
  | "unavailable"
  | "private"
  | "deleted";

export type Story = {
  id: string;
  slug: string;
  title: string;
  original_title: string | null;
  author: string | null;
  narrator: string | null;
  description: string | null;
  cover_image_url: string | null;
  status: StoryStatus;
  chapter_count: number;
  total_duration_seconds: number;
  source_id: string | null;
  yt_playlist_id: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type Chapter = {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  yt_video_id: string;
  yt_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  view_count: number | null;
  status: ChapterStatus;
  published_at: string | null;
  crawled_at: string;
  created_at: string;
  updated_at: string;
};
