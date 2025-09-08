// src/lib/openai.ts
import fetch from "node-fetch"; // optional if Node<18. Node 18+ has global fetch.
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_KEY) {
  console.warn("OPENAI_API_KEY is not set — generate-scenarios will fail without it.");
}

export async function callOpenAI(prompt: string) {
  if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY not configured on server.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // change to a model you have access to (or gpt-4o, gpt-4, gpt-3.5-turbo)
      messages: [
        { role: "system", content: "You are a helpful assistant that converts requirements and documents into structured test scenarios. Return only valid JSON (an array) unless explicitly asked otherwise." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${txt}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "";
  return content;
}
