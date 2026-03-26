import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const secret = process.env.ASSAS_WEBHOOK_SECRET;
  if (!secret) return res.status(500).send("Missing ASSAS_WEBHOOK_SECRET");

  const tokenHeader =
    (req.headers["x-webhook-token"] as string) ||
    (req.headers["x-asaas-token"] as string) ||
    (req.headers["authorization"] as string)?.replace(/^Bearer\s+/i, "");
  const tokenQuery = (req.query.token as string) || (req.query.auth as string);
  const token = tokenHeader || tokenQuery;

  if (!token || token !== secret) return res.status(401).send("Invalid token");

  const apiKey = process.env.ASSAS_API_KEY;
  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE;
  if (!apiKey || !supaUrl || !supaKey) return res.status(500).send("Missing server environment variables");

  const supabase = createClient(supaUrl, supaKey);

  const payload: any = req.body;
  const payment = payload?.payment ?? payload;
  const paymentId = payment?.id ?? null;
  const customerId = payment?.customer ?? null;
  const statusRaw = String(payment?.status ?? payload?.event ?? "").toLowerCase();
  const value = Number(payment?.value ?? payment?.amount ?? 0);
  const description = String(payment?.description ?? payment?.externalReference ?? "Assinatura");
  const receivedDate = payment?.confirmedDate ?? payment?.paymentDate ?? payment?.effectiveDate ?? new Date().toISOString();

  let confirmed = false;
  if (["confirmed", "received", "received_in_cash"].includes(statusRaw)) confirmed = true;

  let customerEmail: string | null = null;
  try {
    if (customerId) {
      const resp = await fetch(`https://api.asaas.com/api/v3/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const j = await resp.json();
      customerEmail = j?.email ?? null;
    }
  } catch {}

  if (!customerEmail) {
    return res.status(200).json({ ok: true, info: "no_email", paymentId });
  }

  const { data: userRow } = await supabase.from("auth.users").select("id").eq("email", customerEmail).maybeSingle();
  const userId = userRow?.id ?? null;
  if (!userId) return res.status(200).json({ ok: true, info: "no_user", email: customerEmail });

  const planName = description;
  const { data: plan } = await supabase.from("plans").select("id,period_months,price").eq("name", planName).maybeSingle();
  const periodMonths = Number(plan?.period_months ?? 1);
  const planId = plan?.id ?? null;

  const start = new Date(receivedDate);
  const expires = new Date(start);
  expires.setMonth(expires.getMonth() + (periodMonths > 0 ? periodMonths : 1));

  const status = confirmed ? "active" : "pending";
  const amount = value || Number(plan?.price ?? 0);

  await supabase
    .from("subscriptions")
    .upsert({
      user_id: userId,
      plan_id: planId,
      status,
      value: amount,
      started_at: start.toISOString(),
      expires_at: expires.toISOString(),
    })
    .select();

  return res.status(200).json({ ok: true, userId, planId, status });
}
