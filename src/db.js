function headers(env) {
  return {
    apikey: env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
    "Content-Type": "application/json"
  };
}

async function rest(env, path, options = {}) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers(env), ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function createTask(env, task) {
  return rest(env, "tasks", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(task)
  });
}

export async function getRunnableTasks(env, limit = 10) {
  return rest(env, `tasks?status=eq.pending&order=created_at.asc&limit=${limit}`);
}

export async function updateTask(env, id, patch) {
  return rest(env, `tasks?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch)
  });
}

export async function getTask(env, id) {
  const rows = await rest(env, `tasks?id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows?.[0] || null;
}

export async function logRun(env, row) {
  return rest(env, "agent_runs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(row)
  });
}

export async function getDailySummary(env) {
  const today = new Date().toISOString().slice(0, 10);
  return rest(env, `tasks?created_at=gte.${today}T00:00:00Z&select=id,agent,title,status,authority_level,result,error,created_at,completed_at&order=created_at.desc&limit=100`);
}
