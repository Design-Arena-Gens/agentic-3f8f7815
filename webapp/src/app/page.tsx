'use client';

import { useMemo, useState } from "react";
import { Activity, Bot, BrainCircuit, Sparkles } from "lucide-react";

import { NewsAlertsPanel } from "@/components/news-alerts";
import { PlayerImageLab } from "@/components/player-image-lab";
import { VideoWorkshop } from "@/components/video-workshop";
import { usePreferencesStore } from "@/lib/preferences";

export default function HomePage() {
  const markHelpful = usePreferencesStore((state) => state.markHelpful);
  const [latestImages, setLatestImages] = useState<string[]>([]);

  const missionHighlights = useMemo(
    () => [
      {
        icon: <Activity className="h-5 w-5 text-emerald-300" />,
        title: "Signal triage",
        description: "Streams forex intelligence aligned to the pairs and macro drivers you care about.",
      },
      {
        icon: <Sparkles className="h-5 w-5 text-indigo-300" />,
        title: "Visual synthesis",
        description: "Fabricates stylized athlete portraits with controllable attributes and palettes.",
      },
      {
        icon: <BrainCircuit className="h-5 w-5 text-emerald-300" />,
        title: "Adaptive learning",
        description: "Learns from your feedback to sharpen alert precision and creative direction.",
      },
    ],
    []
  );

  return (
    <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 pb-24 pt-12 sm:px-10 lg:px-12">
      <div className="relative overflow-hidden rounded-[36px] border border-white/15 bg-gradient-to-br from-slate-950 via-slate-900/80 to-black p-10 shadow-[0_60px_140px_-60px_rgba(14,116,144,0.6)]">
        <div className="absolute inset-0">
          <div className="absolute -left-10 top-10 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -right-10 bottom-10 h-60 w-60 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr,1fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
              <Bot className="h-4 w-4 text-emerald-300" />
              Agentic FX Studio
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Multi-modal agent orchestrating forex intelligence, generative visuals, and 4K highlight films.
            </h1>
            <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
              Fuse macro news awareness with creative automation. Configure the pairs and narratives that matter, spin
              up fictional players with bespoke aesthetics, and ship cinematic recap videos—powered by an adaptive
              workflow that learns from every interaction.
            </p>
          </div>

          <ul className="grid gap-4">
            {missionHighlights.map((item) => (
              <li
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:border-emerald-300/40 hover:bg-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950/80">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-200">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-12">
        <NewsAlertsPanel />
        <PlayerImageLab
          onBlueprintFeedback={markHelpful}
          onImagesGenerated={(images) => {
            setLatestImages(images);
          }}
        />
        <VideoWorkshop initialImages={latestImages} />
      </div>
    </main>
  );
}
