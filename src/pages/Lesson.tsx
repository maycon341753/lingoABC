import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, ArrowRight, Star } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import confetti from "@/lib/confetti";

interface Question {
  question: string;
  options: string[];
  correct: number;
  image?: string;
}

const sampleQuestions: Question[] = [
  { question: "Quanto é 2 + 3?", options: ["4", "5", "6", "3"], correct: 1 },
  { question: "Qual é a primeira letra do alfabeto?", options: ["B", "C", "A", "D"], correct: 2 },
  { question: "Como se diz 'gato' em inglês?", options: ["Dog", "Cat", "Bird", "Fish"], correct: 1 },
  { question: "Quanto é 7 - 4?", options: ["2", "4", "3", "5"], correct: 2 },
  { question: "Complete: _ola (saudação)", options: ["B", "H", "M", "C"], correct: 1 },
];

const LessonPage = () => {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = sampleQuestions[current];
  const isCorrect = selected === q.correct;
  const progress = ((current + (answered ? 1 : 0)) / sampleQuestions.length) * 100;

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === q.correct) {
      setScore((s) => s + 20);
      confetti();
    }
  };

  const handleNext = () => {
    if (current < sampleQuestions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-[70vh] px-4">
          <motion.div
            className="text-center"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring" }}
          >
            <motion.div
              className="text-7xl mb-6"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              🎉
            </motion.div>
            <h1 className="text-4xl font-display font-extrabold mb-4">Parabéns!</h1>
            <p className="text-xl text-muted-foreground mb-2">Você completou a lição!</p>
            <div className="flex items-center justify-center gap-2 mb-8">
              <Star className="w-8 h-8 text-sun fill-sun" />
              <span className="text-3xl font-extrabold">{score} pontos</span>
              <Star className="w-8 h-8 text-sun fill-sun" />
            </div>
            <Button
              size="lg"
              className="bg-gradient-hero font-bold rounded-2xl px-8 py-6 text-lg"
              onClick={() => {
                setCurrent(0);
                setSelected(null);
                setAnswered(false);
                setScore(0);
                setFinished(false);
              }}
            >
              Jogar novamente 🔄
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto max-w-2xl px-4 py-10">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-muted-foreground">
              Pergunta {current + 1}/{sampleQuestions.length}
            </span>
            <span className="text-sm font-bold text-sun flex items-center gap-1">
              <Star className="w-4 h-4 fill-sun" /> {score} pts
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-hero rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="bg-card rounded-3xl shadow-card p-8 mb-6"
          >
            <h2 className="text-2xl md:text-3xl font-display font-extrabold text-center mb-8">
              {q.question}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {q.options.map((opt, i) => {
                let style = "bg-background border-2 border-border hover:border-primary hover:shadow-hover";
                if (answered) {
                  if (i === q.correct) style = "bg-primary/10 border-2 border-primary";
                  else if (i === selected) style = "bg-destructive/10 border-2 border-destructive";
                  else style = "bg-muted border-2 border-border opacity-50";
                }

                return (
                  <motion.button
                    key={i}
                    className={`rounded-2xl p-5 text-lg font-bold transition-all ${style} flex items-center justify-between`}
                    onClick={() => handleSelect(i)}
                    whileHover={!answered ? { scale: 1.03 } : {}}
                    whileTap={!answered ? { scale: 0.97 } : {}}
                  >
                    <span>{opt}</span>
                    {answered && i === q.correct && <CheckCircle className="w-6 h-6 text-primary" />}
                    {answered && i === selected && i !== q.correct && <XCircle className="w-6 h-6 text-destructive" />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Feedback + Next */}
        <AnimatePresence>
          {answered && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <motion.p
                className={`text-xl font-display font-bold mb-4 ${isCorrect ? "text-primary" : "text-destructive"}`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
              >
                {isCorrect ? "🎉 Correto! Muito bem!" : "😢 Ops! Tente a próxima!"}
              </motion.p>
              <Button
                size="lg"
                className="bg-gradient-hero font-bold rounded-2xl px-8 py-5"
                onClick={handleNext}
              >
                {current < sampleQuestions.length - 1 ? (
                  <>Próxima <ArrowRight className="w-5 h-5 ml-2" /></>
                ) : (
                  "Ver resultado 🏆"
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LessonPage;
