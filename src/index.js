import { createTask, getRunnableTasks, updateTask, getTask, logRun, getDailySummary } from "./db.js";
import { runAI } from "./ai.js";
import { AGENTS } from "./agents.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
function authorized(req, env) {
  return req.headers.get("authorization") === `Bearer ${env.ADMIN_TOKEN}`;
}

function dashboard() {
  const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Ruang Sunyi AI HQ</title>
  <style>
    :root { font-family: Inter, system-ui, Arial, sans-serif; color:#111827; background:#f5f7fb; }
    body { margin:0; }
    header { background:#111827; color:white; padding:22px 24px; }
    header h1 { margin:0 0 4px; font-size:24px; }
    header p { margin:0; opacity:.75; }
    main { max-width:1100px; margin:24px auto; padding:0 16px 40px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:16px; }
    .card { background:white; border:1px solid #e5e7eb; border-radius:16px; padding:18px; box-shadow:0 6px 24px rgba(0,0,0,.04); }
    label { display:block; font-size:13px; font-weight:700; margin:12px 0 6px; }
    input, select, textarea { width:100%; box-sizing:border-box; border:1px solid #d1d5db; border-radius:10px; padding:10px 12px; font:inherit; background:white; }
    textarea { min-height:120px; resize:vertical; }
    button { border:0; border-radius:10px; padding:10px 14px; font-weight:700; cursor:pointer; background:#111827; color:white; }
    button.secondary { background:#e5e7eb; color:#111827; }
    button.approve { background:#166534; }
    .row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:14px; }
    .muted { color:#6b7280; font-size:13px; }
    .ok { color:#166534; } .bad { color:#b91c1c; }
    .agents { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
    .pill { padding:7px 10px; border-radius:999px; background:#eef2ff; font-size:13px; }
    .task { border-top:1px solid #e5e7eb; padding:14px 0; }
    .task:first-child { border-top:0; }
    .task h3 { margin:0 0 6px; font-size:15px; }
    .task pre { white-space:pre-wrap; word-break:break-word; background:#f9fafb; padding:10px; border-radius:8px; max-height:220px; overflow:auto; }
    .status { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
  </style>
</head>
<body>
<header>
  <h1>Ruang Sunyi AI HQ</h1>
  <p>Kim + Jarvis + Nara + Maya + Raka + Charles + Vans</p>
</header>
<main>
  <div class="grid">
    <section class="card">
      <h2>Login Owner</h2>
      <p class="muted">Masukkan ADMIN_TOKEN Cloudflare. Token disimpan hanya di browser ini.</p>
      <label>ADMIN_TOKEN</label>
      <input id="token" type="password" placeholder="Tempel token Owner" />
      <div class="row">
        <button onclick="saveToken()">Simpan Token</button>
        <button class="secondary" onclick="clearToken()">Hapus Token</button>
      </div>
      <p id="authStatus" class="muted"></p>
    </section>

    <section class="card">
      <h2>Status Agent</h2>
      <div class="agents">
        <span class="pill">Kim</span><span class="pill">Jarvis</span><span class="pill">Nara</span>
        <span class="pill">Maya</span><span class="pill">Raka</span><span class="pill">Charles</span><span class="pill">Vans</span>
      </div>
      <p class="muted">Level 0–2 dapat diproses otomatis. Level 3–4 menunggu approval.</p>
      <div class="row"><button class="secondary" onclick="loadSummary()">Refresh Status</button></div>
    </section>
  </div>

  <section class="card" style="margin-top:16px">
    <h2>Buat Task</h2>
    <div class="grid">
      <div>
        <label>Agent</label>
        <select id="agent">
          <option value="kim">Kim — HQ</option>
          <option value="jarvis">Jarvis — Tech</option>
          <option value="nara">Nara — Finance</option>
          <option value="maya">Maya — Product</option>
          <option value="raka">Raka — Operations</option>
          <option value="charles">Charles — Instagram</option>
          <option value="vans">Vans — Creative</option>
        </select>
      </div>
      <div>
        <label>Authority Level</label>
        <select id="level">
          <option value="0">0 — informasi</option>
          <option value="1" selected>1 — analisis</option>
          <option value="2">2 — reversible</option>
          <option value="3">3 — butuh approval</option>
          <option value="4">4 — Owner approval</option>
        </select>
      </div>
    </div>
    <label>Judul</label>
    <input id="title" value="Tes pertama Kim" />
    <label>Perintah</label>
    <textarea id="prompt">Konfirmasi bahwa AI HQ online dan buat ringkasan singkat status sistem saat ini tanpa mengarang tindakan yang belum dilakukan.</textarea>
    <div class="row">
      <button onclick="createTask()">Kirim Task</button>
      <button class="secondary" onclick="runQueue()">Jalankan Queue</button>
    </div>
    <p id="actionStatus" class="muted"></p>
  </section>

  <section class="card" style="margin-top:16px">
    <h2>Task & Hasil</h2>
    <div id="tasks"><p class="muted">Belum dimuat.</p></div>
  </section>
</main>
<script>
  const base = location.origin;
  const tokenEl = document.getElementById('token');
  tokenEl.value = localStorage.getItem('rs_hq_token') || '';

  function headers(json=false) {
    const h = { Authorization: 'Bearer ' + (localStorage.getItem('rs_hq_token') || '') };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }
  async function saveToken() {
    const v = tokenEl.value.trim();
    localStorage.setItem('rs_hq_token', v);
    const s = document.getElementById('authStatus');
    try {
      await api('/auth-check');
      s.textContent = 'Token benar. Terautentikasi sebagai Owner.';
      await loadSummary();
    } catch(e) {
      s.textContent = e.message === 'unauthorized'
        ? 'ADMIN_TOKEN tidak cocok dengan Secret di Cloudflare.'
        : 'Gagal memeriksa token: ' + e.message;
    }
  }
  function clearToken() {
    localStorage.removeItem('rs_hq_token');
    tokenEl.value = '';
    document.getElementById('authStatus').textContent = 'Token dihapus dari browser.';
  }
  async function api(path, opts={}) {
    const r = await fetch(base + path, { ...opts, headers: { ...headers(!!opts.body), ...(opts.headers||{}) } });
    const data = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
    return data;
  }
  async function createTask() {
    const s = document.getElementById('actionStatus');
    try {
      s.textContent = 'Membuat task...';
      const body = {
        agent: document.getElementById('agent').value,
        title: document.getElementById('title').value,
        prompt: document.getElementById('prompt').value,
        authority_level: Number(document.getElementById('level').value)
      };
      await api('/tasks', { method:'POST', body:JSON.stringify(body) });
      s.textContent = 'Task berhasil dibuat.';
      await loadSummary();
    } catch(e) { s.textContent = 'Gagal: ' + e.message; }
  }
  async function runQueue() {
    const s = document.getElementById('actionStatus');
    try {
      s.textContent = 'Menjalankan queue...';
      const out = await api('/run', { method:'POST' });
      s.textContent = 'Selesai memproses ' + (out.processed?.length || 0) + ' task.';
      await loadSummary();
    } catch(e) { s.textContent = 'Gagal: ' + e.message; }
  }
  async function approve(id) {
    try {
      await api('/tasks/' + encodeURIComponent(id) + '/approve', { method:'POST' });
      await loadSummary();
    } catch(e) { alert('Gagal approve: ' + e.message); }
  }
  async function loadSummary() {
    const box = document.getElementById('tasks');
    try {
      const rows = await api('/summary');
      document.getElementById('authStatus').textContent = 'Terhubung ke backend.';
      if (!rows.length) { box.innerHTML = '<p class="muted">Belum ada task.</p>'; return; }
      box.innerHTML = rows.map(function(t) {
        return '<div class="task">' +
          '<h3>' + escapeHtml(t.title) + ' — ' + escapeHtml(t.agent) + '</h3>' +
          '<div><span class="status">' + escapeHtml(t.status) + '</span> · Level ' + t.authority_level + '</div>' +
          (t.result ? '<pre>' + escapeHtml(t.result) + '</pre>' : '') +
          (t.error ? '<pre class="bad">' + escapeHtml(t.error) + '</pre>' : '') +
          (t.status === 'waiting_approval'
            ? '<div class="row"><button class="approve" onclick="approve(&quot;' + t.id + '&quot;)">Approve</button></div>'
            : '') +
          '</div>';
      }).join('');
    } catch(e) {
      box.innerHTML = '<p class="bad">Tidak bisa membaca task: ' + escapeHtml(e.message) + '</p>';
      document.getElementById('authStatus').textContent =
        e.message === 'unauthorized'
          ? 'ADMIN_TOKEN tidak cocok dengan Secret di Cloudflare.'
          : 'Token diterima, tetapi backend/database error: ' + e.message;
    }
  }
  function escapeHtml(v='') {
    return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }
  if (localStorage.getItem('rs_hq_token')) loadSummary();
</script>
</body>
</html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
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
    if (url.pathname === "/") return dashboard();
    if (url.pathname === "/health") return json({ ok: true, service: "ruang-sunyi-ai-hq", agents: Object.keys(AGENTS) });
    if (url.pathname === "/auth-check") {
      return authorized(request, env) ? json({ ok: true, authenticated: true }) : json({ ok: false, authenticated: false, error: "unauthorized" }, 401);
    }
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
    if (controller.cron === "0 0 * * *") ctx.waitUntil(dailyHQ(env));
    else ctx.waitUntil(drainQueue(env, 10));
  }
};
