import type { VercelRequest, VercelResponse } from "@vercel/node";

const baseUrl = (process.env.ASAAS_API_URL || "https://api.asaas.com/v3").replace(/\/+$/, "");

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
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const apiKeyRaw = process.env.ASSAS_API_KEY;
  if (!apiKeyRaw) return res.status(500).send("Missing ASSAS_API_KEY");
  const apiKey = String(apiKeyRaw).trim();

  const { method, amount, description, customerName, customerEmail, customerCpfCnpj, installments, card } = req.body as {
    method: "pix" | "card";
    amount: number;
    description: string;
    customerName: string;
    customerEmail?: string;
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
        externalReference: description || "Assinatura",
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
      externalReference: description || "Assinatura",
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
