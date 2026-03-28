import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const isAllowedOrigin = (origin: string) => {
  if (origin === "http://localhost:8080") return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
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
    if (isRecord(obj)) return obj;
    return null;
  } catch {
    return null;
  }
};

const decodeJwtRole = (token: string) => {
  const payload = decodeJwtPayload(token);
  const role = typeof payload?.role === "string" ? String(payload.role) : "";
  return role || null;
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
  if (!/^https:\/\/.+\.supabase\.co\/?$/i.test(supaUrl)) {
    return res.status(500).json({ error: "invalid_server_env", invalid: ["SUPABASE_URL"] });
  }
  const serviceRole = decodeJwtRole(supaServiceKey);
  if (serviceRole !== "service_role") {
    return res.status(500).json({ error: "invalid_server_env", invalid: ["SUPABASE_SERVICE_ROLE"] });
  }
  const supabase = createClient(supaUrl, supaServiceKey);

  const authHeader = pickFirstHeader(req.headers.authorization);
  const token = isString(authHeader) ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
  if (!token) return res.status(401).json({ error: "missing_authorization" });

  const payload = decodeJwtPayload(token);
  const userIdRaw = isString(payload?.sub) ? String(payload?.sub) : "";
  const userId = userIdRaw && isUuid(userIdRaw) ? userIdRaw : "";
  if (!userId) return res.status(401).json({ error: "invalid_user_token" });

  const body = isRecord(req.body) ? (req.body as Record<string, unknown>) : {};
  const paymentId = isString(body.paymentId) ? body.paymentId : "";
  const description = isString(body.description) ? body.description : "Assinatura";
  const value = Number(body.value ?? 0);
  const cpfCnpjRaw = isString(body.cpfCnpj) ? body.cpfCnpj : "";
  const cpfCnpj = cpfCnpjRaw.replace(/\D/g, "");
  const dueDate = isString(body.dueDate) ? body.dueDate : null;
  const invoiceUrl = isString(body.invoiceUrl) ? body.invoiceUrl : null;
  const billingType = isString(body.billingType) ? body.billingType : "PIX";
  if (!paymentId) return res.status(400).json({ error: "missing_paymentId" });

  const nowIso = new Date().toISOString();

  await supabase
    .from("asaas_payments")
    .upsert(
      {
        user_id: userId,
        payment_id: paymentId,
        cpf_cnpj: cpfCnpj.length === 11 || cpfCnpj.length === 14 ? cpfCnpj : null,
        invoice_url: invoiceUrl,
        description,
        billing_type: billingType,
        status: "PENDING",
        value,
        date_created: nowIso,
        due_date: dueDate,
      },
      { onConflict: "payment_id" },
    )
    .select("payment_id");

  return res.status(200).json({ ok: true, linked: true, paymentId, userId });
}
