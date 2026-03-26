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

async function fetchJson(url: string, apiKey: string) {
  const r = await fetch(url, { headers: { "User-Agent": "lingoabc", access_token: apiKey } });
  const text = await r.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: r.ok, status: r.status, json };
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
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const apiKeyRaw = process.env.ASSAS_API_KEY;
  const supaUrl = process.env.SUPABASE_URL;
  const supaServiceKey = process.env.SUPABASE_SERVICE_ROLE;
  if (!apiKeyRaw || !supaUrl || !supaServiceKey) return res.status(500).send("Missing server environment variables");
  const apiKey = String(apiKeyRaw).trim();

  const authHeader = pickFirstHeader(req.headers.authorization);
  const token = isString(authHeader) ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
  if (!token) return res.status(401).send("Missing Authorization");

  const supabaseAdmin = createClient(supaUrl, supaServiceKey);
  const userTry = await supabaseAdmin.auth.getUser(token);
  const user = userTry.data.user;
  if (!user?.id) return res.status(401).send("Invalid user token");

  const email = String(user.email ?? "").trim().toLowerCase();
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
  const description = String(latest.description ?? latest.externalReference ?? "Assinatura");
  const value = Number(latest.value ?? 0);
  const receivedDateIso =
    (isString(latest.confirmedDate) && latest.confirmedDate) ||
    (isString(latest.paymentDate) && latest.paymentDate) ||
    (isString(latest.effectiveDate) && latest.effectiveDate) ||
    (isString(latest.dateCreated) && latest.dateCreated) ||
    new Date().toISOString();

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
      status: "active",
      value: amount,
      started_at: start.toISOString(),
      expires_at: expires.toISOString(),
    })
    .select("status,expires_at,plan_id");

  if (up.error) return res.status(400).json({ error: up.error.message });

  return res.status(200).json({
    ok: true,
    paymentId,
    status: up.data?.[0]?.status ?? "active",
    expires_at: up.data?.[0]?.expires_at ?? expires.toISOString(),
    plan_id: up.data?.[0]?.plan_id ?? planId,
  });
}
