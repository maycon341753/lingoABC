import { motion } from "framer-motion";
import { Check, Sparkles, QrCode, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const fallbackPlans = [
  {
    name: "Mensal",
    price: "74,90",
    period: "/mês",
    highlight: false,
    savings: null,
  },
  {
    name: "Trimestral",
    price: "179,00",
    period: "/3 meses",
    highlight: true,
    savings: "Economize R$ 45",
  },
  {
    name: "Semestral",
    price: "259,90",
    period: "/6 meses",
    highlight: false,
    savings: "Economize R$ 189",
  },
];

const benefits = [
  "Acesso completo a todas as matérias",
  "4 módulos por faixa etária",
  "Lições interativas gamificadas",
  "Vídeos educativos",
  "Conquistas e medalhas",
  "Missões diárias",
  "Relatório de progresso",
];

type DbPlanRow = {
  name: string;
  price: number | null;
  period_months: number | null;
  billing_cycle: string | null;
};

type UiPlan = {
  name: string;
  price: string;
  period: string;
  highlight: boolean;
  savings: string | null;
};

const formatBrl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const buildApiUrl = (path: string) => {
  const base = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  if (!base) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

const PricingSection = () => {
  const navigate = useNavigate();
  const { user, userLabel } = useAuth();
  const [plans, setPlans] = useState<UiPlan[]>(fallbackPlans);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: string } | null>(null);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [installments, setInstallments] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [pixQrImage, setPixQrImage] = useState("");
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [waitingConfirmation, setWaitingConfirmation] = useState(false);
  const autoPixRequestedRef = useRef(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const loadPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from("plans")
      .select("name,price,period_months,billing_cycle")
      .order("period_months", { ascending: true });
    if (error) {
      setPlansError(error.message);
      setPlans(fallbackPlans);
      return;
    }

    const rows = (data ?? []) as DbPlanRow[];
    if (!rows.length) {
      setPlansError("Nenhum plano encontrado.");
      setPlans(fallbackPlans);
      return;
    }

    const monthly = rows.find((p) => Number(p.period_months ?? 0) === 1);
    const monthlyPrice = Number(monthly?.price ?? 0);

    const mapped: UiPlan[] = rows.map((p) => {
      const months = Math.max(1, Number(p.period_months ?? 1));
      const priceNumber = Number(p.price ?? 0);
      const price = formatBrl(priceNumber);
      const period = months === 1 ? "/mês" : `/${months} meses`;
      const cycle = String(p.billing_cycle ?? "").toLowerCase();
      const nameNorm = String(p.name ?? "").toLowerCase();
      const highlight = months === 3 || cycle.includes("trimes") || nameNorm.includes("trimes");

      let savings: string | null = null;
      if (monthlyPrice > 0 && months > 1) {
        const s = monthlyPrice * months - priceNumber;
        if (s >= 0.01) savings = `Economize R$ ${formatBrl(s)}`;
      }

      return {
        name: p.name,
        price,
        period,
        highlight,
        savings,
      };
    });

    setPlansError(null);
    setPlans(mapped);
  }, []);

  useEffect(() => {
    loadPlans().then(() => {});
  }, [loadPlans]);

  useEffect(() => {
    const onFocus = () => {
      loadPlans().then(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [loadPlans]);

  const generatePayment = useCallback(async (targetMethod: "pix" | "card") => {
    setPaymentError(null);
    setProcessing(true);
    if (targetMethod === "pix") setPixPaymentId(null);
    const amount = Number(String(selectedPlan?.price ?? "0").replace(/[^\d,]/g, "").replace(",", "."));
    const customerEmail = user?.email ?? undefined;
    const customerName = userLabel ?? customerEmail ?? "Usuário";
    let customerCpfCnpj: string | undefined = undefined;
    if (user?.id) {
      const { data } = await supabase.from("profiles").select("cpf").eq("id", user.id).maybeSingle();
      const digits = String((data as { cpf: string | null } | null)?.cpf ?? "").replace(/\D/g, "");
      if (digits.length === 11 || digits.length === 14) customerCpfCnpj = digits;
    }

    const body =
      targetMethod === "pix"
        ? {
            method: "pix",
            amount,
            description: selectedPlan?.name ?? "Plano",
            customerName,
            customerEmail,
            customerCpfCnpj,
          }
        : {
            method: "card",
            amount,
            description: selectedPlan?.name ?? "Plano",
            customerName,
            customerEmail,
            customerCpfCnpj,
            installments,
            card: {
              holderName: cardName,
              number: cardNumber.replace(/\s/g, ""),
              expiryMonth: cardExpiry.slice(0, 2),
              expiryYear: cardExpiry.slice(-2),
              ccv: cardCvv,
            },
          };

    try {
      const r = await fetch(buildApiUrl("/api/asaas/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) throw data;
      if (targetMethod === "pix") {
        const paymentId = typeof data?.paymentId === "string" ? String(data.paymentId) : "";
        const code = String(data?.qrCode?.payload ?? "");
        const encodedImage = String(data?.qrCode?.encodedImage ?? "");
        if (paymentId) setPixPaymentId(paymentId);
        if (encodedImage) setPixQrImage(encodedImage);
        if (code) setPixCode(code);
        if (!code && !encodedImage) setPaymentError("Não foi possível gerar o PIX. Tente novamente.");
        setWaitingConfirmation(Boolean(code || encodedImage));
      } else {
        setPaymentOpen(false);
        setSuccessOpen(true);
        window.setTimeout(() => {
          navigate("/dashboard");
        }, 1200);
      }
    } catch (e: unknown) {
      const err = e as
        | { errors?: Array<{ description?: unknown }>; error?: unknown; message?: unknown; raw?: unknown }
        | null;
      const msg =
        typeof err?.errors?.[0]?.description === "string"
          ? String(err.errors[0].description)
          : typeof err?.message === "string"
          ? String(err.message)
          : typeof err?.error === "string"
          ? String(err.error)
          : typeof err?.raw === "string"
          ? String(err.raw)
          : null;
      setPaymentError(msg || "Falha ao gerar pagamento. Tente novamente.");
    } finally {
      setProcessing(false);
    }
  }, [cardCvv, cardExpiry, cardName, cardNumber, installments, navigate, selectedPlan?.name, selectedPlan?.price, user?.email, user?.id, userLabel]);

  useEffect(() => {
    if (!paymentOpen) {
      autoPixRequestedRef.current = false;
      setWaitingConfirmation(false);
      setPixPaymentId(null);
      return;
    }
    if (method !== "pix") return;
    if (!selectedPlan) return;
    if (pixCode || pixQrImage) return;
    if (processing) return;
    if (autoPixRequestedRef.current) return;
    autoPixRequestedRef.current = true;
    generatePayment("pix");
  }, [generatePayment, method, paymentOpen, pixCode, pixQrImage, processing, selectedPlan]);

  useEffect(() => {
    if (!paymentOpen) return;
    if (method !== "pix") return;
    if (!user?.id) return;
    if (!pixPaymentId) return;
    if (!pixCode && !pixQrImage) return;
    if (!waitingConfirmation) return;

    let mounted = true;
    const startedAt = Date.now();

    const check = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        const syncResp = await fetch(buildApiUrl("/api/asaas/sync"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ paymentId: pixPaymentId }),
        });
        const syncJson = await syncResp.json().catch(() => null);
        if (!mounted) return;
        const syncedStatus = String(syncJson?.status ?? "").toLowerCase();
        if (syncedStatus === "active" || syncedStatus === "ativa") {
          setWaitingConfirmation(false);
          setPaymentOpen(false);
          setSuccessOpen(true);
          window.setTimeout(() => {
            navigate("/dashboard");
          }, 1200);
          return;
        }
      }

      const { data } = await supabase
        .from("subscriptions")
        .select("status,expires_at")
        .eq("user_id", user.id)
        .order("expires_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      const row = data as { status?: string | null; expires_at?: string | null } | null;
      const status = String(row?.status ?? "").toLowerCase();
      const t = row?.expires_at ? new Date(row.expires_at).getTime() : NaN;
      const active = (status === "active" || status === "ativa") && Number.isFinite(t) && t > Date.now();
      if (active) {
        setWaitingConfirmation(false);
        setPaymentOpen(false);
        setSuccessOpen(true);
        window.setTimeout(() => {
          navigate("/dashboard");
        }, 1200);
      }
    };

    let timer: number | null = null;
    const tick = () => {
      if (!mounted) return;
      const elapsed = Date.now() - startedAt;
      const fastPhase = elapsed < 30 * 1000;
      const midPhase = elapsed >= 30 * 1000 && elapsed < 8 * 60 * 1000;
      const slowPhase = elapsed >= 8 * 60 * 1000 && elapsed < 10 * 60 * 1000;
      const finished = elapsed >= 10 * 60 * 1000;
      if (finished) {
        if (timer != null) window.clearTimeout(timer);
        setWaitingConfirmation(false);
        return;
      }
      check().then(() => {});
      const nextMs = fastPhase ? 1000 : midPhase ? 2000 : slowPhase ? 5000 : 5000;
      timer = window.setTimeout(tick, nextMs);
    };
    tick();

    return () => {
      mounted = false;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [method, navigate, paymentOpen, pixCode, pixPaymentId, pixQrImage, user?.id, waitingConfirmation]);
  return (
    <section className="py-20 px-4 bg-card">
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento confirmado 🎉</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Sua assinatura foi ativada. Vamos te levar ao painel.</p>
          <DialogFooter className="sm:justify-end">
            <Button
              className="bg-gradient-hero rounded-xl font-bold"
              type="button"
              onClick={() => {
                setSuccessOpen(false);
                navigate("/dashboard");
              }}
            >
              Ir para o painel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan ? `Assinar ${selectedPlan.name} — R$ ${selectedPlan.price}` : "Assinatura"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 font-bold ${
                  method === "pix" ? "bg-muted" : "bg-background"
                }`}
                onClick={() => {
                  setMethod("pix");
                  setPaymentError(null);
                }}
              >
                <QrCode className="w-4 h-4" /> PIX
              </button>
              <button
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 font-bold ${
                  method === "card" ? "bg-muted" : "bg-background"
                }`}
                onClick={() => {
                  setMethod("card");
                  setPaymentError(null);
                }}
              >
                <CreditCard className="w-4 h-4" /> Cartão de crédito
              </button>
            </div>

            {method === "pix" ? (
              <div className="grid gap-3">
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR Code no app do seu banco ou copie o código abaixo.
                </p>
                <div className="rounded-2xl border bg-background p-4 text-center">
                  {pixQrImage ? (
                    <img
                      className="mx-auto w-48 h-48 object-contain"
                      src={pixQrImage.startsWith("data:") ? pixQrImage : `data:image/png;base64,${pixQrImage}`}
                      alt="QR Code PIX"
                    />
                  ) : (
                    <div className="inline-block bg-muted rounded-xl px-6 py-10">
                      <QrCode className="w-16 h-16" />
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Código PIX</Label>
                  <Input
                    readOnly
                    className="rounded-xl font-mono text-sm"
                    value={pixCode || `PIX:${selectedPlan?.name ?? "Plano"}:${selectedPlan?.price ?? ""}:LINGOABC`}
                  />
                </div>
                {paymentError && <p className="text-sm font-bold text-destructive">{paymentError}</p>}
                {waitingConfirmation && !paymentError && (
                  <p className="text-sm font-bold text-muted-foreground">Aguardando confirmação do pagamento…</p>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Nome impresso no cartão</Label>
                  <Input className="rounded-xl" value={cardName} onChange={(e) => setCardName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Número do cartão</Label>
                  <Input
                    className="rounded-xl"
                    inputMode="numeric"
                    maxLength={19}
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                      const masked = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
                      setCardNumber(masked);
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Validade (MM/AA)</Label>
                    <Input
                      className="rounded-xl"
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="MM/AA"
                      value={cardExpiry}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                        const masked = digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
                        setCardExpiry(masked);
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>CVV</Label>
                    <Input
                      className="rounded-xl"
                      inputMode="numeric"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Parcelas</Label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    value={String(installments)}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                  >
                    <option value="1">1x (à vista)</option>
                    <option value="2">2x</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setPaymentOpen(false)} disabled={processing}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-hero rounded-xl font-bold"
              type="button"
              disabled={processing}
              onClick={() => {
                generatePayment(method);
              }}
            >
              {method === "pix" ? "Gerar PIX" : "Pagar agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto max-w-5xl">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-extrabold mb-4">
            Invista no futuro 💡
          </h2>
          <p className="text-muted-foreground text-lg">
            Escolha o melhor plano para seu filho
          </p>
        </motion.div>

        {plansError && <p className="text-center mb-6 text-sm font-bold text-muted-foreground">Aviso: {plansError}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`relative rounded-3xl p-8 ${
                plan.highlight
                  ? "bg-gradient-hero text-primary-foreground shadow-playful scale-105"
                  : "bg-background shadow-card"
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sun px-4 py-1 rounded-full text-xs font-bold text-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Mais popular
                </span>
              )}

              <h3 className="font-display font-bold text-xl mb-2">{plan.name}</h3>
              <div className="mb-1">
                <span className="text-4xl font-extrabold">R$ {plan.price}</span>
                <span className="text-sm opacity-80">{plan.period}</span>
              </div>
              {plan.savings && (
                <span className={`text-sm font-bold ${plan.highlight ? "text-primary-foreground/90" : "text-primary"}`}>
                  {plan.savings}
                </span>
              )}

              <ul className="mt-6 space-y-3 mb-8">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlight ? "text-primary-foreground" : "text-primary"}`} />
                    <span className={plan.highlight ? "text-primary-foreground/90" : "text-muted-foreground"}>{b}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full font-bold rounded-2xl py-5 ${
                  plan.highlight
                    ? "bg-card text-foreground hover:bg-card/90"
                    : "bg-gradient-hero text-primary-foreground"
                }`}
                onClick={() => {
                  if (!userLabel) {
                    navigate("/cadastro");
                    return;
                  }
                  setSelectedPlan({ name: plan.name, price: plan.price });
                  setMethod("pix");
                  setPixCode("");
                  setPixQrImage("");
                  setPaymentError(null);
                  setPaymentOpen(true);
                }}
              >
                Assinar agora
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
