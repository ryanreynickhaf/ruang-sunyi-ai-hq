# Ruang Sunyi AI HQ — Starter

AI-agent orchestrator murah/event-driven untuk **Kim, Jarvis, Nara, Maya, Raka, Charles, dan Vans**.

## Arsitektur
- Cloudflare Worker: HTTP API + scheduler + queue runner ringan
- Supabase: tasks + agent run logs
- OpenRouter: AI model routing
- Approval: Level 0–2 otomatis; Level 3–4 `waiting_approval`
- Cron: 07:00 WIB daily HQ summary, 18:00 WIB queue processing

> Starter ini belum mengeksekusi GitHub, Gmail, POS, Instagram, atau pembayaran secara otomatis. Ia sengaja hanya menghasilkan hasil AI sampai tool/action integration ditambahkan dan diberi guardrail.

## 1. Buat project Supabase
Buat project gratis, buka SQL Editor, lalu jalankan isi `supabase/schema.sql`.

Ambil:
- Project URL
- Secret key (`sb_secret_...`)

Jangan taruh secret key di frontend/browser.

## 2. OpenRouter
Buat API key OpenRouter. Default worker memakai `openrouter/free`; `STRONG_MODEL` dapat diganti di `wrangler.jsonc`.

## 3. Setup Cloudflare Worker
Untuk alur browser-only, hubungkan repository ini ke Cloudflare Workers Builds melalui dashboard Cloudflare.

Secrets yang dibutuhkan:
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `OPENROUTER_API_KEY`
- `ADMIN_TOKEN`

## 4. Test
Health:

```
GET /health
```

Buat task:

```
POST /tasks
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json
```

Contoh body:
```json
{"agent":"raka","title":"Audit stok","prompt":"Analisis data stok yang diberikan dan tandai kebutuhan restock.","authority_level":1}
```

Jalankan queue:
```
POST /run
```

Lihat ringkasan:
```
GET /summary
```

Approve Level 3–4:
```
POST /tasks/TASK_UUID/approve
```

## Keamanan
- `SUPABASE_SECRET_KEY`, `OPENROUTER_API_KEY`, dan `ADMIN_TOKEN` harus menjadi Cloudflare secrets.
- Tabel Supabase memakai RLS dan akses `anon/authenticated` dicabut.
- Level 3–4 tidak berjalan otomatis.
- Starter tidak memiliki endpoint untuk mengirim uang, menghapus stok, push GitHub, atau tindakan eksternal irreversible.

## Tahap berikutnya
1. Tambah Telegram Bot sebagai UI Owner/Kim.
2. Tambah tool adapters: GitHub untuk Jarvis; POS API untuk Nara/Raka/Maya; Google Drive/Sheets untuk laporan; social publishing untuk Charles.
3. Tambah `tool_calls` table, idempotency key, retry/backoff, cost ceiling, dan per-tool approval policy.
4. Tambah dashboard web sederhana untuk task/agent/approval/cost.
