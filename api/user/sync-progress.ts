import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const isAllowedOrigin = (origin: string) => {
  if (origin === "http://localhost:8080") return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (origin === "https://www.lingoabc.com.br") return true;
  if (origin === "https://lingoabc.com.br") return true;
  return false;
};

const pickFirstHeader = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const isString = (v: unknown): v is string => typeof v === "string";
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const decodeJwtPayload = (token: string) => {
  try {
    const part = token.split(".")[1] ?? "";
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const json = Buffer.from(normalized, "base64").toString("utf8");
    const obj = JSON.parse(json) as unknown;
    return isRecord(obj) ? obj : null;
  } catch {
    return null;
  }
};

const decodeJwtRole = (token: string) => {
  const payload = decodeJwtPayload(token);
  const role = typeof payload?.role === "string" ? String(payload.role) : "";
  return role || null;
};

type ActivityInput = {
  subject: string;
  module: string;
  lesson_id: number;
  status?: string | null;
  score?: number | null;
  created_at?: string | null;
};

type ModuleProgressInput = {
  subject: string;
  module: string;
  completed_lessons: number;
  completed?: boolean;
};

const clampInt = (v: unknown, min: number, max: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = pickFirstHeader(req.headers.origin);
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const supaUrlRaw = process.env.SUPABASE_URL;
  const supaServiceKeyRaw = process.env.SUPABASE_SERVICE_ROLE;
  if (!supaUrlRaw || !supaServiceKeyRaw) {
    return res.status(500).json({ error: "missing_server_env", required: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE"] });
  }
  const supaUrl = String(supaUrlRaw).trim();
  const supaServiceKey = String(supaServiceKeyRaw).trim();
  if (decodeJwtRole(supaServiceKey) !== "service_role") {
    return res.status(500).json({ error: "invalid_server_env", invalid: ["SUPABASE_SERVICE_ROLE"] });
  }

  const authHeader = pickFirstHeader(req.headers.authorization);
  const token = isString(authHeader) ? authHeader.replace(/^Bearer\\s+/i, "").trim() : "";
  if (!token) return res.status(401).json({ error: "missing_authorization" });

  const payload = decodeJwtPayload(token);
  const requesterIdRaw = isString(payload?.sub) ? String(payload.sub) : "";
  const requesterId = requesterIdRaw && isUuid(requesterIdRaw) ? requesterIdRaw : "";
  if (!requesterId) return res.status(401).json({ error: "invalid_user_token" });

  const body = (req.body ?? {}) as unknown;
  if (!isRecord(body)) return res.status(400).json({ error: "invalid_body" });

  const activitiesRaw = Array.isArray(body.activities) ? (body.activities as unknown[]) : [];
  const moduleProgressRaw = Array.isArray(body.moduleProgress) ? (body.moduleProgress as unknown[]) : [];
  const maxActivities = 400;
  const maxModules = 50;

  const activities: ActivityInput[] = activitiesRaw
    .slice(0, maxActivities)
    .map((x) => (isRecord(x) ? (x as ActivityInput) : null))
    .filter((x): x is ActivityInput => x !== null)
    .map((a) => ({
      subject: String(a.subject ?? "").slice(0, 20),
      module: String(a.module ?? "").slice(0, 40),
      lesson_id: clampInt(a.lesson_id, 1, 200),
      status: String(a.status ?? "completed").slice(0, 20),
      score: Number.isFinite(Number(a.score)) ? Number(a.score) : null,
      created_at: isString(a.created_at) ? String(a.created_at) : null,
    }))
    .filter((a) => a.subject && a.module);

  const moduleProgress: ModuleProgressInput[] = moduleProgressRaw
    .slice(0, maxModules)
    .map((x) => (isRecord(x) ? (x as ModuleProgressInput) : null))
    .filter((x): x is ModuleProgressInput => x !== null)
    .map((m) => ({
      subject: String(m.subject ?? "").slice(0, 20),
      module: String(m.module ?? "").slice(0, 40),
      completed_lessons: clampInt(m.completed_lessons, 0, 200),
      completed: Boolean(m.completed ?? false),
    }))
    .filter((m) => m.subject && m.module);

  const supabaseAdmin = createClient(supaUrl, supaServiceKey);

  if (activities.length > 0) {
    const toUpsert = activities.map((a) => ({
      user_id: requesterId,
      subject: a.subject,
      module: a.module,
      lesson_id: a.lesson_id,
      status: a.status ?? "completed",
      score: a.score ?? null,
      ...(a.created_at ? { created_at: a.created_at } : {}),
    }));
    const up = await supabaseAdmin.from("user_activity_progress").upsert(toUpsert, { onConflict: "user_id,subject,module,lesson_id" });
    if (up.error) {
      const msg = String(up.error.message ?? "").toLowerCase();
      const noConstraint = msg.includes("no unique or exclusion constraint") || msg.includes("42p10");
      if (!noConstraint) return res.status(500).json({ error: "upsert_failed", table: "user_activity_progress", message: up.error.message });
      const ins = await supabaseAdmin.from("user_activity_progress").insert(toUpsert);
      if (ins.error) return res.status(500).json({ error: "insert_failed", table: "user_activity_progress", message: ins.error.message });
    }
  }

  if (moduleProgress.length > 0) {
    const toUpsert = moduleProgress.map((m) => ({
      user_id: requesterId,
      subject: m.subject,
      module: m.module,
      completed_lessons: m.completed_lessons,
      completed: Boolean(m.completed),
      updated_at: new Date().toISOString(),
    }));
    const up = await supabaseAdmin.from("user_module_progress").upsert(toUpsert, { onConflict: "user_id,subject,module" });
    if (up.error) {
      const msg = String(up.error.message ?? "").toLowerCase();
      const noConstraint = msg.includes("no unique or exclusion constraint") || msg.includes("42p10");
      if (!noConstraint) return res.status(500).json({ error: "upsert_failed", table: "user_module_progress", message: up.error.message });
      const ins = await supabaseAdmin.from("user_module_progress").insert(toUpsert);
      if (ins.error) return res.status(500).json({ error: "insert_failed", table: "user_module_progress", message: ins.error.message });
    }
  }

  return res.status(200).json({ ok: true, activities: activities.length, modules: moduleProgress.length });
}
