import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { QrCode } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type DbPlanRow = {
  id: string;
  name: string;
  price: number | null;
  period_months: number | null;
  billing_cycle: string | null;
};

type SubscriptionRow = {
  status: string | null;
  started_at: string | null;
  expires_at: string | null;
  value: number | null;
  plans: { name: string | null; billing_cycle: string | null; period_months: number | null } | null;
};

const formatCpf = (digits: string) => {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length !== 11) return null;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
};

const buildApiUrl = (path: string) => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return path;
  }
  const base = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  if (!base) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

const formatBrl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
};

const getToken = async () => {
  let token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) token = (await supabase.auth.refreshSession()).data.session?.access_token;
  return token ?? "";
};

const UserPlansPage = () => {
  const { loading: authLoading, user, userLabel } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<DbPlanRow[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [cpfDigits, setCpfDigits] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DbPlanRow | null>(null);

  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [linkWarning, setLinkWarning] = useState<string | null>(null);
  const [waitingConfirmation, setWaitingConfirmation] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState("");
  const [pixQrImage, setPixQrImage] = useState("");
  const [payMethod, setPayMethod] = useState<"pix" | "card">("pix");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardMonth, setCardMonth] = useState("");
  const [cardYear, setCardYear] = useState("");
  const [cardCcv, setCardCcv] = useState("");
  const [installments, setInstallments] = useState<number>(1);

  const autoRequestedRef = useRef(false);

  const activeInfo = useMemo(() => {
    const status = String(subscription?.status ?? "").toLowerCase();
    const t = subscription?.expires_at ? new Date(subscription.expires_at).getTime() : NaN;
    const active = (status === "active" || status === "ativa") && Number.isFinite(t) && t > Date.now();
    return { active, status, expiresAt: subscription?.expires_at ?? null };
  }, [subscription?.expires_at, subscription?.status]);

  const loadPage = useCallback(async () => {
    if (!user?.id) return;
    setPageLoading(true);
    setPlansError(null);
    try {
      const [{ data: plansData, error: plansErr }, { data: subData }, { data: cpfData }] = await Promise.all([
        supabase.from("plans").select("id,name,price,period_months,billing_cycle").order("period_months", { ascending: true }),
        supabase
          .from("subscriptions")
          .select("status,started_at,expires_at,value,plans(name,billing_cycle,period_months)")
          .eq("user_id", user.id)
          .order("expires_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("profiles").select("cpf").eq("id", user.id).maybeSingle(),
      ]);
      if (plansErr) {
        setPlansError(plansErr.message);
        setPlans([]);
      } else {
        setPlans((plansData ?? []) as DbPlanRow[]);
      }
      setSubscription((subData as SubscriptionRow | null) ?? null);
      const cpfRaw = String((cpfData as { cpf?: string | null } | null)?.cpf ?? "");
      setCpfDigits(cpfRaw.replace(/\D/g, "").slice(0, 11));
    } catch (e: unknown) {
      setPlansError(e instanceof Error ? e.message : "Falha ao carregar");
    } finally {
      setPageLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!user?.id) return;
    loadPage().then(() => {});
  }, [loadPage, user?.id]);

  const resetModal = () => {
    autoRequestedRef.current = false;
    setProcessing(false);
    setPaymentError(null);
    setLinkWarning(null);
    setWaitingConfirmation(false);
    setPixPaymentId(null);
    setPixCode("");
    setPixQrImage("");
    setPayMethod("pix");
    setCardHolder("");
    setCardNumber("");
    setCardMonth("");
    setCardYear("");
    setCardCcv("");
    setInstallments(1);
  };

  const createPix = useCallback(async () => {
    if (!user?.id || !selectedPlan) return;
    if (processing) return;

    setProcessing(true);
    setPaymentError(null);
    setLinkWarning(null);
    setPixPaymentId(null);
    setPixCode("");
    setPixQrImage("");

    const token = await getToken();
    if (!token) {
      setProcessing(false);
      setPaymentError("Faça login novamente para continuar.");
      return;
    }

    const value = Number(selectedPlan.price ?? 0);
    const customerEmail = user.email ?? undefined;
    const customerName = userLabel ?? customerEmail ?? "Usuário";
    let customerCpfCnpj: string | undefined = undefined;
    if (cpfDigits.length === 11) customerCpfCnpj = cpfDigits;

    try {
      const r = await fetch(buildApiUrl("/api/asaas/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          method: "pix",
          amount: value,
          description: selectedPlan.name,
          customerName,
          customerEmail,
          customerCpfCnpj,
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) {
        const msg = typeof j?.error === "string" ? String(j.error) : `http_${r.status}`;
        setPaymentError(msg);
        return;
      }

      const paymentId = typeof j?.paymentId === "string" ? String(j.paymentId) : "";
      const code = String(j?.qrCode?.payload ?? "");
      const encodedImage = String(j?.qrCode?.encodedImage ?? "");
      if (!paymentId) {
        setPaymentError("Falha ao gerar pagamento. Tente novamente.");
        return;
      }
      setPixPaymentId(paymentId);
      setPixCode(code);
      setPixQrImage(encodedImage);
      setWaitingConfirmation(true);

      try {
        const lr = await fetch(buildApiUrl("/api/asaas/link"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ paymentId, description: selectedPlan.name, value, billingType: "PIX", cpfCnpj: customerCpfCnpj }),
        });
        if (!lr.ok) {
          const lj = await lr.json().catch(() => null);
          const msg = typeof lj?.error === "string" ? String(lj.error) : `http_${lr.status}`;
          setPaymentError(msg);
          return;
        }
      } catch {
        setPaymentError("Falha de conexão ao vincular o pagamento. Tente novamente.");
        return;
      }

      loadPage().then(() => {});
    } catch (e: unknown) {
      setPaymentError(e instanceof TypeError ? "Falha de conexão com o servidor." : "Falha ao gerar pagamento.");
    } finally {
      setProcessing(false);
    }
  }, [cpfDigits, loadPage, processing, selectedPlan, user?.email, user?.id, userLabel]);

  const payCard = useCallback(async () => {
    if (!user?.id || !selectedPlan) return;
    if (processing) return;
    setProcessing(true);
    setPaymentError(null);
    setLinkWarning(null);
    setPixPaymentId(null);
    setPixCode("");
    setPixQrImage("");

    const token = await getToken();
    if (!token) {
      setProcessing(false);
      setPaymentError("Faça login novamente para continuar.");
      return;
    }

    const value = Number(selectedPlan.price ?? 0);
    const customerEmail = user.email ?? undefined;
    const customerName = userLabel ?? customerEmail ?? "Usuário";
    let customerCpfCnpj: string | undefined = undefined;
    if (cpfDigits.length === 11) customerCpfCnpj = cpfDigits;

    try {
      const r = await fetch(buildApiUrl("/api/asaas/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          method: "card",
          amount: value,
          description: selectedPlan.name,
          customerName,
          customerEmail,
          customerCpfCnpj,
          installments: Math.max(1, Math.min(2, installments)),
          card: {
            holderName: cardHolder,
            number: cardNumber.replace(/\s+/g, ""),
            expiryMonth: cardMonth,
            expiryYear: cardYear,
            ccv: cardCcv,
          },
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) {
        const msg = typeof j?.error === "string" ? String(j.error) : `http_${r.status}`;
        setPaymentError(msg);
        return;
      }
      const paymentId = typeof j?.id === "string" ? String(j.id) : typeof j?.paymentId === "string" ? String(j.paymentId) : "";
      const invoiceUrl = typeof j?.invoiceUrl === "string" ? String(j.invoiceUrl) : null;
      if (!paymentId) {
        setPaymentError("Falha ao processar cartão. Tente novamente.");
        return;
      }
      setPixPaymentId(paymentId);
      setWaitingConfirmation(true);

      try {
        const lr = await fetch(buildApiUrl("/api/asaas/link"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            paymentId,
            description: selectedPlan.name,
            value,
            billingType: "CREDIT_CARD",
            cpfCnpj: customerCpfCnpj,
            invoiceUrl,
          }),
        });
        if (!lr.ok) {
          const lj = await lr.json().catch(() => null);
          const msg = typeof lj?.error === "string" ? String(lj.error) : `http_${lr.status}`;
          setPaymentError(msg);
          return;
        }
      } catch {
        setPaymentError("Falha de conexão ao vincular o pagamento. Tente novamente.");
        return;
      }
      loadPage().then(() => {});
    } catch (e: unknown) {
      setPaymentError(e instanceof TypeError ? "Falha de conexão com o servidor." : "Falha ao processar cartão.");
    } finally {
      setProcessing(false);
    }
  }, [cardHolder, cardNumber, cardMonth, cardYear, cardCcv, cpfDigits, installments, loadPage, processing, selectedPlan, user?.email, user?.id, userLabel]);

  const syncNow = useCallback(async () => {
    if (!user?.id || !pixPaymentId) return;
    setProcessing(true);
    try {
      const token = await getToken();
      if (!token) {
        setPaymentError("Faça login novamente para continuar.");
        return;
      }
      const r = await fetch(buildApiUrl("/api/asaas/sync"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentId: pixPaymentId }),
      });
      const j = await r.json().catch(() => null);
      const st = String(j?.status ?? "").toLowerCase();
      if (r.ok && (st === "active" || st === "ativa")) {
        setWaitingConfirmation(false);
        setModalOpen(false);
        setSuccessOpen(true);
        loadPage().then(() => {});
        window.setTimeout(() => {
          navigate("/usuario/dashboard");
        }, 1200);
        return;
      }
      const msg = typeof j?.error === "string" ? String(j.error) : `http_${r.status}`;
      if (msg === "forbidden_payment_owner") {
        setPaymentError("Este pagamento não pertence a este usuário.");
        return;
      }
      if (msg === "invalid_server_env" || msg === "missing_server_env") setPaymentError(msg);
    } catch {
      void 0;
    } finally {
      setProcessing(false);
    }
  }, [loadPage, navigate, pixPaymentId, user?.id]);

  useEffect(() => {
    if (!modalOpen) return;
    if (!selectedPlan) return;
    if (processing) return;
    if (pixPaymentId) return;
    if (payMethod !== "pix") return;
    if (autoRequestedRef.current) return;
    autoRequestedRef.current = true;
    createPix();
  }, [createPix, modalOpen, payMethod, pixPaymentId, processing, selectedPlan]);

  useEffect(() => {
    if (!modalOpen) return;
    if (!waitingConfirmation) return;
    if (!user?.id || !pixPaymentId) return;

    let mounted = true;
    const startedAt = Date.now();

    const tick = async () => {
      if (!mounted) return;
      const elapsed = Date.now() - startedAt;
      const finished = elapsed >= 10 * 60 * 1000;
      if (finished) {
        setWaitingConfirmation(false);
        return;
      }
      await syncNow();
      if (!mounted) return;
      window.setTimeout(tick, elapsed < 30 * 1000 ? 1500 : 3500);
    };

    const timer = window.setTimeout(tick, 1500);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [modalOpen, pixPaymentId, syncNow, user?.id, waitingConfirmation]);

  if (!authLoading && !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <Dialog
        open={successOpen}
        onOpenChange={(v) => {
          setSuccessOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento confirmado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Sua assinatura foi ativada. Vamos te levar ao painel.</p>
          <DialogFooter className="sm:justify-end">
            <Button className="bg-gradient-hero rounded-xl font-bold" type="button" onClick={() => navigate("/usuario/dashboard")}>
              Ir para o painel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) resetModal();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedPlan ? `Assinar ${selectedPlan.name} — R$ ${formatBrl(Number(selectedPlan.price ?? 0))}` : "Assinatura"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={payMethod === "pix" ? "default" : "outline"}
                className="rounded-xl font-bold"
                onClick={() => {
                  setPayMethod("pix");
                }}
                disabled={processing}
              >
                PIX
              </Button>
              <Button
                type="button"
                variant={payMethod === "card" ? "default" : "outline"}
                className="rounded-xl font-bold"
                onClick={() => {
                  setPayMethod("card");
                  setWaitingConfirmation(false);
                  setPixPaymentId(null);
                  setPixCode("");
                  setPixQrImage("");
                  autoRequestedRef.current = false;
                }}
                disabled={processing}
              >
                Cartão
              </Button>
            </div>
            {payMethod === "pix" ? (
              <p className="text-sm text-muted-foreground">Escaneie o QR Code no app do seu banco ou copie o código abaixo.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Preencha os dados do cartão para concluir o pagamento.</p>
            )}
            {formatCpf(cpfDigits) && (
              <p className="text-sm text-muted-foreground">
                CPF vinculado: <span className="font-bold">{formatCpf(cpfDigits)}</span>
              </p>
            )}

            {payMethod === "pix" ? (
              <>
                <div className="rounded-2xl border bg-background p-4 text-center">
                  {pixQrImage ? (
                    <img
                      className="mx-auto w-56 h-56 object-contain"
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
                  <Input readOnly className="rounded-xl font-mono text-sm" placeholder="Gerando..." value={pixCode} />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label>Nome impresso no cartão</Label>
                  <Input className="rounded-xl" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Número do cartão</Label>
                  <Input className="rounded-xl" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/[^\d\s]/g, ""))} placeholder="0000 0000 0000 0000" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="grid gap-2">
                    <Label>Mês</Label>
                    <Input className="rounded-xl" value={cardMonth} onChange={(e) => setCardMonth(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="MM" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Ano</Label>
                    <Input className="rounded-xl" value={cardYear} onChange={(e) => setCardYear(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="AAAA" />
                  </div>
                  <div className="grid gap-2">
                    <Label>CVV</Label>
                    <Input className="rounded-xl" value={cardCcv} onChange={(e) => setCardCcv(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Parcelas</Label>
                  <Input className="rounded-xl" value={String(installments)} onChange={(e) => setInstallments(Math.max(1, Math.min(2, Number(e.target.value || "1"))))} />
                </div>
              </>
            )}

            {paymentError && <p className="text-sm font-bold text-destructive">{paymentError}</p>}
            {linkWarning && <p className="text-sm font-bold text-muted-foreground">Vínculo: {linkWarning}</p>}
            {waitingConfirmation && !paymentError && (
              <p className="text-sm font-bold text-muted-foreground">Aguardando confirmação do pagamento…</p>
            )}
          </div>

          <DialogFooter className="sm:justify-end">
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setModalOpen(false)} disabled={processing}>
              Fechar
            </Button>
            {payMethod === "pix" ? (
              <Button
                className="bg-gradient-hero rounded-xl font-bold"
                type="button"
                disabled={processing || waitingConfirmation}
                onClick={() => {
                  resetModal();
                  autoRequestedRef.current = false;
                  createPix();
                }}
              >
                {waitingConfirmation ? "Aguardando…" : "Gerar PIX"}
              </Button>
            ) : (
              <Button
                className="bg-gradient-hero rounded-xl font-bold"
                type="button"
                disabled={processing || waitingConfirmation}
                onClick={() => {
                  payCard();
                }}
              >
                {waitingConfirmation ? "Aguardando…" : "Pagar com cartão"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="container mx-auto max-w-6xl px-4 py-10">
        <div className="bg-card rounded-3xl shadow-card p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-extrabold">Planos</h1>
              <p className="text-sm text-muted-foreground">Assine com PIX e libere todos os conteúdos.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-xl font-bold" onClick={() => navigate("/usuario/faturas")}>
                Faturas
              </Button>
              <Button variant="outline" className="rounded-xl font-bold" onClick={() => loadPage()}>
                Atualizar
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="bg-background rounded-2xl border p-5">
              <p className="text-xs font-bold text-muted-foreground">Assinatura atual</p>
              <p className="mt-1 text-lg font-extrabold">{subscription?.plans?.name ?? (subscription?.status ? "Assinatura" : "Sem assinatura")}</p>
              <p className="text-sm text-muted-foreground">
                Status: {subscription?.status ?? "—"} • Vencimento: {fmtDate(activeInfo.expiresAt)}
              </p>
            </div>
            <div className="bg-background rounded-2xl border p-5">
              <p className="text-xs font-bold text-muted-foreground">Acesso</p>
              <p className="mt-1 text-lg font-extrabold">{activeInfo.active ? "Ativo" : "Bloqueado"}</p>
              <p className="text-sm text-muted-foreground">Após a confirmação do PIX, o acesso é liberado automaticamente.</p>
            </div>
          </div>

          {plansError && <p className="mt-6 text-sm font-bold text-destructive">{plansError}</p>}

          <div className="mt-8">
            {pageLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum plano encontrado.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((p) => (
                  <div key={p.id} className="bg-background rounded-3xl border p-6">
                    <p className="text-xs font-bold text-muted-foreground">Plano</p>
                    <h2 className="mt-1 text-xl font-extrabold">{p.name}</h2>
                    <p className="mt-2 text-3xl font-extrabold">R$ {formatBrl(Number(p.price ?? 0))}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.period_months ? `Duração: ${p.period_months} ${p.period_months === 1 ? "mês" : "meses"}` : "—"}
                    </p>
                    <Button
                      className="mt-5 w-full rounded-2xl py-5 font-bold bg-gradient-hero text-primary-foreground"
                      onClick={() => {
                        if (!user) {
                          navigate("/login");
                          return;
                        }
                        resetModal();
                        setSelectedPlan(p);
                        setModalOpen(true);
                      }}
                    >
                      Assinar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UserPlansPage;
