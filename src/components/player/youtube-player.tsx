"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YouTubePlayer }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        },
      ) => YouTubePlayer;
      PlayerState?: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YouTubePlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackRate: () => number;
  getAvailablePlaybackRates: () => number[];
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackRate: (rate: number) => void;
};

type YouTubePlayerProps = {
  title: string;
  videoId: string;
};

const speeds = [0.75, 1, 1.25, 1.5, 1.75, 2];

let apiReadyPromise: Promise<void> | null = null;

function loadYouTubeApi() {
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (!apiReadyPromise) {
    apiReadyPromise = new Promise((resolve) => {
      const previousCallback = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        resolve();
      };

      if (!document.querySelector("script[src='https://www.youtube.com/iframe_api']")) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.head.appendChild(script);
      }
    });
  }

  return apiReadyPromise;
}

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function YouTubePlayer({ title, videoId }: YouTubePlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const containerId = useMemo(() => `yt-player-${videoId}`, [videoId]);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT?.Player) {
        return;
      }

      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            if (cancelled) {
              return;
            }

            setReady(true);
            setDuration(event.target.getDuration());
            setPlaybackRateState(event.target.getPlaybackRate());
          },
          onStateChange: (event) => {
            const states = window.YT?.PlayerState;
            setPlaying(event.data === states?.PLAYING);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [containerId, videoId]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const interval = window.setInterval(() => {
      const player = playerRef.current;

      if (!player) {
        return;
      }

      setCurrentTime(player.getCurrentTime());
      setDuration(player.getDuration());
      setPlaybackRateState(player.getPlaybackRate());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [ready]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  function togglePlayback() {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    if (playing) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }

  function seekTo(seconds: number) {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    const nextTime = Math.min(Math.max(seconds, 0), duration || seconds);
    player.seekTo(nextTime, true);
    setCurrentTime(nextTime);
  }

  function setSpeed(rate: number) {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    player.setPlaybackRate(rate);
    setPlaybackRateState(rate);
  }

  return (
    <div className="overflow-hidden bg-card">
      <div className="aspect-video bg-black">
        <div id={containerId} className="h-full w-full" title={title} />
      </div>

      <div className="space-y-4 p-4">
        <div>
          <input
            aria-label="Tien do nghe"
            className="h-2 w-full accent-primary"
            disabled={!ready}
            max={duration || 0}
            min={0}
            step={1}
            type="range"
            value={Math.min(currentTime, duration || currentTime)}
            onChange={(event) => seekTo(Number(event.target.value))}
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div
            className="mt-2 h-1 rounded-full bg-muted"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            onClick={() => seekTo(currentTime - 15)}
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button onClick={togglePlayback} disabled={!ready}>
            {playing ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Play className="size-4 fill-current" />
            )}
            {playing ? "Tam dung" : "Phat"}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={() => seekTo(currentTime + 30)}
          >
            <RotateCw className="size-4" />
          </Button>

          <div className="ml-auto flex items-center gap-1 overflow-x-auto">
            {speeds.map((speed) => (
              <Button
                key={speed}
                size="sm"
                variant={playbackRate === speed ? "default" : "secondary"}
                onClick={() => setSpeed(speed)}
                disabled={!ready}
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
