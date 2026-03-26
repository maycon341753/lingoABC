import { motion } from "framer-motion";
import { Check, Sparkles, QrCode, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const plans = [
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

const PricingSection = () => {
  const navigate = useNavigate();
  const { user, userLabel } = useAuth();
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
  const [paymentError, setPaymentError] = useState<string | null>(null);

  return (
    <section className="py-20 px-4 bg-card">
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
                onClick={() => setMethod("pix")}
              >
                <QrCode className="w-4 h-4" /> PIX
              </button>
              <button
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 font-bold ${
                  method === "card" ? "bg-muted" : "bg-background"
                }`}
                onClick={() => setMethod("card")}
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
                setPaymentError(null);
                setProcessing(true);
                const amount = Number(String(selectedPlan?.price ?? "0").replace(/[^\d,]/g, "").replace(",", "."));
                const customerEmail = user?.email ?? undefined;
                const customerName = userLabel ?? customerEmail ?? "Usuário";
                const body =
                  method === "pix"
                    ? {
                        method: "pix",
                        amount,
                        description: selectedPlan?.name ?? "Plano",
                        customerName,
                        customerEmail,
                      }
                    : {
                        method: "card",
                        amount,
                        description: selectedPlan?.name ?? "Plano",
                        customerName,
                        customerEmail,
                        installments,
                        card: {
                          holderName: cardName,
                          number: cardNumber.replace(/\s/g, ""),
                          expiryMonth: cardExpiry.slice(0, 2),
                          expiryYear: cardExpiry.slice(-2),
                          ccv: cardCvv,
                        },
                      };
                fetch("/api/asaas/checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                })
                  .then(async (r) => {
                    const data = await r.json().catch(() => null);
                    if (!r.ok) throw data;
                    return data;
                  })
                  .then((data) => {
                    if (method === "pix") {
                      const code = String(data?.qrCode?.payload ?? "");
                      const encodedImage = String(data?.qrCode?.encodedImage ?? "");
                      if (encodedImage) setPixQrImage(encodedImage);
                      if (code) setPixCode(code);
                      if (!code && !encodedImage) setPaymentError("Não foi possível gerar o PIX. Tente novamente.");
                    } else {
                      setPaymentOpen(false);
                      navigate("/dashboard");
                    }
                  })
                  .catch((e) => {
                    const msg = typeof e?.errors?.[0]?.description === "string" ? e.errors[0].description : null;
                    setPaymentError(msg || "Falha ao gerar pagamento. Verifique as variáveis no Vercel e tente novamente.");
                  })
                  .finally(() => setProcessing(false));
              }}
            >
              Pagar agora
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
