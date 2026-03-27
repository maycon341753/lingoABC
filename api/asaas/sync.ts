import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const asaasBaseUrl = (process.env.ASAAS_API_URL || "https://api.asaas.com/v3").replace(/\/+$/, "");

const isAllowedOrigin = (origin: string) => {
  if (origin === "http://localhost:8080") return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
};

const isString = (v: unknown): v is string => typeof v === "string";

const pickFirstHeader = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const normalizeStatus = (v: unknown) => String(v ?? "").toLowerCase();

const isConfirmedStatus = (s: string) => ["confirmed", "received", "received_in_cash"].includes(s);

const decodeJwtPayload = (token: string) => {
  try {
    const part = token.split(".")[1] ?? "";
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const json = Buffer.from(normalized, "base64").toString("utf8");
    const obj = JSON.parse(json) as unknown;
    if (typeof obj === "object" && obj !== null) return obj as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
};

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
  const origin = pickFirstHeader(req.headers.origin);
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const apiKeyRaw = process.env.ASSAS_API_KEY;
  const supaUrl = process.env.SUPABASE_URL;
  const supaServiceKey = process.env.SUPABASE_SERVICE_ROLE;
  if (!apiKeyRaw || !supaUrl || !supaServiceKey) {
    return res.status(500).json({ error: "missing_server_env", required: ["ASSAS_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE"] });
  }
  const apiKey = String(apiKeyRaw).trim();

  const authHeader = pickFirstHeader(req.headers.authorization);
  const token = isString(authHeader) ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
  if (!token) return res.status(401).json({ error: "missing_authorization" });

  const { paymentId } = (req.body ?? {}) as { paymentId?: unknown };
  if (!isString(paymentId) || !paymentId.trim()) return res.status(400).json({ error: "missing_paymentId" });

  const supabaseAdmin = createClient(supaUrl, supaServiceKey);
  const payload = decodeJwtPayload(token);
  const userIdRaw = typeof payload?.sub === "string" ? String(payload.sub) : "";
  const userId = userIdRaw && isUuid(userIdRaw) ? userIdRaw : "";
  if (!userId) return res.status(401).json({ error: "invalid_user_token" });

  let paymentResp: Response;
  try {
    paymentResp = await fetch(`${asaasBaseUrl}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { "User-Agent": "lingoabc", access_token: apiKey },
    });
  } catch {
    return res.status(200).json({ ok: false, error: "asaas_unreachable", status: "pending" });
  }
  const paymentText = await paymentResp.text();
  let paymentJson: unknown = null;
  try {
    paymentJson = JSON.parse(paymentText);
  } catch {
    paymentJson = { raw: paymentText };
  }
  if (!paymentResp.ok) return res.status(paymentResp.status).json(paymentJson);

  const paymentObj =
    typeof paymentJson === "object" && paymentJson !== null ? (paymentJson as Record<string, unknown>) : {};
  const statusRaw = normalizeStatus(paymentObj["status"]);
  const confirmedDate =
    (paymentObj["confirmedDate"] ?? paymentObj["paymentDate"] ?? paymentObj["effectiveDate"] ?? null) as unknown;
  const receivedDateIso = isString(confirmedDate) && confirmedDate ? confirmedDate : new Date().toISOString();
  const description = String(paymentObj["description"] ?? "Assinatura");
  const externalReference = typeof paymentObj["externalReference"] === "string" ? String(paymentObj["externalReference"]) : "";
  const value = Number(paymentObj["value"] ?? paymentObj["amount"] ?? 0);

  const ext = externalReference.trim();
  const extLooksLikeUuid = ext && isUuid(ext);
  if (extLooksLikeUuid && ext !== userId) {
    return res.status(403).json({ error: "forbidden_payment_owner" });
  }

  const confirmed = isConfirmedStatus(statusRaw);
  const status = confirmed ? "active" : "pending";

  let plan: { id: string; period_months: number | null; price: number | null } | null = null;
  try {
    const { data: planExact } = await supabaseAdmin
      .from("plans")
      .select("id,period_months,price")
      .eq("name", description)
      .maybeSingle();
    plan = planExact as { id: string; period_months: number | null; price: number | null } | null;
    if (!plan) {
      const { data: planFallback } = await supabaseAdmin
        .from("plans")
        .select("id,period_months,price")
        .ilike("name", `%${description}%`)
        .order("period_months", { ascending: true })
        .limit(1)
        .maybeSingle();
      plan = planFallback as { id: string; period_months: number | null; price: number | null } | null;
    }
  } catch {
    return res.status(200).json({ ok: true, status, db_synced: false, error: "supabase_unreachable" });
  }

  const periodMonths = Math.max(1, Number(plan?.period_months ?? 1));
  const planId = plan?.id ?? null;
  const start = new Date(receivedDateIso);
  const expires = new Date(start);
  expires.setMonth(expires.getMonth() + periodMonths);

  const amount = value || Number(plan?.price ?? 0);

  const up = await supabaseAdmin
    .from("subscriptions")
    .upsert({
      user_id: userId,
      plan_id: planId,
      status,
      value: amount,
      started_at: start.toISOString(),
      expires_at: expires.toISOString(),
    })
    .select("status,expires_at,plan_id");

  if (up.error) {
    const msg = String(up.error.message ?? "");
    if (/fetch failed/i.test(msg)) {
      return res.status(200).json({ ok: true, status, db_synced: false, error: "supabase_unreachable" });
    }
    return res.status(400).json({ error: msg || "upsert_failed" });
  }

  return res.status(200).json({
    ok: true,
    paymentId,
    status,
    db_synced: true,
    expires_at: up.data?.[0]?.expires_at ?? expires.toISOString(),
    plan_id: up.data?.[0]?.plan_id ?? planId,
  });
  } catch {
    return res.status(200).json({ ok: true, status: "pending", db_synced: false, error: "server_error" });
  }
}
