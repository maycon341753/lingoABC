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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = pickFirstHeader(req.headers.origin);
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const apiKeyRaw = process.env.ASSAS_API_KEY;
  const supaUrl = process.env.SUPABASE_URL;
  const supaServiceKey = process.env.SUPABASE_SERVICE_ROLE;
  if (!apiKeyRaw || !supaUrl || !supaServiceKey) return res.status(500).send("Missing server environment variables");
  const apiKey = String(apiKeyRaw).trim();

  const authHeader = pickFirstHeader(req.headers.authorization);
  const token = isString(authHeader) ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
  if (!token) return res.status(401).send("Missing Authorization");

  const { paymentId } = (req.body ?? {}) as { paymentId?: unknown };
  if (!isString(paymentId) || !paymentId.trim()) return res.status(400).json({ error: "missing_paymentId" });

  const supabaseAdmin = createClient(supaUrl, supaServiceKey);
  const userTry = await supabaseAdmin.auth.getUser(token);
  const user = userTry.data.user;
  if (!user?.id) return res.status(401).send("Invalid user token");

  const paymentResp = await fetch(`${asaasBaseUrl}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { "User-Agent": "lingoabc", access_token: apiKey },
  });
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
  const description = String(paymentObj["description"] ?? paymentObj["externalReference"] ?? "Assinatura");
  const value = Number(paymentObj["value"] ?? paymentObj["amount"] ?? 0);

  const confirmed = isConfirmedStatus(statusRaw);
  const status = confirmed ? "active" : "pending";

  const { data: planExact } = await supabaseAdmin
    .from("plans")
    .select("id,period_months,price")
    .eq("name", description)
    .maybeSingle();
  let plan = planExact as { id: string; period_months: number | null; price: number | null } | null;
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

  const periodMonths = Math.max(1, Number(plan?.period_months ?? 1));
  const planId = plan?.id ?? null;
  const start = new Date(receivedDateIso);
  const expires = new Date(start);
  expires.setMonth(expires.getMonth() + periodMonths);

  const amount = value || Number(plan?.price ?? 0);

  const up = await supabaseAdmin
    .from("subscriptions")
    .upsert({
      user_id: user.id,
      plan_id: planId,
      status,
      value: amount,
      started_at: start.toISOString(),
      expires_at: expires.toISOString(),
    })
    .select("status,expires_at,plan_id");

  if (up.error) return res.status(400).json({ error: up.error.message });

  return res.status(200).json({
    ok: true,
    paymentId,
    status,
    expires_at: up.data?.[0]?.expires_at ?? expires.toISOString(),
    plan_id: up.data?.[0]?.plan_id ?? planId,
  });
}
