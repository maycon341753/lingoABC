import type { VercelRequest, VercelResponse } from "@vercel/node";

const asaasBaseUrl = (process.env.ASAAS_API_URL || "https://api.asaas.com/v3").replace(/\/+$/, "");

const isAllowedOrigin = (origin: string) => {
  if (origin === "http://localhost:8080") return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
};

const pickFirstHeader = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const isString = (v: unknown): v is string => typeof v === "string";
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const normalizeStatus = (v: unknown) => String(v ?? "").toLowerCase();
const isPaidStatus = (s: string) => ["confirmed", "received", "received_in_cash"].includes(s);
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
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const apiKeyRaw = process.env.ASSAS_API_KEY;
  if (!apiKeyRaw) return res.status(500).json({ error: "missing_server_env", required: ["ASSAS_API_KEY"] });
  const apiKey = String(apiKeyRaw).trim();

  const authHeader = pickFirstHeader(req.headers.authorization);
  const token = isString(authHeader) ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
  if (!token) return res.status(401).json({ error: "missing_authorization" });

  const payload = decodeJwtPayload(token);
  const userIdRaw = typeof payload?.sub === "string" ? String(payload.sub) : "";
  const userId = userIdRaw && isUuid(userIdRaw) ? userIdRaw : "";
  const email = typeof payload?.email === "string" ? String(payload.email).trim().toLowerCase() : "";
  if (!userId) return res.status(401).json({ error: "invalid_user_token" });
  if (!email) return res.status(400).json({ error: "missing_user_email" });

  const customers = await fetchJson(`${asaasBaseUrl}/customers?email=${encodeURIComponent(email)}&limit=1`, apiKey);
  if (!customers.ok) return res.status(customers.status).json(customers.json);
  const customersData = isRecord(customers.json) && Array.isArray(customers.json.data) ? (customers.json.data as unknown[]) : [];
  const customer = customersData[0];
  const customerId = isRecord(customer) && isString(customer.id) ? (customer.id as string) : null;
  if (!customerId) return res.status(200).json({ ok: true, items: [] });

  const payments = await fetchJson(`${asaasBaseUrl}/payments?customer=${encodeURIComponent(customerId)}&limit=50`, apiKey);
  if (!payments.ok) return res.status(payments.status).json(payments.json);

  const paymentsData = isRecord(payments.json) && Array.isArray(payments.json.data) ? (payments.json.data as unknown[]) : [];
  const items = paymentsData
    .filter(isRecord)
    .map((p) => {
      const externalReference = isString(p.externalReference) ? String(p.externalReference) : "";
      const ext = externalReference.trim();
      const extLooksLikeUuid = ext && isUuid(ext);
      if (extLooksLikeUuid && ext !== userId) return null;
      const status = normalizeStatus(p.status);
      if (!isPaidStatus(status)) return null;
      return {
        id: isString(p.id) ? String(p.id) : null,
        invoiceUrl: isString(p.invoiceUrl) ? String(p.invoiceUrl) : null,
        description: isString(p.description) ? String(p.description) : "Assinatura",
        billingType: isString(p.billingType) ? String(p.billingType) : null,
        value: Number(p.value ?? 0),
        status: isString(p.status) ? String(p.status) : null,
        dateCreated: isString(p.dateCreated) ? String(p.dateCreated) : null,
        paymentDate: isString(p.paymentDate) ? String(p.paymentDate) : null,
        confirmedDate: isString(p.confirmedDate) ? String(p.confirmedDate) : null,
        dueDate: isString(p.dueDate) ? String(p.dueDate) : null,
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  const sortTime = (x: Record<string, unknown>) => {
    const iso =
      (isString(x.confirmedDate) && x.confirmedDate) ||
      (isString(x.paymentDate) && x.paymentDate) ||
      (isString(x.dateCreated) && x.dateCreated) ||
      "";
    const t = iso ? new Date(iso).getTime() : NaN;
    return Number.isFinite(t) ? t : 0;
  };
  items.sort((a, b) => sortTime(b) - sortTime(a));

  return res.status(200).json({ ok: true, items });
}

