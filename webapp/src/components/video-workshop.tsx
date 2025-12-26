"use client";

import { useEffect, useState } from "react";
import { Loader2, PlayCircle, Upload, Video } from "lucide-react";
import clsx from "clsx";

import type { VideoTheme } from "@/lib/types";
import { composeVideo, fetchStaticAudioTrack } from "@/lib/videoComposer";

interface VideoWorkshopProps {
  initialImages?: string[];
}

type ThemeState = VideoTheme;

export function VideoWorkshop({ initialImages = [] }: VideoWorkshopProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [theme, setTheme] = useState<ThemeState>({
    tempo: "energetic",
    palette: "neon",
    transition: "crossfade",
    music: "synthwave",
  });
  const [isComposing, setIsComposing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialImages.length) {
      setImages(initialImages);
    }
  }, [initialImages]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    const uploads = await Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
      )
    );
    setImages((prev) => [...prev, ...uploads]);
  };

  const handleCompose = async () => {
    try {
      setIsComposing(true);
      setError(null);
      const imageBuffers = await Promise.all(
        images.map(async (image, index) => {
          const response = await fetch(image);
          const arrayBuffer = await response.arrayBuffer();
          return {
            name: `frame-${index.toString().padStart(2, "0")}.png`,
            data: new Uint8Array(arrayBuffer),
          };
        })
      );

      const audioData = await fetchStaticAudioTrack().catch(() => undefined);

      const videoData = await composeVideo({
        images: imageBuffers,
        audioTrack: audioData ? { name: "score.mp3", data: audioData } : undefined,
        theme: {
          transition: theme.transition,
          tempo: theme.tempo,
          palette: theme.palette,
          music: theme.music,
        },
        fps: 30,
        resolution: { width: 3840, height: 2160 },
      });

      const blob = new Blob([videoData.buffer as ArrayBuffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Unable to compose video");
    } finally {
      setIsComposing(false);
    }
  };

  return (
    <section className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/60 to-slate-950 p-8 shadow-[0_40px_120px_-40px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/20">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-300">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">4K Highlight Video Studio</h2>
            <p className="text-sm text-emerald-200/80">
              Stitch generated portraits with cinematic transitions, effects, and curated soundtrack.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-200/70">
          <Upload className="h-4 w-4" />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-400/40 px-3 py-1 font-semibold transition hover:border-emerald-300 hover:text-white">
            Add stills
            <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          </label>
          <span className="rounded-full border border-emerald-400/30 px-3 py-1">
            Frames: {images.length.toString().padStart(2, "0")}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <div className="space-y-4 rounded-2xl border border-emerald-400/30 bg-emerald-900/20 p-5">
          <ThemePicker theme={theme} onChange={setTheme} />

          <button
            onClick={handleCompose}
            disabled={isComposing || !images.length}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:from-emerald-400 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isComposing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Rendering 4K Sequence…
              </>
            ) : (
              <>
                <PlayCircle className="h-5 w-5" />
                Compose Highlight Reel
              </>
            )}
          </button>
          {error && <p className="text-sm text-rose-200">{error}</p>}
        </div>

        <div className="space-y-4 rounded-3xl border border-emerald-400/30 bg-slate-950/60 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {images.map((image, index) => (
              <figure key={index} className="group overflow-hidden rounded-2xl border border-emerald-400/20">
                <img
                  src={image}
                  alt={`Frame ${index + 1}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </figure>
            ))}
          </div>

          {videoUrl ? (
            <div className="space-y-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <video controls className="w-full rounded-xl" src={videoUrl} />
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-200/80">
                <span>Rendered in 3840×2160 • 30FPS</span>
                <a
                  href={videoUrl}
                  download="player-highlights.mp4"
                  className="rounded-full border border-emerald-300/60 px-3 py-1 font-semibold transition hover:border-emerald-200 hover:text-white"
                >
                  Download MP4
                </a>
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/5 text-sm text-emerald-200/70">
              Ready to render your highlight reel in native 4K with adaptive transitions.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ThemePicker({
  theme,
  onChange,
}: {
  theme: ThemeState;
  onChange: (theme: ThemeState) => void;
}) {
  const transitions: ThemeState["transition"][] = ["crossfade", "zoom", "slide"];
  const tempos: ThemeState["tempo"][] = ["calm", "energetic", "dramatic"];
  const palettes = ["neon", "monochrome", "sunset", "arctic"];
  const musicOptions: ThemeState["music"][] = ["synthwave", "orchestral", "lofi"];

  return (
    <div className="space-y-4 text-xs text-emerald-200/80">
      <div>
        <p className="mb-2 font-semibold uppercase tracking-wider text-emerald-200">Transition</p>
        <div className="flex gap-2">
          {transitions.map((transition) => (
            <button
              key={transition}
              onClick={() => onChange({ ...theme, transition })}
              className={clsx(
                "flex-1 rounded-full border px-3 py-2 font-semibold capitalize transition",
                theme.transition === transition
                  ? "border-emerald-300 bg-emerald-500/20 text-white"
                  : "border-emerald-400/20 bg-slate-950/50 hover:border-emerald-400/40"
              )}
            >
              {transition}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-semibold uppercase tracking-wider text-emerald-200">Tempo</p>
        <div className="flex gap-2">
          {tempos.map((tempo) => (
            <button
              key={tempo}
              onClick={() => onChange({ ...theme, tempo })}
              className={clsx(
                "flex-1 rounded-full border px-3 py-2 font-semibold capitalize transition",
                theme.tempo === tempo
                  ? "border-emerald-300 bg-emerald-500/20 text-white"
                  : "border-emerald-400/20 bg-slate-950/50 hover:border-emerald-400/40"
              )}
            >
              {tempo}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-semibold uppercase tracking-wider text-emerald-200">Color grade</p>
        <div className="grid grid-cols-2 gap-2">
          {palettes.map((palette) => (
            <button
              key={palette}
              onClick={() => onChange({ ...theme, palette })}
              className={clsx(
                "rounded-xl border px-3 py-2 font-semibold capitalize transition",
                theme.palette === palette
                  ? "border-emerald-300 bg-emerald-500/20 text-white"
                  : "border-emerald-400/20 bg-slate-950/50 hover:border-emerald-400/40"
              )}
            >
              {palette}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-semibold uppercase tracking-wider text-emerald-200">Soundtrack</p>
        <div className="flex gap-2">
          {musicOptions.map((music) => (
            <button
              key={music}
              onClick={() => onChange({ ...theme, music })}
              className={clsx(
                "flex-1 rounded-full border px-3 py-2 font-semibold capitalize transition",
                theme.music === music
                  ? "border-emerald-300 bg-emerald-500/20 text-white"
                  : "border-emerald-400/20 bg-slate-950/50 hover:border-emerald-400/40"
              )}
            >
              {music}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
