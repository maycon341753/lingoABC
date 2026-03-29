import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Star, CheckCircle, BookOpen, Calculator, Globe } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import mascot from "@/assets/mascot-owl.png";
import { useSeo } from "@/lib/useSeo";

const subjects = [
  { id: "math", name: "Matemática", icon: Calculator },
  { id: "port", name: "Português", icon: BookOpen },
  { id: "eng", name: "Inglês", icon: Globe },
];

const modules = [
  { name: "Descoberta", age: "4–5 anos", emoji: "🌱", gradient: "bg-gradient-fun" },
  { name: "Construção", age: "6–7 anos", emoji: "🧱", gradient: "bg-gradient-hero" },
  { name: "Desenvolvimento", age: "8–9 anos", emoji: "🚀", gradient: "bg-gradient-cool" },
  { name: "Domínio", age: "10+ anos", emoji: "👑", gradient: "bg-gradient-warm" },
];

const mathLessonTitle = (phase: string, lessonId: number) => {
  const p = phase.toLowerCase();
  const step = Math.max(1, Math.min(40, Number(lessonId) || 1));
  if (p === "descoberta") {
    if (step <= 10) return `Contagem e números até ${Math.min(10, 3 + step)}`;
    if (step <= 20) return `Somando até ${Math.min(20, 8 + step)}`;
    if (step <= 30) return `Subtraindo até ${Math.min(20, 6 + step)}`;
    return `Maior, menor e sequência (${step})`;
  }
  if (p === "construção" || p === "construcao") {
    if (step <= 10) return `Somar e subtrair até ${Math.min(30, 10 + step * 2)}`;
    if (step <= 20) return `Dezenas e unidades (${step})`;
    if (step <= 30) return `Problemas de adição (${step})`;
    return `Problemas de subtração (${step})`;
  }
  if (p === "desenvolvimento") {
    if (step <= 10) return `Tabuada (2–5) (${step})`;
    if (step <= 20) return `Multiplicação e divisão (${step})`;
    if (step <= 30) return `Medidas e tempo (${step})`;
    return `Frações básicas (${step})`;
  }
  if (step <= 10) return `Tabuada (6–9) (${step})`;
  if (step <= 20) return `Divisão com resultado exato (${step})`;
  if (step <= 30) return `Porcentagem e dinheiro (${step})`;
  return `Problemas em 2 etapas (${step})`;
};

const portLessonTitle = (phase: string, lessonId: number) => {
  const p = phase.toLowerCase();
  const step = Math.max(1, Math.min(40, Number(lessonId) || 1));
  if (p === "descoberta") {
    if (step <= 10) return `Letras e vogais (A–E–I–O–U)`;
    if (step <= 20) return `Sílabas simples (BA, LA, GA)`;
    if (step <= 30) return `Palavras curtas (CASA, BOLA, SAPO)`;
    return `Maior/menor palavra e ordem alfabética`;
  }
  if (p === "construção" || p === "construcao") {
    if (step <= 10) return `Famílias silábicas (PA–PE–PI–PO–PU)`;
    if (step <= 20) return `Leitura e formação de palavras`;
    if (step <= 30) return `Ortografia simples (M/N, R/L)`;
    return `Frases curtas e pontuação básica`;
  }
  if (p === "desenvolvimento") {
    if (step <= 10) return `Textos curtos e interpretação`;
    if (step <= 20) return `Sinônimos e antônimos básicos`;
    if (step <= 30) return `Separação silábica e acentuação`;
    return `Classes de palavras (substantivo/adjetivo)`;
  }
  if (step <= 10) return `Concordância simples`;
  if (step <= 20) return `Pontuação (., ?)`;
  if (step <= 30) return `Coesão e sequência de ideias`;
  return `Interpretação de texto`;
};

const engLessonTitle = (phase: string, lessonId: number) => {
  const p = phase.toLowerCase();
  const step = Math.max(1, Math.min(40, Number(lessonId) || 1));
  if (p === "descoberta") {
    if (step <= 10) return `Animais e objetos (vocabulário básico)`;
    if (step <= 20) return `Cores e formas`;
    if (step <= 30) return `Números 1–20`;
    return `Saudações e frases simples`;
  }
  if (p === "construção" || p === "construcao") {
    if (step <= 10) return `Alimentos e família`;
    if (step <= 20) return `Dias da semana e rotina`;
    if (step <= 30) return `Perguntas simples (What/Where/How)`;
    return `Frases curtas e compreensão`;
  }
  if (p === "desenvolvimento") {
    if (step <= 10) return `Adjetivos e opostos`;
    if (step <= 20) return `Verbos do dia a dia`;
    if (step <= 30) return `Partes do corpo e roupas`;
    return `Preposições e direções`;
  }
  if (step <= 10) return `Tempo verbal básico (present simple)`;
  if (step <= 20) return `Perguntas e respostas`;
  if (step <= 30) return `Interpretação de texto curto`;
  return `Vocabulário temático avançado`;
};

const generateLessons = (count: number, subject: string, phase: string) =>
  Array.from({ length: count }, (_, i) => {
    const lessonId = i + 1;
    const title =
      subject === "math"
        ? mathLessonTitle(phase, lessonId)
        : subject === "port"
        ? portLessonTitle(phase, lessonId)
        : subject === "eng"
        ? engLessonTitle(phase, lessonId)
        : `Lição ${lessonId}`;
    return { id: lessonId, title };
  });

const subjectParamToId = (raw: string | undefined) => {
  const v = String(raw ?? "")
    .toLowerCase()
    .trim();
  if (!v) return null;
  if (v === "math" || v === "matematica" || v === "matemática") return "math";
  if (v === "port" || v === "portugues" || v === "português") return "port";
  if (v === "eng" || v === "ingles" || v === "inglês") return "eng";
  return null;
};

const subjectIdToSlug = (id: string) => {
  if (id === "math") return "matematica";
  if (id === "port") return "portugues";
  if (id === "eng") return "ingles";
  return "matematica";
};

const moduleNameToSlug = (name: string) => {
  const v = String(name ?? "").toLowerCase().trim();
  if (v === "descoberta") return "descoberta";
  if (v === "construção" || v === "construcao") return "construcao";
  if (v === "desenvolvimento") return "desenvolvimento";
  if (v === "domínio" || v === "dominio") return "dominio";
  return "descoberta";
};

const moduleSlugToIndex = (raw: string | undefined) => {
  const v = String(raw ?? "").toLowerCase().trim();
  const names = ["descoberta", "construcao", "desenvolvimento", "dominio"];
  const i = names.indexOf(v);
  return i >= 0 ? i : null;
};

const ModulesPage = () => {
  const [selectedModule, setSelectedModule] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState("math");
  const [perfectIds, setPerfectIds] = useState<number[]>([]);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [completedModules, setCompletedModules] = useState<boolean[]>([]);
  const [subActive, setSubActive] = useState<boolean | null>(null);
  const [moduleProgressCount, setModuleProgressCount] = useState<Record<string, number>>({});
  const reduceMotion = true;
  const navigate = useNavigate();
  const { subject: subjectParam, module: moduleParam } = useParams();
  const { loading, user, hasSubscription } = useAuth();
  const effectiveHasSubscription = subActive ?? hasSubscription;
  const isSubscriber = !loading && !!user && effectiveHasSubscription;
  const isFreeUser = !loading && !!user && !effectiveHasSubscription;
  const isGuest = !loading && !user;
  const moduleLocks = useMemo(() => {
    if (isSubscriber) return new Array(modules.length).fill(false);
    if (isGuest) return new Array(modules.length).fill(false);
    if (isFreeUser) return new Array(modules.length).fill(false);
    return new Array(modules.length).fill(false);
  }, [isFreeUser, isGuest, isSubscriber]);

  const moduleName = modules[selectedModule]?.name ?? "Descoberta";
  const subjectLabel =
    selectedSubject === "math" ? "Matemática" : selectedSubject === "port" ? "Português" : selectedSubject === "eng" ? "Inglês" : "Matemática";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const canonical = origin
    ? `${origin}/modulos/${encodeURIComponent(subjectIdToSlug(selectedSubject))}/${encodeURIComponent(moduleNameToSlug(moduleName))}`
    : `/modulos/${encodeURIComponent(subjectIdToSlug(selectedSubject))}/${encodeURIComponent(moduleNameToSlug(moduleName))}`;
  useSeo({
    title: `Módulos de ${subjectLabel} (${moduleName}) | LingoABC`,
    description:
      "Plataforma educacional infantil com módulos por faixa etária. Educação infantil online para aprender brincando com lições gamificadas e reforço escolar infantil.",
    keywords:
      "plataforma educacional infantil, educação infantil online, reforço escolar infantil, aprender brincando, ensino para crianças",
    canonical,
    ogImage: mascot,
  });

  useEffect(() => {
    const mapped = subjectParamToId(subjectParam);
    if (!mapped) return;
    setSelectedSubject(mapped);
    setSelectedModule(0);
  }, [subjectParam]);

  useEffect(() => {
    const mapped = moduleSlugToIndex(moduleParam);
    if (mapped == null) return;
    setSelectedModule(mapped);
  }, [moduleParam]);

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
    const uid = user?.id ?? "anon";
    const key = `progressPerfect:${uid}:${selectedSubject}:${moduleName}`;
    try {
      const raw = window.localStorage.getItem(key);
      const arr = raw ? (JSON.parse(raw) as number[]) : [];
      setPerfectIds(Array.isArray(arr) ? arr : []);
    } catch {
      setPerfectIds([]);
    }
  }, [selectedModule, selectedSubject, user?.id]);

  useEffect(() => {
    const moduleName = modules[selectedModule]?.name ?? "Descoberta";
    const uid = user?.id ?? "anon";
    const key = `progressCompleted:${uid}:${selectedSubject}:${moduleName}`;
    try {
      const raw = window.localStorage.getItem(key);
      const arr = raw ? (JSON.parse(raw) as number[]) : [];
      setCompletedIds(Array.isArray(arr) ? arr : []);
    } catch {
      setCompletedIds([]);
    }
  }, [selectedModule, selectedSubject, user?.id]);

  useEffect(() => {
    try {
      const arr = modules.map((m) => {
        const count = Number(moduleProgressCount[m.name] ?? 0);
        return count >= 40;
      });
      setCompletedModules(arr);
    } catch {
      setCompletedModules(new Array(modules.length).fill(false));
    }
  }, [moduleProgressCount, selectedSubject]);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    const run = async () => {
      const { data, error } = await supabase
        .from("user_module_progress")
        .select("module,subject,completed_lessons,completed")
        .eq("user_id", user.id)
        .eq("subject", selectedSubject);
      if (!mounted) return;
      if (error) {
        setModuleProgressCount({});
        return;
      }
      const map: Record<string, number> = {};
      for (const r of Array.isArray(data) ? data : []) {
        const name = String((r as { module?: string | null }).module ?? "");
        const cnt = Number((r as { completed_lessons?: number | null }).completed_lessons ?? 0);
        map[name] = Math.max(0, Math.min(40, cnt));
      }
      setModuleProgressCount(map);
    };
    run();
    return () => {
      mounted = false;
    };
  }, [selectedSubject, user?.id]);

  const lessons = useMemo(() => {
    const base = generateLessons(40, selectedSubject, moduleName);
    return base.map((l) => {
      if (isGuest) {
        return { ...l, completed: false, locked: true };
      }
      if (isFreeUser) {
        const completed = l.id === 1 && completedIds.includes(1);
        const locked = l.id !== 1;
        return { ...l, completed, locked };
      }
      const count = Number(moduleProgressCount[moduleName] ?? 0);
      const completed = l.id <= count || completedIds.includes(l.id);
      const locked = false;
      return { ...l, completed, locked };
    });
  }, [completedIds, isFreeUser, isGuest, moduleName, moduleProgressCount, selectedSubject]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto max-w-6xl px-4 py-10">
        {reduceMotion ? (
          <h1 className="text-3xl md:text-4xl font-display font-extrabold mb-8 text-center">Escolha seu módulo 📚</h1>
        ) : (
          <motion.h1
            className="text-3xl md:text-4xl font-display font-extrabold mb-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Escolha seu módulo 📚
          </motion.h1>
        )}

        {/* Module selector */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {modules.map((m, i) => {
            const cls = `rounded-2xl p-5 text-center transition-all ${
              completedModules[i]
                ? `bg-primary text-primary-foreground shadow-playful ${selectedModule === i ? "scale-105" : ""}`
                : selectedModule === i
                  ? `${m.gradient} text-primary-foreground shadow-playful scale-105`
                  : moduleLocks[i]
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                    : "bg-card shadow-card hover:shadow-hover"
            }`;
            const onClick = () => {
              if (moduleLocks[i]) return;
              setSelectedModule(i);
              navigate(`/modulos/${subjectIdToSlug(selectedSubject)}/${moduleNameToSlug(m.name)}`);
            };

            if (reduceMotion) {
              return (
                <button key={m.name} className={cls} onClick={onClick} type="button">
                  <span className="text-3xl block mb-1">{m.emoji}</span>
                  <span className="font-display font-bold text-sm">{m.name}</span>
                  <span className={`block text-xs ${selectedModule === i || completedModules[i] ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {m.age}
                  </span>
                  {moduleLocks[i] && <Lock className="w-4 h-4 mt-2 inline-block" />}
                </button>
              );
            }

            return (
              <motion.button key={m.name} className={cls} onClick={onClick} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} type="button">
                <span className="text-3xl block mb-1">{m.emoji}</span>
                <span className="font-display font-bold text-sm">{m.name}</span>
                <span className={`block text-xs ${selectedModule === i || completedModules[i] ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {m.age}
                </span>
                {moduleLocks[i] && <Lock className="w-4 h-4 mt-2 inline-block" />}
              </motion.button>
            );
          })}
        </div>

        {/* Subject tabs */}
        <div className="grid grid-cols-2 gap-3 mb-8 sm:flex sm:flex-wrap sm:justify-center">
          {subjects.map((s) => (
            <button
              key={s.id}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                selectedSubject === s.id
                  ? "bg-secondary text-primary-foreground shadow-playful"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              onClick={() => {
                const currentModule = modules[selectedModule]?.name ?? "Descoberta";
                navigate(`/modulos/${subjectIdToSlug(s.id)}/${moduleNameToSlug(currentModule)}`);
              }}
            >
              <s.icon className="w-4 h-4" />
              {s.name}
            </button>
          ))}
          <button
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-muted text-muted-foreground hover:bg-muted/80"
            onClick={() => navigate("/videos")}
          >
            Vídeos e Músicas
          </button>
          {!isGuest && (
            <button
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-muted text-muted-foreground hover:bg-muted/80"
              onClick={() => navigate("/modulos/livros-didaticos")}
              type="button"
            >
              <BookOpen className="w-4 h-4" />
              Livros Didáticos
            </button>
          )}
        </div>

        {/* Lesson map */}
        {reduceMotion ? (
          <div key={`${selectedModule}-${selectedSubject}`} className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-3">
            {lessons.map((lesson) => {
              const cls = `relative aspect-square rounded-2xl flex flex-col items-center justify-center font-bold transition-all ${
                lesson.completed
                  ? "bg-primary text-primary-foreground shadow-playful"
                  : lesson.locked
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                    : "bg-card shadow-card hover:shadow-hover text-foreground"
              }`;
              const icon = lesson.completed ? (
                <CheckCircle className="w-6 h-6 mb-0.5" />
              ) : lesson.locked ? (
                <Lock className="w-5 h-5 mb-0.5" />
              ) : (
                <Star className="w-5 h-5 mb-0.5 text-sun" />
              );
              const onClick = () => {
                if (isGuest) {
                  navigate("/login");
                  return;
                }
                if (lesson.locked) {
                  if (isFreeUser && lesson.id !== 1) navigate("/planos");
                  return;
                }
                navigate(`/licao?modulo=${encodeURIComponent(moduleName)}&materia=${encodeURIComponent(selectedSubject)}&licao=${lesson.id}`);
              };
              return (
                <button key={lesson.id} className={cls} onClick={onClick} type="button">
                  {icon}
                  <span className="text-xs">{lesson.id}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedModule}-${selectedSubject}`}
              className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {lessons.map((lesson, i) => {
                const cls = `relative aspect-square rounded-2xl flex flex-col items-center justify-center font-bold transition-all ${
                  lesson.completed
                    ? "bg-primary text-primary-foreground shadow-playful"
                    : lesson.locked
                      ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                      : "bg-card shadow-card hover:shadow-hover text-foreground"
                }`;
                const icon = lesson.completed ? (
                  <CheckCircle className="w-6 h-6 mb-0.5" />
                ) : lesson.locked ? (
                  <Lock className="w-5 h-5 mb-0.5" />
                ) : (
                  <Star className="w-5 h-5 mb-0.5 text-sun" />
                );
                const onClick = () => {
                  if (isGuest) {
                    navigate("/login");
                    return;
                  }
                  if (lesson.locked) {
                    if (isFreeUser && lesson.id !== 1) navigate("/planos");
                    return;
                  }
                  navigate(`/licao?modulo=${encodeURIComponent(moduleName)}&materia=${encodeURIComponent(selectedSubject)}&licao=${lesson.id}`);
                };
                return (
                  <motion.button
                    key={lesson.id}
                    className={cls}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.01 }}
                    whileHover={!lesson.locked ? { scale: 1.07, y: -3 } : {}}
                    whileTap={!lesson.locked ? { scale: 0.97 } : {}}
                    onClick={onClick}
                    type="button"
                  >
                    {icon}
                    <span className="text-xs">{lesson.id}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ModulesPage;
