import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SubscriptionMetricsRow = {
  value: number | null;
  status: string | null;
};

const isPaidStatus = (raw: string | null) => {
  const s = String(raw ?? "").toLowerCase().trim();
  return s === "active" || s === "ativa" || s === "confirmed" || s === "received" || s === "paid";
};

const DashboardPage = () => {
  const [usersCount, setUsersCount] = useState<number | null>(null);
  const [subsCount, setSubsCount] = useState<number | null>(null);
  const [revenueThisMonth, setRevenueThisMonth] = useState<number | null>(null);
  const [lessonsCount, setLessonsCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const monthStartIso = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [{ count: cUsers }, { count: cLessons }, subsTryStartedAt] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
        supabase
          .from("subscriptions")
          .select("value, started_at, status")
          .gte("started_at", monthStartIso),
      ]);

      const subs =
        subsTryStartedAt.error != null
          ? await supabase.from("subscriptions").select("value, status, created_at").gte("created_at", monthStartIso)
          : subsTryStartedAt;

      if (!mounted) return;
      setUsersCount(cUsers ?? 0);
      setLessonsCount(cLessons ?? 0);

      const subsData = (subs.data ?? []) as SubscriptionMetricsRow[];
      const paidSubs = subsData.filter((s) => isPaidStatus(s.status));
      setSubsCount(paidSubs.length);
      const revenue = paidSubs.reduce((sum, s) => sum + Number(s.value ?? 0), 0);
      setRevenueThisMonth(revenue);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const cards = [
    { label: "Usuários", value: usersCount != null ? String(usersCount) : "—", color: "text-primary" },
    { label: "Assinantes (este mês)", value: subsCount != null ? String(subsCount) : "—", color: "text-accent" },
    { label: "Receita (este mês)", value: revenueThisMonth != null ? `R$ ${revenueThisMonth.toFixed(2)}` : "—", color: "text-sun" },
    { label: "Lições cadastradas", value: lessonsCount != null ? String(lessonsCount) : "—", color: "text-coral" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-display font-extrabold mb-6">Dashboard ⚙️</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((s, i) => (
          <motion.div key={s.label} className="bg-card rounded-2xl shadow-card p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <p className="text-xs text-muted-foreground font-bold mb-1">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
