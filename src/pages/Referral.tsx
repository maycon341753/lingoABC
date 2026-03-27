import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Copy, CheckCircle, Users, DollarSign, MousePointerClick, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/landing/Navbar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type ReferralLinkRow = {
  id: string;
  code: string;
  commission_percent: number | null;
};

type ReferralEventRow = {
  id: string;
  event_type: string | null;
  occurred_at: string | null;
  referred_name: string | null;
  amount: number | null;
  commission_amount: number | null;
};

const ReferralPage = () => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refLink, setRefLink] = useState<ReferralLinkRow | null>(null);
  const [events, setEvents] = useState<ReferralEventRow[]>([]);
  const [clicks, setClicks] = useState(0);
  const [signups, setSignups] = useState(0);
  const [conversions, setConversions] = useState(0);
  const [commissionDue, setCommissionDue] = useState(0);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const referralUrl = useMemo(() => {
    const code = refLink?.code ?? "";
    if (!code) return "";
    const u = new URL("/", window.location.origin);
    u.searchParams.set("ref", code);
    return u.toString();
  }, [refLink?.code]);

  const referralDisplay = useMemo(() => {
    if (!referralUrl) return "";
    return referralUrl.replace(/^https?:\/\//, "");
  }, [referralUrl]);

  const handleCopy = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data: existing, error: existingErr } = await supabase
          .from("referral_links")
          .select("id,code,commission_percent")
          .eq("owner_user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (existingErr) {
          setLoadError(existingErr.message);
          setRefLink(null);
          setLoading(false);
          return;
        }
        let link = existing as ReferralLinkRow | null;
        if (!link?.id) {
          const code = user.id.replace(/-/g, "").slice(0, 8);
          const ins = await supabase.from("referral_links").insert({ owner_user_id: user.id, code }).select("id,code,commission_percent").maybeSingle();
          if (ins.error) {
            setLoadError(ins.error.message);
            setRefLink(null);
            setLoading(false);
            return;
          }
          link = (ins.data as ReferralLinkRow | null) ?? null;
        }
        if (!mounted) return;
        setRefLink(link);

        const linkId = String(link?.id ?? "");
        if (!linkId) {
          setEvents([]);
          setClicks(0);
          setSignups(0);
          setConversions(0);
          setCommissionDue(0);
          setLoading(false);
          return;
        }

        const [clicksR, signupsR, convR, dueR, histR] = await Promise.all([
          supabase.from("referral_events").select("id", { count: "exact", head: true }).eq("link_id", linkId).eq("event_type", "click"),
          supabase.from("referral_events").select("id", { count: "exact", head: true }).eq("link_id", linkId).eq("event_type", "signup"),
          supabase.from("referral_events").select("id", { count: "exact", head: true }).eq("link_id", linkId).eq("event_type", "conversion"),
          supabase.from("referral_events").select("commission_amount").eq("link_id", linkId).eq("event_type", "conversion"),
          supabase
            .from("referral_events")
            .select("id,event_type,occurred_at,referred_name,amount,commission_amount")
            .eq("link_id", linkId)
            .order("occurred_at", { ascending: false })
            .limit(20),
        ]);

        const clicksCount = Number(clicksR.count ?? 0);
        const signupsCount = Number(signupsR.count ?? 0);
        const conversionsCount = Number(convR.count ?? 0);
        const dueRows = Array.isArray(dueR.data) ? dueR.data : [];
        const due = dueRows.reduce((sum, r) => sum + Number((r as { commission_amount?: number | null }).commission_amount ?? 0), 0);

        if (!mounted) return;
        setClicks(clicksCount);
        setSignups(signupsCount);
        setConversions(conversionsCount);
        setCommissionDue(due);
        setEvents(((histR.data ?? []) as ReferralEventRow[]) ?? []);
      } catch (e: unknown) {
        if (!mounted) return;
        setLoadError(e instanceof Error ? e.message : "Falha ao carregar");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [authLoading, user?.id]);

  const stats = useMemo(() => {
    return [
      { label: "Cliques", value: clicks, icon: MousePointerClick, color: "text-accent" },
      { label: "Cadastros", value: signups, icon: Users, color: "text-lavender" },
      { label: "Conversões", value: conversions, icon: TrendingUp, color: "text-primary" },
      { label: "A receber", value: `R$ ${commissionDue.toFixed(2)}`, icon: DollarSign, color: "text-sun" },
    ];
  }, [clicks, commissionDue, conversions, signups]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold mb-2">
            Programa de Indicação 🤝
          </h1>
          <p className="text-muted-foreground mb-8">
            Compartilhe seu link e acompanhe cadastros e conversões.
          </p>
        </motion.div>

        {loading ? (
          <p className="text-muted-foreground font-bold">Carregando…</p>
        ) : !user?.id ? (
          <div className="bg-card rounded-3xl shadow-card p-6 mb-8">
            <p className="text-sm text-muted-foreground">Entre na sua conta para ver seu link de indicação.</p>
            <div className="mt-4">
              <Button className="bg-gradient-hero rounded-xl font-bold" onClick={() => navigate("/login")}>
                Entrar
              </Button>
            </div>
          </div>
        ) : loadError ? (
          <div className="bg-card rounded-3xl shadow-card p-6 mb-8">
            <p className="text-sm font-bold text-destructive">Falha ao carregar: {loadError}</p>
          </div>
        ) : (
          <motion.div className="bg-card rounded-3xl shadow-card p-6 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <p className="text-sm font-bold text-muted-foreground mb-2">Seu link de indicação:</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted rounded-xl px-4 py-3 font-mono text-sm font-bold truncate">
                {referralDisplay}
              </div>
              <Button className="bg-gradient-hero rounded-xl font-bold shrink-0" onClick={handleCopy} disabled={!referralUrl}>
                {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? "Copiado!" : "Copiar"}
              </Button>
            </div>
          </motion.div>
        )}

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
                {events.length === 0 ? (
                  <tr>
                    <td className="p-6 text-muted-foreground font-bold" colSpan={5}>
                      Nenhuma indicação registrada ainda.
                    </td>
                  </tr>
                ) : (
                  events.map((h) => {
                    const type = String(h.event_type ?? "").toLowerCase();
                    const isConversion = type === "conversion";
                    const label = isConversion ? "✅ Convertido" : type === "signup" ? "👤 Cadastrado" : "👆 Clique";
                    const color = isConversion ? "bg-primary/10 text-primary" : type === "signup" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground";
                    const dt = h.occurred_at ? new Date(h.occurred_at).toLocaleDateString("pt-BR") : "—";
                    const name = h.referred_name ? String(h.referred_name) : "—";
                    const value = Number(h.amount ?? 0);
                    const comm = Number(h.commission_amount ?? 0);
                    return (
                      <tr key={h.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-4">{dt}</td>
                        <td className="p-4 font-bold">{name}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>{label}</span>
                        </td>
                        <td className="p-4 text-right">{value > 0 ? `R$ ${value.toFixed(2)}` : "—"}</td>
                        <td className="p-4 text-right font-bold text-primary">{comm > 0 ? `R$ ${comm.toFixed(2)}` : "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ReferralPage;
