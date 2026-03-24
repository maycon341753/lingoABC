import { motion } from "framer-motion";
import { Trophy, Star, BookOpen, Flame, Target, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";

const stats = [
  { label: "Pontos", value: "1.250", icon: Star, color: "text-sun" },
  { label: "Lições", value: "15/40", icon: BookOpen, color: "text-primary" },
  { label: "Sequência", value: "7 dias", icon: Flame, color: "text-coral" },
  { label: "Medalhas", value: "4", icon: Medal, color: "text-lavender" },
];

const missions = [
  { title: "Complete 3 lições hoje", progress: 1, total: 3, reward: 50 },
  { title: "Acerte 5 seguidas", progress: 3, total: 5, reward: 30 },
  { title: "Estude Inglês", progress: 0, total: 1, reward: 20 },
];

const DashboardPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Welcome */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-display font-extrabold">
            Olá, estudante! 👋
          </h1>
          <p className="text-muted-foreground">Continue aprendendo e conquistando estrelas!</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="bg-card rounded-2xl shadow-card p-5 flex items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
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
          {/* Continue learning */}
          <motion.div
            className="lg:col-span-2 bg-gradient-hero rounded-3xl p-8 text-primary-foreground"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h2 className="font-display font-bold text-xl mb-2">Continue de onde parou 🎯</h2>
            <p className="text-primary-foreground/80 mb-1">Módulo Descoberta — Matemática</p>
            <p className="text-primary-foreground/80 text-sm mb-6">Lição 4: Somas até 10</p>
            <div className="h-3 bg-primary-foreground/20 rounded-full mb-4">
              <div className="h-full bg-primary-foreground rounded-full" style={{ width: "37%" }} />
            </div>
            <Button
              className="bg-card text-foreground font-bold rounded-xl hover:scale-105 transition-transform"
              onClick={() => navigate("/licao")}
            >
              Continuar aprendendo ▶️
            </Button>
          </motion.div>

          {/* Daily missions */}
          <motion.div
            className="bg-card rounded-3xl shadow-card p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-coral" /> Missões Diárias
            </h3>
            <div className="space-y-4">
              {missions.map((m) => (
                <div key={m.title}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold">{m.title}</span>
                    <span className="text-sun font-bold">+{m.reward}★</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div
                      className="h-full bg-gradient-hero rounded-full transition-all"
                      style={{ width: `${(m.progress / m.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {m.progress}/{m.total}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick access */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="font-display font-bold text-xl mb-4">Acesso rápido</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: "📐", label: "Matemática", onClick: () => navigate("/modulos") },
              { emoji: "📖", label: "Português", onClick: () => navigate("/modulos") },
              { emoji: "🌍", label: "Inglês", onClick: () => navigate("/modulos") },
              { emoji: "🏆", label: "Conquistas", onClick: () => {} },
            ].map((item) => (
              <motion.button
                key={item.label}
                className="bg-card rounded-2xl shadow-card p-6 text-center hover:shadow-hover transition-shadow"
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={item.onClick}
              >
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
