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

  const buildApiUrl = (path: string) => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") return path;
    }
    const base = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
    if (!base) return path;
    return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const monthStartIso = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      let token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) token = (await supabase.auth.refreshSession()).data.session?.access_token;
      if (token) {
        try {
          const r = await fetch(buildApiUrl("/api/admin/dashboard-metrics"), {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          });
          const j = (await r.json().catch(() => null)) as
            | { usersCount?: number; lessonsCount?: number; subsCountMonth?: number; revenueMonth?: number; error?: string }
            | null;
          if (mounted && j && !j.error) {
            setUsersCount(Number(j.usersCount ?? 0));
            setLessonsCount(Number(j.lessonsCount ?? 0));
            setSubsCount(Number(j.subsCountMonth ?? 0));
            setRevenueThisMonth(Number(j.revenueMonth ?? 0));
            return;
          }
        } catch {
          void 0;
        }
      }

      const [usersTry, lessonsTry, subsTry] = await Promise.all([
        supabase.from("v_admin_users").select("user_id", { count: "exact", head: true }),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("value,status,started_at,created_at").or(`started_at.gte.${monthStartIso},created_at.gte.${monthStartIso}`),
      ]);

      if (!mounted) return;
      setUsersCount(usersTry.count ?? 0);
      setLessonsCount(lessonsTry.count ?? 0);

      const subsData = (subsTry.data ?? []) as SubscriptionMetricsRow[];
      const paidSubs = subsData.filter((s) => isPaidStatus(s.status));
      setSubsCount(paidSubs.length);
      setRevenueThisMonth(paidSubs.reduce((sum, s) => sum + Number(s.value ?? 0), 0));
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
      <h1 className="text-xl sm:text-2xl font-display font-extrabold mb-6">Dashboard ⚙️</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
