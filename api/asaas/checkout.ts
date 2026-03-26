import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const baseUrl = (process.env.ASAAS_API_URL || "https://api.asaas.com/v3").replace(/\/+$/, "");

const pickFirstHeader = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const isAllowedOrigin = (origin: string) => {
  if (origin === "http://localhost:8080") return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
};

async function fetchAsaas(path: string, method: string, apiKey: string, body?: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "User-Agent": "lingoabc",
      access_token: apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw { status: res.status, data: json };
  }
  return json;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const originHeader = req.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
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
  const token = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
  if (!token) return res.status(401).send("Missing Authorization");

  const supabaseAdmin = createClient(supaUrl, supaServiceKey);
  const userTry = await supabaseAdmin.auth.getUser(token);
  const user = userTry.data.user;
  if (!user?.id) return res.status(401).send("Invalid user token");

  const { method, amount, description, customerName, customerCpfCnpj, installments, card } = req.body as {
    method: "pix" | "card";
    amount: number;
    description: string;
    customerName: string;
    customerCpfCnpj?: string;
    installments?: number;
    card?: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
    };
  };

  try {
    const customerEmail = typeof user.email === "string" ? user.email : undefined;
    let customerId: string | null = null;
    if (customerEmail) {
      const found = await fetchAsaas(`/customers?email=${encodeURIComponent(customerEmail)}`, "GET", apiKey);
      const list = Array.isArray(found?.data) ? found.data : Array.isArray(found) ? found : [];
      customerId = list[0]?.id ?? null;
    }
    if (!customerId) {
      const created = await fetchAsaas(`/customers`, "POST", apiKey, {
        name: customerName || "Cliente",
        email: customerEmail,
        cpfCnpj: customerCpfCnpj,
      });
      customerId = created?.id;
    }
    if (!customerId) return res.status(400).json({ error: "customer_not_created" });

    const now = new Date();
    const dueDate = now.toISOString().slice(0, 10);

    if (method === "pix") {
      const payment = (await fetchAsaas(`/payments`, "POST", apiKey, {
        customer: customerId,
        billingType: "PIX",
        value: Number(amount || 0),
        dueDate,
        description: description || "Assinatura",
        externalReference: user.id,
      })) as { id?: string } | null;
      const paymentId = payment?.id ?? null;
      const qrCode = paymentId ? await fetchAsaas(`/payments/${paymentId}/pixQrCode`, "GET", apiKey) : null;
      return res.status(200).json({ paymentId, qrCode });
    }

    const payment = await fetchAsaas(`/payments`, "POST", apiKey, {
      customer: customerId,
      billingType: "CREDIT_CARD",
      value: Number(amount || 0),
      dueDate,
      description: description || "Assinatura",
      externalReference: user.id,
      installmentCount: Number(installments || 1),
      creditCard: {
        holderName: card?.holderName,
        number: card?.number,
        expiryMonth: card?.expiryMonth,
        expiryYear: card?.expiryYear,
        ccv: card?.ccv,
      },
    });
    return res.status(200).json(payment);
  } catch (e: unknown) {
    const err = e as { status?: unknown; data?: unknown } | null;
    const status = typeof err?.status === "number" ? err.status : 400;
    const payload = err?.data ?? { error: "asaas_error" };
    return res.status(status).json(payload);
  }
}
