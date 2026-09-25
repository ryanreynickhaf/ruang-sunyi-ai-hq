import { AGENTS } from "./agents.js";

export async function runAI(env, task) {
  const agent = AGENTS[task.agent] || AGENTS.kim;
  const model = Number(task.authority_level || 0) >= 2 ? env.STRONG_MODEL : env.DEFAULT_MODEL;
  const started = Date.now();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://ruangsunyicoffee.my.id/",
      "X-Title": "Ruang Sunyi AI HQ"
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: agent.system },
        { role: "system", content: `Authority level: ${task.authority_level}. Verified runtime facts for this request: the Cloudflare Worker is actively executing this task, the task was successfully read from the Supabase queue, and the AI provider request is currently being processed. You may state those facts as verified. Do not claim the status of any other external system unless evidence is provided. Do not pretend to execute external actions. Return operationally useful JSON or concise text.` },
        { role: "user", content: task.prompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content || "",
    model: data.model || model,
    usage: data.usage || null,
    latency_ms: Date.now() - started
  };
}
