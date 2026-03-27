import type { VercelRequest, VercelResponse } from "@vercel/node";

const baseUrl = (process.env.ASAAS_API_URL || "https://api.asaas.com/v3").replace(/\/+$/, "");

const pickFirstHeader = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const isAllowedOrigin = (origin: string) => {
  if (origin === "http://localhost:8080") return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
};

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
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const readString = (v: unknown) => (typeof v === "string" ? v : null);
const onlyDigits = (v: string) => v.replace(/\D/g, "");
const normalizeExpiryMonth = (m: string) => {
  const mm = onlyDigits(m).slice(0, 2);
  const n = Number(mm || "0");
  if (!Number.isFinite(n) || n < 1 || n > 12) return null;
  return String(n).padStart(2, "0");
};
const normalizeExpiryYear = (y: string) => {
  const yy = onlyDigits(y);
  if (yy.length === 2) return `20${yy}`;
  if (yy.length === 4) return yy;
  return null;
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
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const apiKeyRaw = process.env.ASSAS_API_KEY;
  if (!apiKeyRaw) return res.status(500).json({ error: "missing_server_env", required: ["ASSAS_API_KEY"] });
  const apiKey = String(apiKeyRaw).trim();

  const authHeader = pickFirstHeader(req.headers.authorization);
  const token = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
  if (!token) return res.status(401).json({ error: "missing_authorization" });

  const payload = decodeJwtPayload(token);
  const userIdRaw = typeof payload?.sub === "string" ? String(payload.sub) : "";
  const userId = userIdRaw && isUuid(userIdRaw) ? userIdRaw : "";
  const tokenEmail = typeof payload?.email === "string" ? String(payload.email) : undefined;
  if (!userId) return res.status(401).json({ error: "invalid_user_token" });

  const { method, amount, description, customerName, customerEmail, customerCpfCnpj, installments, card, holderInfo } = req.body as {
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
    holderInfo?: {
      name?: string;
      email?: string;
      cpfCnpj?: string;
      postalCode?: string;
      address?: string;
      addressNumber?: string;
      province?: string;
      phone?: string;
    };
  };

  try {
    const customerEmailFinal = tokenEmail || (typeof customerEmail === "string" ? customerEmail : undefined);
    let customerId: string | null = null;
    if (customerEmailFinal) {
      const found = await fetchAsaas(`/customers?email=${encodeURIComponent(customerEmailFinal)}`, "GET", apiKey);
      const list =
        isRecord(found) && Array.isArray(found.data)
          ? (found.data as unknown[])
          : Array.isArray(found)
          ? (found as unknown[])
          : [];
      const first = list[0];
      customerId = isRecord(first) ? readString(first.id) : null;
    }
    if (!customerId) {
      const created = await fetchAsaas(`/customers`, "POST", apiKey, {
        name: customerName || "Cliente",
        email: customerEmailFinal,
        cpfCnpj: customerCpfCnpj,
      });
      customerId = isRecord(created) ? readString(created.id) : null;
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
        externalReference: userId,
      })) as { id?: string } | null;
      const paymentId = payment?.id ?? null;
      const qrCode = paymentId ? await fetchAsaas(`/payments/${paymentId}/pixQrCode`, "GET", apiKey) : null;
      return res.status(200).json({ paymentId, qrCode });
    }

    const holder = isRecord(holderInfo) ? holderInfo : null;
    const holderName = typeof holder?.name === "string" ? holder.name : customerName;
    const holderEmail = typeof holder?.email === "string" ? holder.email : customerEmailFinal;
    const holderCpf = typeof holder?.cpfCnpj === "string" ? holder.cpfCnpj : customerCpfCnpj;
    const holderPostal = typeof holder?.postalCode === "string" ? onlyDigits(holder.postalCode).slice(0, 8) : "";
    const holderAddress = typeof holder?.address === "string" ? holder.address : "";
    const holderAddrNo = typeof holder?.addressNumber === "string" ? onlyDigits(holder.addressNumber).slice(0, 10) : "";
    const holderProvince = typeof holder?.province === "string" ? holder.province : "";
    const holderPhone = typeof holder?.phone === "string" ? onlyDigits(holder.phone).slice(0, 11) : "";

    const month = normalizeExpiryMonth(String(card?.expiryMonth ?? ""));
    const year = normalizeExpiryYear(String(card?.expiryYear ?? ""));
    const cardNumber = onlyDigits(String(card?.number ?? ""));
    const ccv = onlyDigits(String(card?.ccv ?? "")).slice(0, 4);

    if (!month || !year) return res.status(400).json({ error: "invalid_card_expiry" });
    if (cardNumber.length < 13) return res.status(400).json({ error: "invalid_card_number" });
    if (ccv.length < 3) return res.status(400).json({ error: "invalid_card_ccv" });
    if (!holderName || !holderEmail || !holderCpf) return res.status(400).json({ error: "missing_card_holder_identity" });
    if (holderPostal.length !== 8) return res.status(400).json({ error: "missing_card_holder_postal_code" });
    if (!holderAddress || !holderAddrNo || !holderProvince) return res.status(400).json({ error: "missing_card_holder_address" });
    if (holderPhone.length < 10) return res.status(400).json({ error: "missing_card_holder_phone" });

    const payment = await fetchAsaas(`/payments`, "POST", apiKey, {
      customer: customerId,
      billingType: "CREDIT_CARD",
      value: Number(amount || 0),
      dueDate,
      description: description || "Assinatura",
      externalReference: userId,
      installmentCount: Number(installments || 1),
      creditCard: {
        holderName: String(card?.holderName ?? holderName),
        number: cardNumber,
        expiryMonth: month,
        expiryYear: year,
        ccv,
      },
      creditCardHolderInfo: {
        name: holderName,
        email: holderEmail,
        cpfCnpj: holderCpf,
        postalCode: holderPostal,
        address: holderAddress,
        addressNumber: holderAddrNo,
        province: holderProvince,
        phone: holderPhone,
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
