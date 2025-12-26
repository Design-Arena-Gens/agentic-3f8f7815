import { NextResponse } from "next/server";
import { fetchForexNews } from "@/lib/news";
import type { CurrencyPair, NewsTopic } from "@/lib/types";

type RequestBody = {
  pairs?: CurrencyPair[];
  topics?: NewsTopic[];
  limit?: number;
};

export async function POST(request: Request) {
  const { pairs, topics, limit } = (await request.json()) as RequestBody;
  const articles = await fetchForexNews({ pairs, topics, limit });

  return NextResponse.json({ articles });
}
