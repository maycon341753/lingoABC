import type { VercelRequest, VercelResponse } from "@vercel/node";

const baseUrl = "https://api.asaas.com/api/v3";

async function fetchAsaas(path: string, method: string, apiKey: string, body?: any) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
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
  const apiKey = process.env.ASSAS_API_KEY;
  if (!apiKey) return res.status(500).send("Missing ASSAS_API_KEY");

  const { method, amount, description, customerName, customerEmail, installments, card } = req.body as {
    method: "pix" | "card";
    amount: number;
    description: string;
    customerName: string;
    customerEmail?: string;
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
      });
      customerId = created?.id;
    }
    if (!customerId) return res.status(400).json({ error: "customer_not_created" });

    if (method === "pix") {
      const payment = await fetchAsaas(`/payments`, "POST", apiKey, {
        customer: customerId,
        billingType: "PIX",
        value: Number(amount || 0),
        description: description || "Assinatura",
        externalReference: description || "Assinatura",
      });
      let qrCode: any = null;
      try {
        qrCode = await fetchAsaas(`/payments/${payment?.id}/pixQrCode`, "GET", apiKey);
      } catch {}
      return res.status(200).json({ paymentId: payment?.id, qrCode });
    }

    const payment = await fetchAsaas(`/payments`, "POST", apiKey, {
      customer: customerId,
      billingType: "CREDIT_CARD",
      value: Number(amount || 0),
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
  } catch (e: any) {
    const status = e?.status ?? 400;
    return res.status(status).json(e?.data ?? { error: "asaas_error" });
  }
}
