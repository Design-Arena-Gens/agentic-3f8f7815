"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";

import type { PlayerBlueprint } from "@/lib/types";
import type { AlertLearningSignal } from "@/lib/preferences";
import { makePlayerBlueprint } from "@/lib/playerGenerator";

type GenerationResult = {
  blueprint: PlayerBlueprint;
  images: string[];
  provider: string;
  predictionId?: string;
};

const DEFAULT_SEED = 208341;

export function PlayerImageLab({
  onBlueprintFeedback,
  onImagesGenerated,
}: {
  onBlueprintFeedback: (signal: AlertLearningSignal) => void;
  onImagesGenerated?: (images: string[]) => void;
}) {
  const [form, setForm] = useState<PlayerBlueprint>(() => seedBlueprint(DEFAULT_SEED));
  const [results, setResults] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageCount, setImageCount] = useState(3);
  const [themeSeed, setThemeSeed] = useState(DEFAULT_SEED);
  const [error, setError] = useState<string | null>(null);

  const promptPreview = useMemo(() => {
    return [
      `Create a ${form.position?.toLowerCase()} with ${form.dominantFoot?.toLowerCase()} dominant foot.`,
      `Club colors ${form.clubColors?.join(" & ")}`,
      `Hair: ${form.appearance?.hairstyle}, Facial hair: ${form.appearance?.facialHair}`,
      `Accessories: ${(form.appearance?.accessories ?? []).join(", ") || "none"}`,
      `Kit pattern ${form.attire?.pattern}.`,
    ].join(" ");
  }, [form]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed: themeSeed,
          attributes: form,
          imageCount,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate player visuals");
      }
      const payload = (await response.json()) as GenerationResult;
      setResults(payload);
      onBlueprintFeedback({
        articleId: payload.blueprint.id,
        helpful: true,
        timestamp: Date.now(),
        pairs: [],
        topics: [],
      });
      onImagesGenerated?.(payload.images);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRandomize = () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    setThemeSeed(seed);
    setForm(seedBlueprint(seed));
    setResults(null);
  };

  return (
    <section className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/70 to-slate-950 p-8 shadow-[0_40px_120px_-40px_rgba(79,70,229,0.35)] ring-1 ring-indigo-400/20">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-indigo-500/10 p-3 text-indigo-300">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">AI Player Image Foundry</h2>
            <p className="text-sm text-indigo-200/80">
              Generate bespoke, high-definition athlete portraits tuned to your creative brief.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-indigo-200/70">
          <span>Seed</span>
          <input
            type="number"
            value={themeSeed}
            onChange={(event) => setThemeSeed(Number(event.target.value))}
            className="w-28 rounded-md border border-indigo-500/40 bg-indigo-950/40 px-3 py-1 text-indigo-100 focus:border-indigo-300 focus:outline-none"
          />
          <button
            onClick={handleRandomize}
            className="inline-flex items-center gap-1 rounded-full border border-indigo-400/40 px-3 py-1 font-semibold text-indigo-200 transition hover:border-indigo-300 hover:text-white"
          >
            <Wand2 className="h-4 w-4" />
            Randomize
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[400px,1fr]">
        <div className="space-y-4 rounded-2xl border border-indigo-500/20 bg-indigo-900/20 p-5">
          <Field label="Position">
            <select
              value={form.position}
              onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value as PlayerBlueprint["position"] }))}
              className="w-full rounded-md border border-indigo-500/40 bg-slate-900/60 px-3 py-2 text-indigo-100 focus:border-indigo-300 focus:outline-none"
            >
              <option>Forward</option>
              <option>Midfielder</option>
              <option>Defender</option>
              <option>Goalkeeper</option>
            </select>
          </Field>

          <Field label="Dominant Foot">
            <select
              value={form.dominantFoot}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, dominantFoot: event.target.value as PlayerBlueprint["dominantFoot"] }))
              }
              className="w-full rounded-md border border-indigo-500/40 bg-slate-900/60 px-3 py-2 text-indigo-100 focus:border-indigo-300 focus:outline-none"
            >
              <option>Right</option>
              <option>Left</option>
              <option>Both</option>
            </select>
          </Field>

          <Field label="Club Palette">
            <div className="flex gap-3">
              {form.clubColors?.map((color, index) => (
                <input
                  key={index}
                  type="color"
                  value={color}
                  onChange={(event) =>
                    setForm((prev) => {
                      const next = [...(prev.clubColors ?? [])];
                      next[index] = event.target.value;
                      return { ...prev, clubColors: next };
                    })
                  }
                  className="h-10 w-full cursor-pointer rounded-md border border-indigo-400/30 bg-transparent"
                />
              ))}
            </div>
          </Field>

          <Field label="Hairstyle">
            <input
              value={form.appearance?.hairstyle ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, hairstyle: event.target.value },
                }))
              }
              className="w-full rounded-md border border-indigo-500/40 bg-slate-900/60 px-3 py-2 text-indigo-100 focus:border-indigo-300 focus:outline-none"
            />
          </Field>

          <Field label="Accessories (comma separated)">
            <input
              value={(form.appearance?.accessories ?? []).join(", ")}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  appearance: {
                    ...prev.appearance,
                    accessories: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  },
                }))
              }
              className="w-full rounded-md border border-indigo-500/40 bg-slate-900/60 px-3 py-2 text-indigo-100 focus:border-indigo-300 focus:outline-none"
            />
          </Field>

          <Field label="Kit Pattern">
            <select
              value={form.attire?.pattern}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  attire: { ...(prev.attire ?? {}), pattern: event.target.value as any },
                }))
              }
              className="w-full rounded-md border border-indigo-500/40 bg-slate-900/60 px-3 py-2 text-indigo-100 focus:border-indigo-300 focus:outline-none"
            >
              <option value="stripes">Stripes</option>
              <option value="solid">Solid</option>
              <option value="gradient">Gradient</option>
              <option value="geometric">Geometric</option>
            </select>
          </Field>

          <Field label="Images per batch">
            <input
              type="number"
              min={1}
              max={6}
              value={imageCount}
              onChange={(event) => setImageCount(Number(event.target.value))}
              className="w-full rounded-md border border-indigo-500/40 bg-slate-900/60 px-3 py-2 text-indigo-100 focus:border-indigo-300 focus:outline-none"
            />
          </Field>

          <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-3 text-xs text-indigo-100">
            <p className="font-semibold text-indigo-200">Prompt blueprint</p>
            <p className="mt-1 text-xs leading-relaxed text-indigo-100/70">{promptPreview}</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:from-indigo-400 hover:to-purple-400 disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Generate Player Visuals"}
          </button>

          {error && <p className="text-sm text-rose-300">{error}</p>}
        </div>

        <div className="relative min-h-[360px] rounded-3xl border border-indigo-400/30 bg-slate-950/60 p-6">
          {!results && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-indigo-200/70">
              <Sparkles className="h-10 w-10 text-indigo-300" />
              <p className="max-w-md text-sm">
                Dial in visual attributes, then let the agent fabricate stylized, high fidelity portraits tailored to
                your tactical scenario.
              </p>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-indigo-200/80">
                <span className="rounded-full border border-indigo-400/40 px-3 py-1">Provider: {results.provider}</span>
                {results.predictionId && (
                  <span className="rounded-full border border-indigo-400/40 px-3 py-1">
                    Prediction ID: {results.predictionId}
                  </span>
                )}
                <button
                  onClick={() => results.images && navigator.clipboard.writeText(results.images.join("\n"))}
                  className="rounded-full border border-indigo-400/40 px-3 py-1 text-indigo-100 transition hover:border-indigo-300"
                >
                  Copy image URLs
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {results.images.map((url) => (
                  <figure key={url} className="group overflow-hidden rounded-3xl border border-indigo-400/30 bg-black/40">
                    <img
                      src={url}
                      alt="AI generated player"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </figure>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-indigo-200/80">
      {label}
      {children}
    </label>
  );
}

function seedBlueprint(seed: number) {
  const blueprint = makePlayerBlueprint(seed);
  return {
    ...blueprint,
    appearance: {
      ...blueprint.appearance,
      accessories: blueprint.appearance.accessories.length ? blueprint.appearance.accessories : ["headband"],
    },
    attire: {
      ...blueprint.attire,
    },
  };
}
