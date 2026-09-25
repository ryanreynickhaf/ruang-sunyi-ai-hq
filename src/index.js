import { createTask, getRunnableTasks, updateTask, getTask, logRun, getDailySummary } from "./db.js";
import { runAI } from "./ai.js";
import { AGENTS } from "./agents.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
function authorized(req, env) {
  return req.headers.get("authorization") === `Bearer ${env.ADMIN_TOKEN}`;
}

async function processTask(env, task) {
  const max = Number(env.MAX_AUTONOMOUS_LEVEL || 2);
  if (Number(task.authority_level || 0) > max) {
    await updateTask(env, task.id, { status: "waiting_approval" });
    return { id: task.id, status: "waiting_approval" };
  }

  await updateTask(env, task.id, { status: "running", started_at: new Date().toISOString() });
  try {
    const result = await runAI(env, task);
    await updateTask(env, task.id, {
      status: "completed",
      result: result.text,
      model_used: result.model,
      usage_json: result.usage,
      completed_at: new Date().toISOString()
    });
    await logRun(env, { task_id: task.id, agent: task.agent, status: "completed", model_used: result.model, usage_json: result.usage, latency_ms: result.latency_ms });
    return { id: task.id, status: "completed" };
  } catch (error) {
    await updateTask(env, task.id, { status: "failed", error: String(error), completed_at: new Date().toISOString() });
    await logRun(env, { task_id: task.id, agent: task.agent, status: "failed", error: String(error) });
    return { id: task.id, status: "failed", error: String(error) };
  }
}

async function drainQueue(env, maxJobs = 5) {
  const tasks = await getRunnableTasks(env, maxJobs);
  const results = [];
  for (const task of tasks || []) results.push(await processTask(env, task));
  return results;
}

async function dailyHQ(env) {
  const rows = await getDailySummary(env);
  const prompt = `Create a concise HQ daily report from these task records. Separate completed, failed, waiting approval, and next priorities. Do not invent missing facts.\n\n${JSON.stringify(rows)}`;
  await createTask(env, {
    agent: "kim",
    title: "Daily HQ Summary",
    prompt,
    authority_level: 1,
    status: "pending",
    source: "cron"
  });
  return drainQueue(env, 10);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return json({ ok: true, service: "ruang-sunyi-ai-hq", agents: Object.keys(AGENTS) });
    if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);

    if (request.method === "POST" && url.pathname === "/tasks") {
      const body = await request.json();
      if (!AGENTS[body.agent]) return json({ error: "unknown agent" }, 400);
      const level = Number(body.authority_level ?? 1);
      if (!Number.isInteger(level) || level < 0 || level > 4) return json({ error: "authority_level must be 0..4" }, 400);
      const rows = await createTask(env, {
        agent: body.agent,
        title: body.title || "Untitled task",
        prompt: body.prompt,
        authority_level: level,
        status: level > Number(env.MAX_AUTONOMOUS_LEVEL || 2) ? "waiting_approval" : "pending",
        source: body.source || "api"
      });
      return json(rows?.[0] || rows, 201);
    }

    if (request.method === "POST" && url.pathname === "/run") return json({ processed: await drainQueue(env, 5) });

    const approve = url.pathname.match(/^\/tasks\/([^/]+)\/approve$/);
    if (request.method === "POST" && approve) {
      const task = await getTask(env, approve[1]);
      if (!task) return json({ error: "not found" }, 404);
      await updateTask(env, task.id, { status: "pending", approved_at: new Date().toISOString(), approved_by: "owner" });
      return json({ approved: true, task_id: task.id });
    }

    if (request.method === "GET" && url.pathname === "/agents") return json(AGENTS);
    if (request.method === "GET" && url.pathname === "/summary") return json(await getDailySummary(env));
    return json({ error: "not found" }, 404);
  },

  async scheduled(controller, env, ctx) {
    // Cron is UTC. 00:00 UTC = 07:00 WIB; 11:00 UTC = 18:00 WIB.
    if (controller.cron === "0 0 * * *") ctx.waitUntil(dailyHQ(env));
    else ctx.waitUntil(drainQueue(env, 10));
  }
};
