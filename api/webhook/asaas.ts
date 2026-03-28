import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const asaasBaseUrl = (process.env.ASAAS_API_URL || "https://api.asaas.com/v3").replace(/\/+$/, "");

const formatCpf = (digits: string) => {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length !== 11) return null;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
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

const decodeJwtRole = (token: string) => {
  const payload = decodeJwtPayload(token);
  const role = typeof payload?.role === "string" ? String(payload.role) : "";
  return role || null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const secret = process.env.ASSAS_WEBHOOK_SECRET;
  if (!secret) return res.status(500).send("Missing ASSAS_WEBHOOK_SECRET");

  const headerToken =
    req.headers["asaas-access-token"] ||
    req.headers["x-webhook-token"] ||
    req.headers["x-asaas-token"] ||
    req.headers["authorization"];
  const tokenHeader = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  const tokenFromHeader =
    typeof tokenHeader === "string" ? tokenHeader.replace(/^Bearer\s+/i, "").trim() : "";
  const tokenQuery = (req.query.token as string) || (req.query.auth as string);
  const token = tokenFromHeader || String(tokenQuery || "").trim();
  const expected = String(secret).trim();

  if (!token || token !== expected) return res.status(401).send("Invalid token");

  const apiKeyRaw = process.env.ASSAS_API_KEY;
  const supaUrlRaw = process.env.SUPABASE_URL;
  const supaKeyRaw = process.env.SUPABASE_SERVICE_ROLE;
  if (!apiKeyRaw || !supaUrlRaw || !supaKeyRaw) return res.status(500).send("Missing server environment variables");
  const apiKey = String(apiKeyRaw).trim();
  const supaUrl = String(supaUrlRaw).trim();
  const supaKey = String(supaKeyRaw).trim();
  if (!/^https:\/\/.+\.supabase\.co\/?$/i.test(supaUrl)) return res.status(500).send("Invalid SUPABASE_URL");
  if (decodeJwtRole(supaKey) !== "service_role") return res.status(500).send("Invalid SUPABASE_SERVICE_ROLE");

  const supabase = createClient(supaUrl, supaKey);

  const payloadObj =
    typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
  const embeddedPayment = payloadObj["payment"];
  const paymentObj =
    typeof embeddedPayment === "object" && embeddedPayment !== null
      ? (embeddedPayment as Record<string, unknown>)
      : payloadObj;

  const paymentId = typeof paymentObj["id"] === "string" ? (paymentObj["id"] as string) : null;
  const customerId = typeof paymentObj["customer"] === "string" ? (paymentObj["customer"] as string) : null;
  const eventRaw = String(payloadObj["event"] ?? "").toLowerCase();
  const paymentStatusRaw = String(paymentObj["status"] ?? "").toLowerCase();
  const value = Number(paymentObj["value"] ?? paymentObj["amount"] ?? 0);
  const description = String(paymentObj["description"] ?? "Assinatura");
  const externalReference = typeof paymentObj["externalReference"] === "string" ? String(paymentObj["externalReference"]) : "";
  const dueDate = typeof paymentObj["dueDate"] === "string" ? String(paymentObj["dueDate"]) : null;
  const invoiceUrl = typeof paymentObj["invoiceUrl"] === "string" ? String(paymentObj["invoiceUrl"]) : null;
  const billingType = typeof paymentObj["billingType"] === "string" ? String(paymentObj["billingType"]) : null;
  const webhookDateCreated = typeof payloadObj["dateCreated"] === "string" ? String(payloadObj["dateCreated"]) : null;
  const eventAt = webhookDateCreated ? new Date(webhookDateCreated).toISOString() : new Date().toISOString();
  const receivedDate = String(
    paymentObj["confirmedDate"] ?? paymentObj["paymentDate"] ?? paymentObj["effectiveDate"] ?? new Date().toISOString(),
  );

  const confirmed =
    ["payment_confirmed", "payment_received", "payment_received_in_cash"].includes(eventRaw) ||
    ["confirmed", "received", "received_in_cash"].includes(paymentStatusRaw);

  const canceled =
    ["payment_canceled", "payment_refunded", "payment_deleted"].includes(eventRaw) ||
    ["canceled", "refunded", "deleted"].includes(paymentStatusRaw);

  const ext = externalReference.trim();
  const extLooksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ext);
  if (extLooksLikeUuid) {
    const userId = ext;
    let cpfCnpj: string | null = null;
    try {
      const { data: cpfRow } = await supabase.from("profiles").select("cpf").eq("id", userId).maybeSingle();
      const digits = String((cpfRow as { cpf?: string | null } | null)?.cpf ?? "").replace(/\D/g, "");
      cpfCnpj = digits.length === 11 || digits.length === 14 ? digits : null;
    } catch {
      cpfCnpj = null;
    }
    const planName = description;
    const { data: planExact } = await supabase.from("plans").select("id,period_months,price").eq("name", planName).maybeSingle();
    let plan = planExact;
    if (!plan) {
      const { data: planFallback } = await supabase
        .from("plans")
        .select("id,period_months,price")
        .ilike("name", `%${planName}%`)
        .order("period_months", { ascending: true })
        .limit(1)
        .maybeSingle();
      plan = planFallback;
    }
    const periodMonths = Number(plan?.period_months ?? 1);
    const planId = plan?.id ?? null;

    const start = new Date(receivedDate);
    const expires = new Date(start);
    expires.setMonth(expires.getMonth() + (periodMonths > 0 ? periodMonths : 1));

    const status = confirmed ? "ativa" : canceled ? "cancelada" : "pendente";
    const amount = value || Number(plan?.price ?? 0);
    if (confirmed) {
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id,expires_at")
        .eq("user_id", userId)
        .order("expires_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      const existingExpiresIso = typeof (existingSub as { expires_at?: string | null } | null)?.expires_at === "string" ? (existingSub as { expires_at?: string | null }).expires_at : "";
      const existingExpiresMs = existingExpiresIso ? new Date(existingExpiresIso).getTime() : NaN;
      const base = Number.isFinite(existingExpiresMs) && existingExpiresMs > start.getTime() ? new Date(existingExpiresIso) : start;
      const nextExpires = new Date(base);
      nextExpires.setMonth(nextExpires.getMonth() + (periodMonths > 0 ? periodMonths : 1));

      const subPayload = {
        user_id: userId,
        plan_id: planId,
        status: "ativa",
        value: amount,
        started_at: start.toISOString(),
        expires_at: nextExpires.toISOString(),
      };

      if ((existingSub as { id?: string | null } | null)?.id) {
        await supabase.from("subscriptions").update(subPayload).eq("id", (existingSub as { id: string }).id);
      } else {
        await supabase.from("subscriptions").insert(subPayload);
      }
    }

    try {
      if (paymentId) {
        await supabase
          .from("asaas_payments")
          .upsert(
            {
              user_id: userId,
              payment_id: paymentId,
              cpf_cnpj: cpfCnpj,
              customer_id: customerId,
              invoice_url: invoiceUrl,
              description,
              billing_type: billingType,
              status: paymentStatusRaw,
              value: amount,
              date_created: eventAt,
              confirmed_date: confirmed ? eventAt : null,
              due_date: dueDate,
            },
            { onConflict: "payment_id" },
          )
          .select("payment_id");
      }
    } catch {
      void 0;
    }

    return res.status(200).json({ ok: true, userId, planId, status });
  }

  let customerEmail: string | null = null;
  let customerCpfCnpj: string | null = null;
  try {
    if (customerId) {
      const resp = await fetch(`${asaasBaseUrl}/customers/${customerId}`, {
        headers: { "User-Agent": "lingoabc", access_token: apiKey },
      });
      const j = await resp.json();
      customerEmail = typeof j?.email === "string" ? j.email : null;
      const rawCpf = typeof j?.cpfCnpj === "string" ? String(j.cpfCnpj) : "";
      const digits = rawCpf.replace(/\D/g, "");
      customerCpfCnpj = digits.length === 11 || digits.length === 14 ? digits : null;
    }
  } catch {
    customerEmail = null;
    customerCpfCnpj = null;
  }

  let userId: string | null = null;
  if (customerEmail) {
    const { data: userRow } = await supabase.from("v_admin_users").select("user_id").eq("email", customerEmail).maybeSingle();
    userId = userRow?.user_id ?? null;
  }

  if (!userId && customerCpfCnpj) {
    const cpfFormatted = customerCpfCnpj.length === 11 ? formatCpf(customerCpfCnpj) : null;
    const { data: profRow } = await supabase
      .from("profiles")
      .select("id,cpf")
      .or(cpfFormatted ? `cpf.eq.${customerCpfCnpj},cpf.eq.${cpfFormatted}` : `cpf.eq.${customerCpfCnpj}`)
      .limit(1)
      .maybeSingle();
    userId = (profRow as { id?: string } | null)?.id ?? null;
  }

  if (!userId) {
    return res.status(200).json({ ok: true, info: "no_user_match", email: customerEmail, cpfCnpj: customerCpfCnpj });
  }

  let cpfCnpj: string | null = null;
  try {
    const { data: cpfRow } = await supabase.from("profiles").select("cpf").eq("id", userId).maybeSingle();
    const digits = String((cpfRow as { cpf?: string | null } | null)?.cpf ?? "").replace(/\D/g, "");
    cpfCnpj = digits.length === 11 || digits.length === 14 ? digits : customerCpfCnpj;
  } catch {
    cpfCnpj = customerCpfCnpj;
  }

  const planName = description;
  const { data: planExact } = await supabase.from("plans").select("id,period_months,price").eq("name", planName).maybeSingle();
  let plan = planExact;
  if (!plan) {
    const { data: planFallback } = await supabase
      .from("plans")
      .select("id,period_months,price")
      .ilike("name", `%${planName}%`)
      .order("period_months", { ascending: true })
      .limit(1)
      .maybeSingle();
    plan = planFallback;
  }
  const periodMonths = Number(plan?.period_months ?? 1);
  const planId = plan?.id ?? null;

  const start = new Date(receivedDate);
  const expires = new Date(start);
  expires.setMonth(expires.getMonth() + (periodMonths > 0 ? periodMonths : 1));

  const status = confirmed ? "ativa" : canceled ? "cancelada" : "pendente";
  const amount = value || Number(plan?.price ?? 0);
  if (confirmed) {
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id,expires_at")
      .eq("user_id", userId)
      .order("expires_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const existingExpiresIso = typeof (existingSub as { expires_at?: string | null } | null)?.expires_at === "string" ? (existingSub as { expires_at?: string | null }).expires_at : "";
    const existingExpiresMs = existingExpiresIso ? new Date(existingExpiresIso).getTime() : NaN;
    const base = Number.isFinite(existingExpiresMs) && existingExpiresMs > start.getTime() ? new Date(existingExpiresIso) : start;
    const nextExpires = new Date(base);
    nextExpires.setMonth(nextExpires.getMonth() + (periodMonths > 0 ? periodMonths : 1));

    const subPayload = {
      user_id: userId,
      plan_id: planId,
      status: "ativa",
      value: amount,
      started_at: start.toISOString(),
      expires_at: nextExpires.toISOString(),
    };

    if ((existingSub as { id?: string | null } | null)?.id) {
      await supabase.from("subscriptions").update(subPayload).eq("id", (existingSub as { id: string }).id);
    } else {
      await supabase.from("subscriptions").insert(subPayload);
    }
  }

  try {
    if (paymentId) {
      await supabase
        .from("asaas_payments")
        .upsert(
          {
            user_id: userId,
            payment_id: paymentId,
            cpf_cnpj: cpfCnpj,
            customer_id: customerId,
            invoice_url: invoiceUrl,
            description,
            billing_type: billingType,
            status: paymentStatusRaw,
            value: amount,
            date_created: eventAt,
            confirmed_date: confirmed ? eventAt : null,
            due_date: dueDate,
          },
          { onConflict: "payment_id" },
        )
        .select("payment_id");
    }
  } catch {
    void 0;
  }

  return res.status(200).json({ ok: true, userId, planId, status });
}
