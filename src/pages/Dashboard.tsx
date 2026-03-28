import { motion } from "framer-motion";
import { Star, BookOpen, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import mascot from "@/assets/mascot-owl.png";
import { useSeo } from "@/lib/useSeo";

type UserPlanRow = {
  user_id: string;
  name: string | null;
  plan_name: string | null;
  subscription_status: string | null;
};

type SubscriptionWithPlanRow = {
  status: string | null;
  expires_at: string | null;
  plans: { name: string | null } | null;
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

const DashboardPage = () => {
  const navigate = useNavigate();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const canonical = origin ? `${origin}/usuario/dashboard` : "/usuario/dashboard";
  useSeo({
    title: "Dashboard | LingoABC",
    description: "Acompanhe seu progresso, pontos e atividades concluídas na LingoABC.",
    canonical,
    ogImage: mascot,
    noindex: true,
  });
  const [welcomeName, setWelcomeName] = useState<string>("estudante");
  const [points, setPoints] = useState<number>(0);
  const [lessonsTotal, setLessonsTotal] = useState<number>(0);
  const [completedActivities, setCompletedActivities] = useState<number>(0);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [planName, setPlanName] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async (mountedRef?: { current: boolean }) => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setLoading(false);
      navigate("/login");
        return;
      }
      const lessonsTryActive = supabase.from("lessons").select("id", { count: "exact", head: true }).eq("active", true);
      const [{ data: planRow, error: planError }, lessonsTry, { data: progressRows }] = await Promise.all([
        supabase.from("v_user_profile_plan").select("user_id,name,plan_name,subscription_status").eq("user_id", uid).maybeSingle(),
        lessonsTryActive,
        supabase.from("user_activity_progress").select("status,score,created_at").eq("user_id", uid),
      ]);
      if (mountedRef && !mountedRef.current) return;
      const pr = planRow as UserPlanRow | null;
      setWelcomeName(pr?.name ?? "estudante");
      const planNameFromView = pr?.plan_name ?? null;
      const planStatusFromView = pr?.subscription_status ?? null;

      if (!planError && planNameFromView) {
        setPlanName(planNameFromView);
        setPlanStatus(planStatusFromView);
      } else {
        const { data: subRow } = await supabase
          .from("subscriptions")
          .select("status,expires_at,plans(name)")
          .eq("user_id", uid)
          .order("expires_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();
        if (mountedRef && !mountedRef.current) return;
        const row = subRow as SubscriptionWithPlanRow | null;
        setPlanName(row?.plans?.name ?? null);
        setPlanStatus(row?.status ?? null);
      }

      const lessonsCount = lessonsTry.error
        ? await supabase.from("lessons").select("id", { count: "exact", head: true })
        : lessonsTry;
      if (mountedRef && !mountedRef.current) return;
      setLessonsTotal((lessonsCount as { count: number | null }).count ?? 0);

      const rows = Array.isArray(progressRows) ? progressRows : [];
      const completed = rows.filter((r: { status: string | null }) => (r.status ?? "").toLowerCase() === "completed");
      setCompletedActivities(completed.length);
      const pts = completed.reduce((sum: number, r: { score: number | null }) => sum + Number(r.score ?? 0), 0);
      setPoints(pts);
      const days = Array.from(new Set(completed.map((r: { created_at: string }) => new Date(r.created_at).toDateString())))
        .map((d) => new Date(d).getTime())
        .sort((a, b) => b - a);
      let streak = 0;
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      for (;;) {
        const time = cursor.getTime();
        if (days.includes(time)) {
          streak += 1;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
      setStreakDays(streak);
      setLoading(false);
  }, [navigate]);

  useEffect(() => {
    const mountedRef = { current: true };
    load(mountedRef).then(() => {});
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-extrabold">Olá, {welcomeName}! 👋</h1>
          {planName ? (
            <p className="text-muted-foreground font-bold">Plano: {planName}</p>
          ) : (
            <p className="text-muted-foreground">Assine um plano para liberar todos os conteúdos.</p>
          )}
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Pontos", value: loading ? "—" : String(points), icon: Star, color: "text-sun" },
            { label: "Atividades concluídas", value: loading ? "—" : String(completedActivities), icon: BookOpen, color: "text-primary" },
            { label: "Sequência", value: loading ? "—" : `${streakDays} dias`, icon: Flame, color: "text-coral" },
            { label: "Lições disponíveis", value: loading ? "—" : String(lessonsTotal), icon: BookOpen, color: "text-lavender" },
          ].map((s, i) => (
            <motion.div key={s.label} className="bg-card rounded-2xl shadow-card p-5 flex items-center gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
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

        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div className="lg:col-span-2 bg-gradient-hero rounded-3xl p-8 text-primary-foreground" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <h2 className="font-display font-bold text-xl mb-2">Continue de onde parou 🎯</h2>
            <p className="text-primary-foreground/80 mb-6">Acesse os módulos para continuar suas lições.</p>
            <Button className="bg-card text-foreground font-bold rounded-xl hover:scale-105 transition-transform" onClick={() => navigate("/modulos")}>
              Ir para Módulos ▶️
            </Button>
          </motion.div>

          <motion.div className="bg-card rounded-3xl shadow-card p-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h3 className="font-display font-bold text-lg mb-2">Seu plano</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : planName ? (
              <p className="text-sm text-muted-foreground">{planName}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Sem plano ativo</p>
            )}
            {!loading && planName && planStatus && (
              <p className="text-xs text-muted-foreground mt-1">Status: {planStatus}</p>
            )}
          </motion.div>
        </div>

        <motion.div className="mt-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="font-display font-bold text-xl mb-4">Acesso rápido</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: "📐", label: "Matemática", onClick: () => navigate("/modulos/matematica") },
              { emoji: "📖", label: "Português", onClick: () => navigate("/modulos/portugues") },
              { emoji: "🌍", label: "Inglês", onClick: () => navigate("/modulos/ingles") },
              { emoji: "🎵", label: "Vídeos e músicas", onClick: () => navigate("/videos") },
            ].map((item) => (
              <motion.button key={item.label} className="bg-card rounded-2xl shadow-card p-6 text-center hover:shadow-hover transition-shadow" whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }} onClick={item.onClick}>
                <span className="text-4xl block mb-2">{item.emoji}</span>
                <span className="font-bold text-sm">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
