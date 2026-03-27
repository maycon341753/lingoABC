import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const asaasBaseUrl = (process.env.ASAAS_API_URL || "https://api.asaas.com/v3").replace(/\/+$/, "");
const isAllowedOrigin = (origin: string) => {
  if (origin === "http://localhost:8080") return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
};

const pickFirstHeader = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const normalizeStatus = (v: unknown) => String(v ?? "").toLowerCase();
const isConfirmedStatus = (s: string) => ["confirmed", "received", "received_in_cash"].includes(s);

type AsaasCustomer = { id?: unknown };
type AsaasCustomersResponse = { data?: unknown };
type AsaasPayment = {
  id?: unknown;
  status?: unknown;
  value?: unknown;
  description?: unknown;
  externalReference?: unknown;
  confirmedDate?: unknown;
  paymentDate?: unknown;
  effectiveDate?: unknown;
  dateCreated?: unknown;
};
type AsaasPaymentsResponse = { data?: unknown };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isString = (v: unknown): v is string => typeof v === "string";

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

const decodeJwtRole = (token: string) => {
  const payload = decodeJwtPayload(token);
  const role = typeof payload?.role === "string" ? String(payload.role) : "";
  return role || null;
};

async function fetchJson(url: string, apiKey: string) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "lingoabc", access_token: apiKey } });
    const text = await r.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { ok: r.ok, status: r.status, json };
  } catch {
    return { ok: false, status: 200, json: { ok: false, error: "asaas_unreachable", status: "pendente" } };
  }
}

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

  const apiKeyRaw = process.env.ASSAS_API_KEY;
  const supaUrlRaw = process.env.SUPABASE_URL;
  const supaServiceKeyRaw = process.env.SUPABASE_SERVICE_ROLE;
  if (!apiKeyRaw || !supaUrlRaw || !supaServiceKeyRaw) {
    return res.status(500).json({ error: "missing_server_env", required: ["ASSAS_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE"] });
  }
  const apiKey = String(apiKeyRaw).trim();
  const supaUrl = String(supaUrlRaw).trim();
  const supaServiceKey = String(supaServiceKeyRaw).trim();

  if (!/^https:\/\/.+\.supabase\.co\/?$/i.test(supaUrl)) {
    return res.status(500).json({ error: "invalid_server_env", invalid: ["SUPABASE_URL"] });
  }
  const serviceRole = decodeJwtRole(supaServiceKey);
  if (serviceRole !== "service_role") {
    return res.status(500).json({ error: "invalid_server_env", invalid: ["SUPABASE_SERVICE_ROLE"] });
  }

  const authHeader = pickFirstHeader(req.headers.authorization);
  const token = isString(authHeader) ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
  if (!token) return res.status(401).json({ error: "missing_authorization" });

  const supabaseAdmin = createClient(supaUrl, supaServiceKey);
  const payload = decodeJwtPayload(token);
  const userIdRaw = typeof payload?.sub === "string" ? String(payload.sub) : "";
  const userId = userIdRaw && isUuid(userIdRaw) ? userIdRaw : "";
  const email = typeof payload?.email === "string" ? String(payload.email).trim().toLowerCase() : "";
  if (!userId) return res.status(401).json({ error: "invalid_user_token" });

  if (!email) return res.status(400).json({ error: "missing_user_email" });

  const customers = await fetchJson(`${asaasBaseUrl}/customers?email=${encodeURIComponent(email)}&limit=1`, apiKey);
  if (!customers.ok) return res.status(customers.status).json(customers.json);

  const customersJson = customers.json as AsaasCustomersResponse;
  const customersData = Array.isArray(customersJson?.data) ? (customersJson.data as unknown[]) : [];
  const customer = (customersData[0] ?? null) as AsaasCustomer | null;
  const customerId = isString(customer?.id) ? (customer?.id as string) : null;
  if (!customerId) return res.status(200).json({ ok: true, info: "no_customer" });

  const payments = await fetchJson(`${asaasBaseUrl}/payments?customer=${encodeURIComponent(customerId)}&limit=20`, apiKey);
  if (!payments.ok) return res.status(payments.status).json(payments.json);

  const paymentsJson = payments.json as AsaasPaymentsResponse;
  const paymentsData = Array.isArray(paymentsJson?.data) ? (paymentsJson.data as unknown[]) : [];
  const paymentRows = paymentsData.filter(isRecord) as Array<Record<string, unknown>>;

  const confirmedPayments = paymentRows
    .map((p) => p as AsaasPayment)
    .filter((p) => isConfirmedStatus(normalizeStatus(p.status)));

  if (!confirmedPayments.length) return res.status(200).json({ ok: true, info: "no_confirmed_payment" });

  const pickTime = (p: AsaasPayment) => {
    const iso =
      (isString(p.confirmedDate) && p.confirmedDate) ||
      (isString(p.paymentDate) && p.paymentDate) ||
      (isString(p.effectiveDate) && p.effectiveDate) ||
      (isString(p.dateCreated) && p.dateCreated) ||
      "";
    const t = iso ? new Date(iso).getTime() : NaN;
    return Number.isFinite(t) ? t : 0;
  };

  confirmedPayments.sort((a, b) => pickTime(b) - pickTime(a));
  const latest = confirmedPayments[0] as AsaasPayment;

  const paymentId = isString(latest.id) ? (latest.id as string) : null;
  const description = String(latest.description ?? "Assinatura");
  const externalReference = isString(latest.externalReference) ? String(latest.externalReference) : "";
  const value = Number(latest.value ?? 0);
  const receivedDateIso =
    (isString(latest.confirmedDate) && latest.confirmedDate) ||
    (isString(latest.paymentDate) && latest.paymentDate) ||
    (isString(latest.effectiveDate) && latest.effectiveDate) ||
    (isString(latest.dateCreated) && latest.dateCreated) ||
    new Date().toISOString();

  const ext = externalReference.trim();
  const extLooksLikeUuid = ext && isUuid(ext);
  if (extLooksLikeUuid && ext !== userId) {
    return res.status(403).json({ error: "forbidden_payment_owner" });
  }

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
    return res.status(200).json({ ok: true, status: "ativa", db_synced: false, error: "supabase_unreachable" });
  }

  const periodMonths = Math.max(1, Number(plan?.period_months ?? 1));
  const planId = plan?.id ?? null;
  const start = new Date(receivedDateIso);
  const expires = new Date(start);
  expires.setMonth(expires.getMonth() + periodMonths);
  const amount = value || Number(plan?.price ?? 0);

  const subPayload = {
    user_id: userId,
    plan_id: planId,
    status: "ativa",
    value: amount,
    started_at: start.toISOString(),
    expires_at: expires.toISOString(),
  };

  const { data: existingSub } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .order("expires_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  let up;
  if (existingSub?.id) {
    up = await supabaseAdmin.from("subscriptions").update(subPayload).eq("id", existingSub.id).select("status,expires_at,plan_id");
  } else {
    up = await supabaseAdmin.from("subscriptions").insert(subPayload).select("status,expires_at,plan_id");
  }

  if (up.error) {
    const msg = String(up.error.message ?? "");
    if (/fetch failed/i.test(msg)) {
      return res.status(200).json({ ok: true, status: "ativa", db_synced: false, error: "supabase_unreachable" });
    }
    return res.status(400).json({ error: msg || "upsert_failed" });
  }

  return res.status(200).json({
    ok: true,
    paymentId,
    status: up.data?.[0]?.status ?? "ativa",
    db_synced: true,
    expires_at: up.data?.[0]?.expires_at ?? expires.toISOString(),
    plan_id: up.data?.[0]?.plan_id ?? planId,
  });
}
