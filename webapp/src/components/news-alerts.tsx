"use client";

import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCircle2, Flame, RefreshCw, TrendingUp } from "lucide-react";
import clsx from "clsx";

import { getAdaptiveThreshold, usePreferencesStore } from "@/lib/preferences";
import type { AlertLearningSignal } from "@/lib/preferences";
import type { CurrencyPair, ForexNewsArticle, NewsTopic } from "@/lib/types";

const PAIRS: CurrencyPair[] = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "USD/CAD",
  "USD/CHF",
  "NZD/USD",
  "USD/CNY",
];

const TOPICS: NewsTopic[] = [
  "Monetary Policy",
  "Economic Data",
  "Geopolitics",
  "Commodities",
  "Emerging Markets",
  "Risk Sentiment",
];

type NewsResponse = {
  articles: ForexNewsArticle[];
};

const fetcher = async (key: string, body: any) => {
  const response = await fetch("/api/news", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to load forex alerts");
  }
  return (await response.json()) as NewsResponse;
};

export function NewsAlertsPanel() {
  const {
    selectedPairs,
    selectedTopics,
    digestFrequency,
    togglePair,
    toggleTopic,
    setDigestFrequency,
    signals,
    markHelpful,
  } = usePreferencesStore();

  const refreshInterval = useMemo(() => {
    switch (digestFrequency) {
      case "realtime":
        return 15_000;
      case "hourly":
        return 60 * 60 * 1000;
      case "daily":
        return 24 * 60 * 60 * 1000;
      default:
        return 60_000;
    }
  }, [digestFrequency]);

  const { data, error, isLoading, mutate } = useSWR(
    ["forex-news", { pairs: selectedPairs, topics: selectedTopics }],
    ([key, body]) => fetcher(key, body),
    {
      refreshInterval,
      revalidateOnFocus: true,
      keepPreviousData: true,
    }
  );

  const adaptiveThreshold = getAdaptiveThreshold(signals);
  const rankedArticles = useMemo(() => {
    if (!data?.articles?.length) return [];
    return data.articles
      .map((article) => ({
        ...article,
        relevanceScore: Math.min(100, (article.relevanceScore ?? 0) + boostFromSignals(article, signals)),
      }))
      .filter((article) => (article.relevanceScore ?? 0) >= adaptiveThreshold)
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
  }, [data, signals, adaptiveThreshold]);

  const seenArticles = useRef(new Set<string>());

  useEffect(() => {
    if (!rankedArticles.length) return;
    rankedArticles.forEach((article) => seenArticles.current.add(article.id));
  }, [rankedArticles]);

  const handleFeedback = (article: ForexNewsArticle, helpful: boolean) => {
    markHelpful({
      articleId: article.id,
      helpful,
      timestamp: Date.now(),
      pairs: article.currencyPairs ?? [],
      topics: article.topics ?? [],
    });
    mutate();
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-8 shadow-2xl ring-1 ring-slate-700/30">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <header className="w-full max-w-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-300">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Forex News Alert System</h2>
              <p className="text-sm text-slate-400">Adaptive agent curates market-moving headlines in real-time.</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <PreferenceGroup
              title="Currency Pairs"
              items={PAIRS}
              selected={selectedPairs}
              onToggle={(value) => togglePair(value as any)}
            />

            <PreferenceGroup
              title="Focus Topics"
              items={TOPICS}
              selected={selectedTopics}
              onToggle={(value) => toggleTopic(value as any)}
            />

            <div>
              <p className="mb-2 font-medium text-slate-200">Alert cadence</p>
              <div className="flex gap-1">
                {(["realtime", "hourly", "daily"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setDigestFrequency(value)}
                    className={clsx(
                      "flex-1 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
                      digestFrequency === value
                        ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700/60 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:bg-slate-800"
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
              <p className="flex items-center gap-2 font-medium text-emerald-300">
                <TrendingUp className="h-4 w-4" />
                Adaptive relevance threshold
              </p>
              <p>
                Current threshold: <span className="text-white">{adaptiveThreshold}</span>. The agent learns from your
                feedback to boost the precision of alerts.
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <RefreshCw className={clsx("h-4 w-4", isLoading && "animate-spin")} />
              <span>{isLoading ? "Syncing latest market intel..." : "Stream updated every 60 seconds"}</span>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
              {rankedArticles.length} targeted stories
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {error && (
              <div className="col-span-full rounded-2xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-200">
                Failed to load alerts: {error.message}
              </div>
            )}

            {!error && rankedArticles.length === 0 && !isLoading && (
              <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
                No stories crossed your adaptive threshold yet. Try expanding your focus pairs or topics.
              </div>
            )}

            {rankedArticles.map((article) => (
              <article
                key={article.id}
                className={clsx(
                  "group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-900/70 p-5 transition hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-slate-900",
                  !seenArticles.current.has(article.id) && "ring-2 ring-emerald-500/40"
                )}
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <Flame className="h-4 w-4 text-amber-400" />
                  <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
                </div>
                <header className="mt-3 space-y-2">
                  <h3 className="text-lg font-semibold leading-tight text-white">{article.title}</h3>
                  <p className="text-xs text-slate-400">
                    {article.source} · Relevance {Math.round(article.relevanceScore ?? 0)} · Sentiment{" "}
                    {article.sentiment}
                  </p>
                </header>
                <p className="mt-3 text-sm text-slate-300">{article.summary ?? article.content}</p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                  {(article.currencyPairs ?? []).map((pair) => (
                    <span key={pair} className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200">
                      {pair}
                    </span>
                  ))}
                  {(article.topics ?? []).map((topic) => (
                    <span key={topic} className="rounded-full bg-slate-700/40 px-3 py-1 text-slate-200">
                      {topic}
                    </span>
                  ))}
                </div>

                <footer className="mt-5 flex items-center justify-between text-xs">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-emerald-300 transition hover:text-emerald-200"
                  >
                    View full coverage →
                  </a>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFeedback(article, true)}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Useful
                    </button>
                    <button
                      onClick={() => handleFeedback(article, false)}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-700/40 px-3 py-1 font-semibold text-slate-300 transition hover:bg-slate-700/60"
                    >
                      Skip
                    </button>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PreferenceGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: any[];
  selected: any[];
  onToggle: (item: any) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-medium text-slate-200">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isActive = selected.includes(item as never);
          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              className={clsx(
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                isActive
                  ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700/70 bg-slate-900/70 text-slate-300 hover:border-slate-600 hover:bg-slate-800"
              )}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function boostFromSignals(article: ForexNewsArticle, signals: AlertLearningSignal[]) {
  if (!signals?.length) return 0;
  return signals.reduce((score, signal) => {
    const overlaps =
      signal.pairs.filter((pair) => article.currencyPairs?.includes(pair)).length +
      signal.topics.filter((topic) => article.topics?.includes(topic)).length;
    const decay = 1 - Math.min(1, (Date.now() - signal.timestamp) / (1000 * 60 * 60 * 24 * 3));
    const weight = signal.helpful ? 12 : -10;
    return score + overlaps * weight * decay;
  }, 0);
}
