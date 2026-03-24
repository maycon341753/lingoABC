import { useState, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, ArrowRight, Star, GripVertical } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import confetti from "@/lib/confetti";

type LessonType = "multiple_choice" | "drag_order" | "complete_word" | "image_match";

interface BaseQuestion {
  type: LessonType;
  question: string;
}

interface MultipleChoiceQ extends BaseQuestion {
  type: "multiple_choice";
  options: string[];
  correct: number;
}

interface DragOrderQ extends BaseQuestion {
  type: "drag_order";
  items: string[];
  correctOrder: string[];
}

interface CompleteWordQ extends BaseQuestion {
  type: "complete_word";
  word: string;
  hint: string;
  missingIndices: number[];
}

interface ImageMatchQ extends BaseQuestion {
  type: "image_match";
  pairs: { emoji: string; label: string }[];
  shuffledLabels: string[];
}

type Question = MultipleChoiceQ | DragOrderQ | CompleteWordQ | ImageMatchQ;

const sampleQuestions: Question[] = [
  { type: "multiple_choice", question: "Quanto é 2 + 3?", options: ["4", "5", "6", "3"], correct: 1 },
  {
    type: "drag_order",
    question: "Organize os números em ordem crescente:",
    items: ["3", "1", "4", "2"],
    correctOrder: ["1", "2", "3", "4"],
  },
  {
    type: "complete_word",
    question: "Complete a palavra:",
    word: "ESCOLA",
    hint: "Lugar onde estudamos",
    missingIndices: [1, 3, 5],
  },
  {
    type: "image_match",
    question: "Associe o animal ao nome em inglês:",
    pairs: [
      { emoji: "🐱", label: "Cat" },
      { emoji: "🐶", label: "Dog" },
      { emoji: "🐦", label: "Bird" },
      { emoji: "🐟", label: "Fish" },
    ],
    shuffledLabels: ["Dog", "Fish", "Cat", "Bird"],
  },
  { type: "multiple_choice", question: "Qual é a primeira letra do alfabeto?", options: ["B", "C", "A", "D"], correct: 2 },
  {
    type: "complete_word",
    question: "Complete a palavra:",
    word: "AMIGO",
    hint: "Pessoa querida",
    missingIndices: [0, 2, 4],
  },
  {
    type: "drag_order",
    question: "Organize as letras em ordem alfabética:",
    items: ["D", "B", "A", "C"],
    correctOrder: ["A", "B", "C", "D"],
  },
  { type: "multiple_choice", question: "Como se diz 'gato' em inglês?", options: ["Dog", "Cat", "Bird", "Fish"], correct: 1 },
];

// --- Sub-components for each lesson type ---

const MultipleChoice = ({
  q,
  answered,
  selected,
  onSelect,
}: {
  q: MultipleChoiceQ;
  answered: boolean;
  selected: number | null;
  onSelect: (i: number) => void;
}) => (
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
          onClick={() => onSelect(i)}
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
);

const DragOrder = ({
  q,
  answered,
  items,
  setItems,
  onSubmit,
}: {
  q: DragOrderQ;
  answered: boolean;
  items: string[];
  setItems: (v: string[]) => void;
  onSubmit: () => void;
}) => {
  const isCorrect = answered && JSON.stringify(items) === JSON.stringify(q.correctOrder);
  return (
    <div>
      <Reorder.Group axis="y" values={items} onReorder={answered ? () => {} : setItems} className="space-y-3">
        {items.map((item, i) => (
          <Reorder.Item
            key={item}
            value={item}
            className={`rounded-2xl p-4 text-lg font-bold flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all ${
              answered
                ? items[i] === q.correctOrder[i]
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-destructive/10 border-2 border-destructive"
                : "bg-background border-2 border-border hover:border-primary"
            }`}
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
            <span>{item}</span>
            {answered && items[i] === q.correctOrder[i] && <CheckCircle className="w-5 h-5 text-primary ml-auto" />}
            {answered && items[i] !== q.correctOrder[i] && <XCircle className="w-5 h-5 text-destructive ml-auto" />}
          </Reorder.Item>
        ))}
      </Reorder.Group>
      {!answered && (
        <Button className="mt-4 bg-gradient-hero font-bold rounded-2xl w-full py-5" onClick={onSubmit}>
          Confirmar ordem ✓
        </Button>
      )}
    </div>
  );
};

const CompleteWord = ({
  q,
  answered,
  letters,
  onLetterChange,
  onSubmit,
}: {
  q: CompleteWordQ;
  answered: boolean;
  letters: string[];
  onLetterChange: (idx: number, val: string) => void;
  onSubmit: () => void;
}) => (
  <div>
    <p className="text-center text-muted-foreground mb-6 font-bold">💡 Dica: {q.hint}</p>
    <div className="flex justify-center gap-2 mb-6 flex-wrap">
      {q.word.split("").map((char, i) => {
        const isMissing = q.missingIndices.includes(i);
        const letterIdx = q.missingIndices.indexOf(i);
        const userLetter = isMissing ? letters[letterIdx] || "" : char;
        const isCorrectLetter = answered && isMissing && userLetter.toUpperCase() === char;
        const isWrongLetter = answered && isMissing && userLetter.toUpperCase() !== char;

        return (
          <motion.div
            key={i}
            className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-extrabold border-2 transition-all ${
              !isMissing
                ? "bg-muted border-border"
                : answered
                ? isCorrectLetter
                  ? "bg-primary/10 border-primary"
                  : "bg-destructive/10 border-destructive"
                : "bg-background border-primary"
            }`}
            whileHover={isMissing && !answered ? { scale: 1.1 } : {}}
          >
            {isMissing ? (
              <input
                className="w-full h-full text-center text-2xl font-extrabold bg-transparent outline-none uppercase"
                maxLength={1}
                value={userLetter}
                onChange={(e) => onLetterChange(letterIdx, e.target.value)}
                disabled={answered}
              />
            ) : (
              char
            )}
          </motion.div>
        );
      })}
    </div>
    {!answered && (
      <Button className="bg-gradient-hero font-bold rounded-2xl w-full py-5" onClick={onSubmit}>
        Verificar ✓
      </Button>
    )}
  </div>
);

const ImageMatch = ({
  q,
  answered,
  matches,
  selectedEmoji,
  onSelectEmoji,
  onSelectLabel,
}: {
  q: ImageMatchQ;
  answered: boolean;
  matches: Record<string, string>;
  selectedEmoji: string | null;
  onSelectEmoji: (emoji: string) => void;
  onSelectLabel: (label: string) => void;
}) => (
  <div>
    <div className="grid grid-cols-2 gap-6">
      {/* Emojis column */}
      <div className="space-y-3">
        {q.pairs.map((p) => {
          const matched = matches[p.emoji];
          const correct = answered && matched === p.label;
          const wrong = answered && matched && matched !== p.label;
          return (
            <motion.button
              key={p.emoji}
              className={`w-full rounded-2xl p-4 text-4xl text-center border-2 transition-all ${
                selectedEmoji === p.emoji
                  ? "border-primary bg-primary/10 shadow-playful"
                  : matched
                  ? correct
                    ? "border-primary bg-primary/10"
                    : wrong
                    ? "border-destructive bg-destructive/10"
                    : "border-accent bg-accent/10"
                  : "border-border bg-background hover:border-primary"
              }`}
              onClick={() => !answered && onSelectEmoji(p.emoji)}
              whileHover={!answered ? { scale: 1.05 } : {}}
              whileTap={!answered ? { scale: 0.95 } : {}}
            >
              {p.emoji}
              {matched && <span className="block text-sm font-bold mt-1">{matched}</span>}
            </motion.button>
          );
        })}
      </div>
      {/* Labels column */}
      <div className="space-y-3">
        {q.shuffledLabels.map((label) => {
          const used = Object.values(matches).includes(label);
          return (
            <motion.button
              key={label}
              className={`w-full rounded-2xl p-4 text-lg font-bold border-2 transition-all ${
                used
                  ? "border-muted bg-muted opacity-50 cursor-not-allowed"
                  : "border-border bg-background hover:border-accent"
              }`}
              onClick={() => !answered && !used && onSelectLabel(label)}
              whileHover={!answered && !used ? { scale: 1.05 } : {}}
              disabled={used || answered}
            >
              {label}
            </motion.button>
          );
        })}
      </div>
    </div>
  </div>
);

// --- Main component ---

const LessonPage = () => {
  const [current, setCurrent] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // Multiple choice state
  const [mcSelected, setMcSelected] = useState<number | null>(null);

  // Drag order state
  const [dragItems, setDragItems] = useState<string[]>([]);

  // Complete word state
  const [wordLetters, setWordLetters] = useState<string[]>([]);

  // Image match state
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const q = sampleQuestions[current];
  const progress = ((current + (answered ? 1 : 0)) / sampleQuestions.length) * 100;

  const [lastCorrect, setLastCorrect] = useState(false);

  const initQuestion = useCallback((idx: number) => {
    const question = sampleQuestions[idx];
    setAnswered(false);
    setMcSelected(null);
    setLastCorrect(false);
    if (question.type === "drag_order") setDragItems([...question.items]);
    if (question.type === "complete_word") setWordLetters(new Array(question.missingIndices.length).fill(""));
    if (question.type === "image_match") {
      setMatches({});
      setSelectedEmoji(null);
    }
  }, []);

  const markCorrect = () => {
    setScore((s) => s + 20);
    setLastCorrect(true);
    confetti();
  };

  // Multiple choice
  const handleMcSelect = (idx: number) => {
    if (answered) return;
    setMcSelected(idx);
    setAnswered(true);
    if (idx === (q as MultipleChoiceQ).correct) markCorrect();
    else setLastCorrect(false);
  };

  // Drag order
  const handleDragSubmit = () => {
    setAnswered(true);
    if (JSON.stringify(dragItems) === JSON.stringify((q as DragOrderQ).correctOrder)) markCorrect();
    else setLastCorrect(false);
  };

  // Complete word
  const handleWordSubmit = () => {
    setAnswered(true);
    const cq = q as CompleteWordQ;
    const correct = cq.missingIndices.every((mi, i) => wordLetters[i]?.toUpperCase() === cq.word[mi]);
    if (correct) markCorrect();
    else setLastCorrect(false);
  };

  // Image match
  const handleSelectEmoji = (emoji: string) => {
    if (matches[emoji]) return;
    setSelectedEmoji(emoji);
  };
  const handleSelectLabel = (label: string) => {
    if (!selectedEmoji) return;
    const newMatches = { ...matches, [selectedEmoji]: label };
    setMatches(newMatches);
    setSelectedEmoji(null);
    const imq = q as ImageMatchQ;
    if (Object.keys(newMatches).length === imq.pairs.length) {
      setAnswered(true);
      const allCorrect = imq.pairs.every((p) => newMatches[p.emoji] === p.label);
      if (allCorrect) markCorrect();
      else setLastCorrect(false);
    }
  };

  const handleNext = () => {
    if (current < sampleQuestions.length - 1) {
      const next = current + 1;
      setCurrent(next);
      initQuestion(next);
    } else {
      setFinished(true);
    }
  };

  // Init first question on mount
  useState(() => {
    initQuestion(0);
  });

  if (finished) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-[70vh] px-4">
          <motion.div className="text-center" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
            <motion.div className="text-7xl mb-6" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 1, repeat: Infinity }}>🎉</motion.div>
            <h1 className="text-4xl font-display font-extrabold mb-4">Parabéns!</h1>
            <p className="text-xl text-muted-foreground mb-2">Você completou a lição!</p>
            <div className="flex items-center justify-center gap-2 mb-8">
              <Star className="w-8 h-8 text-sun fill-sun" />
              <span className="text-3xl font-extrabold">{score} pontos</span>
              <Star className="w-8 h-8 text-sun fill-sun" />
            </div>
            <Button size="lg" className="bg-gradient-hero font-bold rounded-2xl px-8 py-6 text-lg" onClick={() => { setCurrent(0); setScore(0); setFinished(false); initQuestion(0); }}>
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
            <span className="text-sm font-bold text-muted-foreground">Pergunta {current + 1}/{sampleQuestions.length}</span>
            <span className="text-sm font-bold text-sun flex items-center gap-1"><Star className="w-4 h-4 fill-sun" /> {score} pts</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-hero rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>

        {/* Question type badge */}
        <div className="flex justify-center mb-4">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-accent/20 text-accent">
            {q.type === "multiple_choice" && "📝 Múltipla Escolha"}
            {q.type === "drag_order" && "🔀 Arrastar e Ordenar"}
            {q.type === "complete_word" && "✏️ Completar Palavra"}
            {q.type === "image_match" && "🔗 Associação"}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="bg-card rounded-3xl shadow-card p-8 mb-6">
            <h2 className="text-2xl md:text-3xl font-display font-extrabold text-center mb-8">{q.question}</h2>

            {q.type === "multiple_choice" && (
              <MultipleChoice q={q} answered={answered} selected={mcSelected} onSelect={handleMcSelect} />
            )}
            {q.type === "drag_order" && (
              <DragOrder q={q} answered={answered} items={dragItems} setItems={setDragItems} onSubmit={handleDragSubmit} />
            )}
            {q.type === "complete_word" && (
              <CompleteWord
                q={q}
                answered={answered}
                letters={wordLetters}
                onLetterChange={(idx, val) => {
                  const copy = [...wordLetters];
                  copy[idx] = val;
                  setWordLetters(copy);
                }}
                onSubmit={handleWordSubmit}
              />
            )}
            {q.type === "image_match" && (
              <ImageMatch
                q={q}
                answered={answered}
                matches={matches}
                selectedEmoji={selectedEmoji}
                onSelectEmoji={handleSelectEmoji}
                onSelectLabel={handleSelectLabel}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Feedback + Next */}
        <AnimatePresence>
          {answered && (
            <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <motion.p className={`text-xl font-display font-bold mb-4 ${lastCorrect ? "text-primary" : "text-destructive"}`} initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                {lastCorrect ? "🎉 Correto! Muito bem!" : "😢 Ops! Tente a próxima!"}
              </motion.p>
              <Button size="lg" className="bg-gradient-hero font-bold rounded-2xl px-8 py-5" onClick={handleNext}>
                {current < sampleQuestions.length - 1 ? (<>Próxima <ArrowRight className="w-5 h-5 ml-2" /></>) : "Ver resultado 🏆"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LessonPage;
