import { motion } from "framer-motion";
import { Star, BookOpen, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type UserPlanRow = {
  user_id: string;
  name: string | null;
  plan_name: string | null;
  subscription_status: string | null;
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [welcomeName, setWelcomeName] = useState<string>("estudante");
  const [points, setPoints] = useState<number>(0);
  const [lessonsTotal, setLessonsTotal] = useState<number>(0);
  const [completedActivities, setCompletedActivities] = useState<number>(0);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      const [{ data: planRow }, { count: lessonsCount }, { data: progressRows }] = await Promise.all([
        supabase.from("v_user_profile_plan").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
        supabase.from("user_activity_progress").select("status,score,created_at").eq("user_id", uid),
      ]);
      if (!mounted) return;
      const pr = planRow as UserPlanRow | null;
      setWelcomeName(pr?.name ?? "estudante");
      setPlanName(pr?.plan_name ?? null);
      setLessonsTotal(lessonsCount ?? 0);
      const completed = (progressRows ?? []).filter((r: { status: string | null }) => (r.status ?? "").toLowerCase() === "completed");
      setCompletedActivities(completed.length);
      const pts = (progressRows ?? []).reduce((sum: number, r: { score: number | null }) => sum + Number(r.score ?? 0), 0);
      setPoints(pts);
      const days = Array.from(new Set((progressRows ?? []).map((r: { created_at: string }) => new Date(r.created_at).toDateString())))
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
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

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
            <p className="text-sm text-muted-foreground">{planName ?? "Sem plano ativo"}</p>
          </motion.div>
        </div>

        <motion.div className="mt-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="font-display font-bold text-xl mb-4">Acesso rápido</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: "📐", label: "Matemática", onClick: () => navigate("/modulos") },
              { emoji: "📖", label: "Português", onClick: () => navigate("/modulos") },
              { emoji: "🌍", label: "Inglês", onClick: () => navigate("/modulos") },
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
