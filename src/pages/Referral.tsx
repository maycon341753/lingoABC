import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, CheckCircle, Users, DollarSign, MousePointerClick, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/landing/Navbar";

const mockData = {
  userId: "abc123",
  totalClicks: 142,
  totalSignups: 38,
  totalConversions: 12,
  commission: 40,
  balance: 359.52,
  history: [
    { date: "22/03/2026", name: "Maria S.", status: "convertido", value: 74.90, commission: 29.96 },
    { date: "20/03/2026", name: "João P.", status: "convertido", value: 179.00, commission: 71.60 },
    { date: "18/03/2026", name: "Ana L.", status: "cadastrado", value: 0, commission: 0 },
    { date: "15/03/2026", name: "Pedro M.", status: "convertido", value: 259.90, commission: 103.96 },
    { date: "12/03/2026", name: "Carla R.", status: "cadastrado", value: 0, commission: 0 },
    { date: "10/03/2026", name: "Lucas T.", status: "convertido", value: 74.90, commission: 29.96 },
  ],
};

const stats = [
  { label: "Cliques", value: mockData.totalClicks, icon: MousePointerClick, color: "text-accent" },
  { label: "Cadastros", value: mockData.totalSignups, icon: Users, color: "text-lavender" },
  { label: "Conversões", value: mockData.totalConversions, icon: TrendingUp, color: "text-primary" },
  { label: "Saldo", value: `R$ ${mockData.balance.toFixed(2)}`, icon: DollarSign, color: "text-sun" },
];

const ReferralPage = () => {
  const [copied, setCopied] = useState(false);
  const referralLink = `lingoabc.com/?ref=${mockData.userId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${referralLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold mb-2">
            Programa de Indicação 🤝
          </h1>
          <p className="text-muted-foreground mb-8">
            Indique amigos e ganhe <span className="font-extrabold text-sun">{mockData.commission}% de comissão</span> em cada assinatura!
          </p>
        </motion.div>

        {/* Referral link */}
        <motion.div className="bg-card rounded-3xl shadow-card p-6 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-sm font-bold text-muted-foreground mb-2">Seu link de indicação:</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-muted rounded-xl px-4 py-3 font-mono text-sm font-bold truncate">
              {referralLink}
            </div>
            <Button className="bg-gradient-hero rounded-xl font-bold shrink-0" onClick={handleCopy}>
              {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} className="bg-card rounded-2xl shadow-card p-5 flex items-center gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
              <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold">{s.value}</p>
                <p className="text-xs text-muted-foreground font-bold">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* History */}
        <motion.div className="bg-card rounded-3xl shadow-card overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="p-6 border-b border-border">
            <h2 className="font-display font-bold text-xl">Histórico de Indicações</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-bold text-muted-foreground">Data</th>
                  <th className="text-left p-4 font-bold text-muted-foreground">Indicado</th>
                  <th className="text-left p-4 font-bold text-muted-foreground">Status</th>
                  <th className="text-right p-4 font-bold text-muted-foreground">Valor</th>
                  <th className="text-right p-4 font-bold text-muted-foreground">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {mockData.history.map((h, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4">{h.date}</td>
                    <td className="p-4 font-bold">{h.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${h.status === "convertido" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                        {h.status === "convertido" ? "✅ Convertido" : "👤 Cadastrado"}
                      </span>
                    </td>
                    <td className="p-4 text-right">{h.value > 0 ? `R$ ${h.value.toFixed(2)}` : "—"}</td>
                    <td className="p-4 text-right font-bold text-primary">{h.commission > 0 ? `R$ ${h.commission.toFixed(2)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ReferralPage;
