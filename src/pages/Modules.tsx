import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Star, CheckCircle, BookOpen, Calculator, Globe } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const subjects = [
  { id: "math", name: "Matemática", icon: Calculator, color: "bg-secondary" },
  { id: "port", name: "Português", icon: BookOpen, color: "bg-primary" },
  { id: "eng", name: "Inglês", icon: Globe, color: "bg-accent" },
];

const modules = [
  { name: "Descoberta", age: "4–5 anos", emoji: "🌱", gradient: "bg-gradient-fun" },
  { name: "Construção", age: "6–7 anos", emoji: "🧱", gradient: "bg-gradient-hero" },
  { name: "Desenvolvimento", age: "8–9 anos", emoji: "🚀", gradient: "bg-gradient-cool" },
  { name: "Domínio", age: "10+ anos", emoji: "👑", gradient: "bg-gradient-warm" },
];

const generateLessons = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Lição ${i + 1}`,
  }));

const ModulesPage = () => {
  const [selectedModule, setSelectedModule] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState("math");
  const [perfectIds, setPerfectIds] = useState<number[]>([]);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [completedModules, setCompletedModules] = useState<boolean[]>([]);
  const [subActive, setSubActive] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { loading, user, hasSubscription } = useAuth();
  const effectiveHasSubscription = subActive ?? hasSubscription;
  const isFreeUser = !loading && !!user && !effectiveHasSubscription;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    const run = async () => {
      const nowMs = Date.now();
      let active = false;
      const planTry = await supabase
        .from("v_user_profile_plan")
        .select("subscription_status, expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!planTry.error && planTry.data) {
        const status = String((planTry.data as { subscription_status?: string | null } | null)?.subscription_status ?? "")
          .toLowerCase()
          .trim();
        const expiresAtIso = String((planTry.data as { expires_at?: string | null } | null)?.expires_at ?? "");
        const t = expiresAtIso ? new Date(expiresAtIso).getTime() : NaN;
        const expiresAtMs = Number.isFinite(t) ? t : null;
        active = (status === "active" || status === "ativa" || status === "ativo") && (expiresAtMs == null || expiresAtMs > nowMs);
      }
      if (!active) {
        const { data: subRow } = await supabase
          .from("subscriptions")
          .select("status, expires_at")
          .eq("user_id", user.id)
          .order("expires_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();
        const row = subRow as { status?: string | null; expires_at?: string | null } | null;
        const status = String(row?.status ?? "").toLowerCase().trim();
        const expiresAtIso = String(row?.expires_at ?? "");
        const t = expiresAtIso ? new Date(expiresAtIso).getTime() : NaN;
        const expiresAtMs = Number.isFinite(t) ? t : null;
        active = (status === "active" || status === "ativa" || status === "ativo") && (expiresAtMs == null || expiresAtMs > nowMs);
      }
      if (mounted) setSubActive(active);
    };
    run();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const moduleName = modules[selectedModule]?.name ?? "Descoberta";
    const key = `progressPerfect:${selectedSubject}:${moduleName}`;
    try {
      const raw = window.localStorage.getItem(key);
      const arr = raw ? (JSON.parse(raw) as number[]) : [];
      setPerfectIds(Array.isArray(arr) ? arr : []);
    } catch {
      setPerfectIds([]);
    }
  }, [selectedModule, selectedSubject]);

  useEffect(() => {
    const moduleName = modules[selectedModule]?.name ?? "Descoberta";
    const key = `progressCompleted:${selectedSubject}:${moduleName}`;
    try {
      const raw = window.localStorage.getItem(key);
      const arr = raw ? (JSON.parse(raw) as number[]) : [];
      setCompletedIds(Array.isArray(arr) ? arr : []);
    } catch {
      setCompletedIds([]);
    }
  }, [selectedModule, selectedSubject]);

  useEffect(() => {
    try {
      const arr = modules.map((m) => {
        const key = `progressCompleted:${selectedSubject}:${m.name}`;
        const raw = window.localStorage.getItem(key);
        const ids = raw ? (JSON.parse(raw) as number[]) : [];
        return Array.isArray(ids) && ids.length >= 40;
      });
      setCompletedModules(arr);
    } catch {
      setCompletedModules(new Array(modules.length).fill(false));
    }
  }, [selectedSubject]);

  const lessons = useMemo(() => {
    const base = generateLessons(40);
    return base.map((l) => {
      if (isFreeUser) {
        const completed = l.id === 1 && completedIds.includes(1);
        const locked = l.id !== 1;
        return { ...l, completed, locked };
      }
      const completed = completedIds.includes(l.id);
      const locked = false;
      return { ...l, completed, locked };
    });
  }, [completedIds, isFreeUser]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <motion.h1
          className="text-3xl md:text-4xl font-display font-extrabold mb-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Escolha seu módulo 📚
        </motion.h1>

        {/* Module selector */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {modules.map((m, i) => (
            <motion.button
              key={m.name}
              className={`rounded-2xl p-5 text-center transition-all ${
                completedModules[i]
                  ? `bg-primary text-primary-foreground shadow-playful ${selectedModule === i ? "scale-105" : ""}`
                  : selectedModule === i
                  ? `${m.gradient} text-primary-foreground shadow-playful scale-105`
                  : "bg-card shadow-card hover:shadow-hover"
              }`}
              onClick={() => setSelectedModule(i)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-3xl block mb-1">{m.emoji}</span>
              <span className="font-display font-bold text-sm">{m.name}</span>
              <span className={`block text-xs ${selectedModule === i || completedModules[i] ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {m.age}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Subject tabs */}
        <div className="grid grid-cols-2 gap-3 mb-8 sm:flex sm:flex-wrap sm:justify-center">
          {subjects.map((s) => (
            <button
              key={s.id}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                selectedSubject === s.id
                  ? `${s.color} text-primary-foreground shadow-playful`
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              onClick={() => setSelectedSubject(s.id)}
            >
              <s.icon className="w-4 h-4" />
              {s.name}
            </button>
          ))}
          <button
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-secondary text-primary-foreground shadow-playful"
            onClick={() => navigate("/videos")}
          >
            Vídeos e Músicas
          </button>
        </div>

        {/* Lesson map */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedModule}-${selectedSubject}`}
            className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {lessons.map((lesson, i) => (
              <motion.button
                key={lesson.id}
                className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center font-bold transition-all ${
                  lesson.completed
                    ? "bg-primary text-primary-foreground shadow-playful"
                    : lesson.locked
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                    : "bg-card shadow-card hover:shadow-hover text-foreground"
                }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                whileHover={!lesson.locked ? { scale: 1.1, y: -4 } : {}}
                whileTap={!lesson.locked ? { scale: 0.95 } : {}}
                onClick={() => {
                  if (lesson.locked) {
                    if (isFreeUser && lesson.id !== 1) navigate("/planos");
                    return;
                  }
                  const moduleName = modules[selectedModule]?.name ?? "Descoberta";
                  navigate(`/licao?modulo=${encodeURIComponent(moduleName)}&materia=${encodeURIComponent(selectedSubject)}&licao=${lesson.id}`);
                }}
              >
                {lesson.completed ? (
                  <CheckCircle className="w-6 h-6 mb-0.5" />
                ) : lesson.locked ? (
                  <Lock className="w-5 h-5 mb-0.5" />
                ) : (
                  <Star className="w-5 h-5 mb-0.5 text-sun" />
                )}
                <span className="text-xs">{lesson.id}</span>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
};

export default ModulesPage;
