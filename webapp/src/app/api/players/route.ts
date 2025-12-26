import { NextResponse } from "next/server";
import { makePlayerBlueprint } from "@/lib/playerGenerator";
import type { PlayerBlueprint } from "@/lib/types";

type RequestBody = {
  seed?: number;
  attributes?: Partial<PlayerBlueprint>;
  imageCount?: number;
};

const DICEBEAR_ENDPOINT = "https://api.dicebear.com/7.x/adventurer/png";

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody;
  const seed = body.seed ?? Math.floor(Math.random() * 1_000_000);
  const imageCount = Math.min(Math.max(body.imageCount ?? 3, 1), 6);

  const blueprint = mergeBlueprint(makePlayerBlueprint(seed), body.attributes);
  const replicateToken = process.env.REPLICATE_API_TOKEN;

  try {
    if (!replicateToken) {
      const urls = await generateWithDiceBear(blueprint, imageCount, seed);
      return NextResponse.json({ blueprint, images: urls, provider: "dicebear-fallback" });
    }

    const { urls, predictionId } = await generateWithReplicate(blueprint, imageCount, replicateToken);
    return NextResponse.json({ blueprint, images: urls, provider: "replicate", predictionId });
  } catch (error) {
    console.error("Failed to generate player imagery", error);
    const urls = await generateWithDiceBear(blueprint, imageCount, seed);
    return NextResponse.json({ blueprint, images: urls, provider: "dicebear-degraded" });
  }
}

function mergeBlueprint(base: PlayerBlueprint, attributes?: Partial<PlayerBlueprint>): PlayerBlueprint {
  if (!attributes) return base;
  return {
    ...base,
    ...attributes,
    appearance: {
      ...base.appearance,
      ...(attributes.appearance ?? {}),
      accessories: attributes.appearance?.accessories ?? base.appearance.accessories,
    },
    attire: {
      ...base.attire,
      ...(attributes.attire ?? {}),
    },
    clubColors: attributes.clubColors ?? base.clubColors,
    personality: attributes.personality ?? base.personality,
  };
}

async function generateWithDiceBear(blueprint: PlayerBlueprint, count: number, seed: number) {
  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    const params = new URLSearchParams({
      seed: `${seed + i}`,
      backgroundColor: blueprint.clubColors.join(",").replace(/#/g, ""),
      accessoriesProbability: "80",
    });
    urls.push(`${DICEBEAR_ENDPOINT}?${params.toString()}`);
  }
  return urls;
}

async function generateWithReplicate(blueprint: PlayerBlueprint, count: number, token: string) {
  const prompt = buildPrompt(blueprint);
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({
      version: "d1d6037ebcf74b5698ce2b52e08d6c9b8d196327582f5ea18284d888fffbe148", // stable-diffusion-xl
      input: {
        prompt,
        negative_prompt: "distorted, low resolution, text artifacts, watermark, photo frame",
        num_outputs: count,
        image_dimensions: "1024x1024",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Replicate request failed ${response.status}`);
  }

  const payload = await response.json();

  const predictionId = payload.id;
  const polling = await pollPrediction(predictionId, token);
  const urls = polling.output as string[] | undefined;

  if (!urls?.length) {
    throw new Error("Replicate did not return images");
  }

  return { urls, predictionId };
}

async function pollPrediction(id: string, token: string, attempt = 0): Promise<any> {
  if (attempt > 20) {
    throw new Error("Prediction timed out");
  }
  const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: {
      Authorization: `Token ${token}`,
    },
    next: { revalidate: 0 },
  });
  const payload = await response.json();
  if (payload.status === "succeeded") {
    return payload;
  }
  if (payload.status === "failed" || payload.status === "canceled") {
    throw new Error(`Prediction ${payload.status}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return pollPrediction(id, token, attempt + 1);
}

function buildPrompt(blueprint: PlayerBlueprint) {
  return [
    `ultra detailed portrait of a fictional ${blueprint.nationality} ${blueprint.position}`,
    `age ${blueprint.age}, ${blueprint.dominantFoot.toLowerCase()} footed player`,
    `wearing ${blueprint.attire.pattern} kit in ${blueprint.clubColors.join(" and ")}`,
    `hairstyle: ${blueprint.appearance.hairstyle}, facial hair: ${blueprint.appearance.facialHair}`,
    `accessories: ${blueprint.appearance.accessories.join(", ") || "none"}`,
    `personality: ${blueprint.personality.join(", ")}`,
    `playing style: ${blueprint.playingStyle}`,
    "cinematic lighting, 8k, high fidelity, sports photography, bokeh",
  ].join(", ");
}
