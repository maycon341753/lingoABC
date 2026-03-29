import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, ArrowRight, Star, GripVertical } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import confetti from "@/lib/confetti";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/useSeo";
import mascot from "@/assets/mascot-owl.png";

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

const hashSeed = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T,>(arr: T[], rand: () => number) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = a[i];
    a[i] = a[j] as T;
    a[j] = tmp as T;
  }
  return a;
};

const pickN = <T,>(pool: T[], n: number, rand: () => number) => {
  const s = shuffle(pool, rand);
  return s.slice(0, Math.min(n, s.length));
};

const clampInt = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.trunc(v)));

const genMathQuestions = (modulo: string, lessonId: number, rand: () => number): Question[] => {
  const phase = modulo.toLowerCase();
  const isDesc = phase === "descoberta";
  const isConst = phase === "construção" || phase === "construcao";
  const isDev = phase === "desenvolvimento";
  const step = Math.max(1, Math.min(40, Number(lessonId) || 1));
  const maxN = isDesc ? 5 + Math.floor((step - 1) / 10) * 5 : isConst ? 15 + Math.floor((step - 1) / 10) * 10 : isDev ? 30 + Math.floor((step - 1) / 10) * 20 : 80 + Math.floor((step - 1) / 10) * 40;

  const makeChoice = (correct: number) => {
    const opts = new Set<number>([correct]);
    let attempts = 0;
    while (opts.size < 4 && attempts < 100) {
      const delta = clampInt(Math.round((rand() - 0.5) * maxN * 2), -maxN * 2, maxN * 2);
      opts.add(clampInt(correct + delta, 0, Math.max(correct * 2 + 10, maxN * 2)));
      attempts++;
    }
    // Fallback if we couldn't generate enough unique options
    let fallback = correct + 1;
    while (opts.size < 4) {
      opts.add(fallback);
      fallback++;
    }
    return shuffle(Array.from(opts), rand).map(String);
  };

  const qs: Question[] = [];

  const addSub = () => {
    const op = isDesc ? (step <= 20 ? "+" : "-") : isConst ? (rand() < 0.55 ? "+" : "-") : rand() < 0.5 ? "+" : "-";
    const a = clampInt(Math.floor(rand() * (maxN + 1)), 0, maxN);
    const b = clampInt(Math.floor(rand() * (maxN + 1)), 0, maxN);
    const correct = op === "-" ? Math.max(0, a - b) : a + b;
    const options = makeChoice(correct);
    qs.push({
      type: "multiple_choice",
      question: `Lição ${step}: Quanto é ${a} ${op} ${b}?`,
      options,
      correct: options.findIndex((x) => Number(x) === correct),
    });
  };

  const multDiv = () => {
    const allowDiv = isDev || (!isDesc && !isConst);
    const op = allowDiv ? (rand() < 0.55 ? "×" : "÷") : "×";
    const aBase = clampInt(Math.floor(rand() * 10) + 2, 2, 12);
    const bBase = clampInt(Math.floor(rand() * 10) + 2, 2, 12);
    if (op === "÷") {
      const divisor = aBase;
      const factor = bBase;
      const dividend = divisor * factor;
      const correct = factor;
      const options = makeChoice(correct);
      qs.push({
        type: "multiple_choice",
        question: `Lição ${step}: Quanto é ${dividend} ÷ ${divisor}?`,
        options,
        correct: options.findIndex((x) => Number(x) === correct),
      });
      return;
    }
    const correct = aBase * bBase;
    const options = makeChoice(correct);
    qs.push({
      type: "multiple_choice",
      question: `Lição ${step}: Quanto é ${aBase} × ${bBase}?`,
      options,
      correct: options.findIndex((x) => Number(x) === correct),
    });
  };

  const compare = () => {
    const a = clampInt(Math.floor(rand() * (maxN + 1)), 0, maxN);
    const b = clampInt(Math.floor(rand() * (maxN + 1)), 0, maxN);
    const correct = a === b ? "=" : a > b ? ">" : "<";
    const options = shuffle(["<", ">", "="], rand);
    qs.push({
      type: "multiple_choice",
      question: `Lição ${step}: Complete: ${a} __ ${b}`,
      options,
      correct: options.findIndex((x) => x === correct),
    });
  };

  const missingNumber = () => {
    const a = clampInt(Math.floor(rand() * (maxN + 1)), 0, maxN);
    const b = clampInt(Math.floor(rand() * (maxN + 1)), 0, maxN);
    const sum = a + b;
    const hideLeft = rand() < 0.5;
    const correct = hideLeft ? a : b;
    const options = makeChoice(correct);
    qs.push({
      type: "multiple_choice",
      question: `Lição ${step}: Complete: ${hideLeft ? "?" : a} + ${hideLeft ? b : "?"} = ${sum}`,
      options,
      correct: options.findIndex((x) => Number(x) === correct),
    });
  };

  const wordProblem = () => {
    const a = clampInt(Math.floor(rand() * (maxN + 1)), 1, maxN);
    const b = clampInt(Math.floor(rand() * (maxN + 1)), 1, maxN);
    const add = rand() < 0.5;
    const correct = add ? a + b : Math.max(0, a - b);
    const options = makeChoice(correct);
    const q = add
      ? `Lição ${step}: Ana tinha ${a} figurinhas e ganhou ${b}. Quantas ficou?`
      : `Lição ${step}: João tinha ${a} balas e comeu ${b}. Quantas sobraram?`;
    qs.push({ type: "multiple_choice", question: q, options, correct: options.findIndex((x) => Number(x) === correct) });
  };

  const ordering = (n: number) => {
    const nums = Array.from({ length: n }, () => clampInt(Math.floor(rand() * (maxN + 1)), 0, maxN));
    const sorted = [...nums].sort((x, y) => x - y).map(String);
    qs.push({
      type: "drag_order",
      question: n === 4 ? `Organize em ordem crescente:` : `Ordene de menor para maior:`,
      items: shuffle(sorted, rand),
      correctOrder: sorted,
    });
  };

  if (isDesc) {
    for (let i = 0; i < 3; i += 1) addSub();
    compare();
    ordering(4);
    ordering(3);
    wordProblem();
    missingNumber();
    return qs.slice(0, 8);
  }

  if (isConst) {
    for (let i = 0; i < 3; i += 1) addSub();
    missingNumber();
    wordProblem();
    compare();
    ordering(4);
    ordering(3);
    return qs.slice(0, 8);
  }

  if (isDev) {
    multDiv();
    multDiv();
    addSub();
    wordProblem();
    compare();
    ordering(4);
    ordering(3);
    missingNumber();
    return qs.slice(0, 8);
  }

  multDiv();
  multDiv();
  addSub();
  wordProblem();
  missingNumber();
  compare();
  ordering(4);
  ordering(3);
  return qs.slice(0, 8);
};

const genPortQuestions = (modulo: string, lessonId: number, rand: () => number): Question[] => {
  const phase = modulo.toLowerCase();
  const bank =
    phase === "descoberta"
      ? [
          { word: "BOLA", hint: "Brinquedo redondo" },
          { word: "CASA", hint: "Lugar onde moramos" },
          { word: "GATO", hint: "Animal que mia" },
          { word: "SAPO", hint: "Animal que pula" },
          { word: "PATO", hint: "Animal que faz quá" },
        ]
      : phase === "construção" || phase === "construcao"
        ? [
            { word: "ESCOLA", hint: "Lugar onde estudamos" },
            { word: "AMIGO", hint: "Pessoa querida" },
            { word: "BANANA", hint: "Fruta amarela" },
            { word: "JANELA", hint: "Tem vidro na parede" },
            { word: "BICICLETA", hint: "Tem duas rodas" },
          ]
        : phase === "desenvolvimento"
          ? [
              { word: "AVENTURA", hint: "História cheia de ação" },
              { word: "BRINCADEIRA", hint: "Diversão entre amigos" },
              { word: "BIBLIOTECA", hint: "Lugar de livros" },
              { word: "ESPERANÇA", hint: "Sentimento positivo" },
              { word: "CURIOSIDADE", hint: "Vontade de saber" },
            ]
          : [
              { word: "RESPONSABILIDADE", hint: "Cumprir deveres" },
              { word: "COMUNICAÇÃO", hint: "Troca de informações" },
              { word: "CONHECIMENTO", hint: "Aquilo que aprendemos" },
              { word: "ORGANIZAÇÃO", hint: "Deixar tudo em ordem" },
              { word: "CRIATIVIDADE", hint: "Criar coisas novas" },
            ];
  const picked = bank[Math.floor(rand() * bank.length)] ?? bank[0]!;
  const word = picked.word;
  const missingCount = clampInt(phase === "descoberta" ? 1 : 3, 1, Math.min(4, word.length - 1));
  const indices = shuffle(
    Array.from({ length: word.length }, (_, i) => i).filter((i) => /[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ]/i.test(word[i] ?? "")),
    rand,
  ).slice(0, missingCount);
  const vowels = ["A", "E", "I", "O", "U"];
  const qs: Question[] = [
    {
      type: "complete_word",
      question: `Complete a palavra:`,
      word,
      hint: picked.hint,
      missingIndices: indices.sort((a, b) => a - b),
    },
    {
      type: "multiple_choice",
      question: `Qual destas é uma vogal?`,
      options: shuffle(["B", "R", vowels[Math.floor(rand() * vowels.length)] ?? "A", "T"], rand),
      correct: 0,
    },
    {
      type: "multiple_choice",
      question: `Quantas letras tem "${word}"?`,
      options: shuffle([String(word.length), String(word.length - 1), String(word.length + 1), String(word.length + 2)], rand),
      correct: 0,
    },
  ];
  const fruits = [
    { emoji: "🍎", label: "maçã" },
    { emoji: "🍌", label: "banana" },
    { emoji: "🍇", label: "uva" },
    { emoji: "🍊", label: "laranja" },
    { emoji: "🍉", label: "melancia" },
    { emoji: "🍓", label: "morango" },
  ];
  const animals = [
    { emoji: "🐱", label: "gato" },
    { emoji: "🐶", label: "cachorro" },
    { emoji: "🐦", label: "pássaro" },
    { emoji: "🐟", label: "peixe" },
    { emoji: "🐸", label: "sapo" },
    { emoji: "🦁", label: "leão" },
  ];
  const pairs = pickN(rand() < 0.5 ? fruits : animals, 4, rand);
  qs.push({
    type: "image_match",
    question: `Associe a figura ao nome:`,
    pairs,
    shuffledLabels: shuffle(pairs.map((p) => p.label), rand),
  });
  const letters = shuffle(["A", "B", "C", "D", "E", "F"], rand).slice(0, 4);
  qs.push({
    type: "drag_order",
    question: `Organize em ordem alfabética:`,
    items: shuffle(letters, rand),
    correctOrder: [...letters].sort(),
  });
  while (qs.length < 8) {
    const opt = shuffle(["sol", "mesa", "rato", "pato", "bola", "casa", "gato", "sapo"], rand).slice(0, 4);
    const correctWord = opt[Math.floor(rand() * opt.length)] ?? opt[0]!;
    const letter = (correctWord[0] ?? "S").toUpperCase();
    const options = shuffle(opt, rand);
    qs.push({
      type: "multiple_choice",
      question: `Qual palavra começa com "${letter}"?`,
      options,
      correct: options.findIndex((x) => x[0]?.toUpperCase() === letter),
    });
  }
  const titled = qs.map((q) => (q.type === "multiple_choice" ? { ...q, question: `Lição ${lessonId}: ${q.question}` } : q));
  return titled.slice(0, 8);
};

const genEngQuestions = (modulo: string, lessonId: number, rand: () => number): Question[] => {
  const phase = modulo.toLowerCase();
  const bank =
    phase === "descoberta"
      ? [
          { pt: "gato", en: "Cat", emoji: "🐱" },
          { pt: "cachorro", en: "Dog", emoji: "🐶" },
          { pt: "pássaro", en: "Bird", emoji: "🐦" },
          { pt: "peixe", en: "Fish", emoji: "🐟" },
        ]
      : phase === "construção" || phase === "construcao"
        ? [
            { pt: "maçã", en: "Apple", emoji: "🍎" },
            { pt: "banana", en: "Banana", emoji: "🍌" },
            { pt: "uva", en: "Grape", emoji: "🍇" },
            { pt: "laranja", en: "Orange", emoji: "🍊" },
          ]
        : phase === "desenvolvimento"
          ? [
              { pt: "azul", en: "Blue", emoji: "🔵" },
              { pt: "vermelho", en: "Red", emoji: "🔴" },
              { pt: "verde", en: "Green", emoji: "🟢" },
              { pt: "amarelo", en: "Yellow", emoji: "🟡" },
            ]
          : [
              { pt: "feliz", en: "Happy", emoji: "😊" },
              { pt: "triste", en: "Sad", emoji: "😢" },
              { pt: "rápido", en: "Fast", emoji: "⚡" },
              { pt: "lento", en: "Slow", emoji: "🐢" },
            ];
  const pairs = pickN(bank, 4, rand).map((x) => ({ emoji: x.emoji, label: x.en }));
  const qs: Question[] = [
    {
      type: "image_match",
      question: `Associe a figura à palavra:`,
      pairs,
      shuffledLabels: shuffle(pairs.map((p) => p.label), rand),
    },
  ];
  const target = bank[Math.floor(rand() * bank.length)] ?? bank[0]!;
  const opts = shuffle(bank.map((x) => x.en), rand).slice(0, 4);
  if (!opts.includes(target.en)) opts[0] = target.en;
  const options = shuffle(opts, rand);
  qs.push({
    type: "multiple_choice",
    question: `Lição ${lessonId}: Como se diz "${target.pt}" em inglês?`,
    options,
    correct: options.findIndex((x) => x === target.en),
  });
  const letters = shuffle(["A", "B", "C", "D"], rand);
  qs.push({
    type: "drag_order",
    question: `Ordene as letras:`,
    items: shuffle(letters, rand),
    correctOrder: [...letters].sort(),
  });
  const word = (target.en ?? "APPLE").toUpperCase();
  const missingIdx = shuffle(
    Array.from({ length: word.length }, (_, i) => i).filter((i) => /[A-Z]/.test(word[i] ?? "")),
    rand,
  ).slice(0, Math.min(3, Math.max(1, Math.floor(word.length / 2))));
  qs.push({
    type: "complete_word",
    question: `Complete a palavra:`,
    word,
    hint: `Tradução de "${target.pt}"`,
    missingIndices: missingIdx.sort((a, b) => a - b),
  });
  while (qs.length < 8) {
    const w = bank[Math.floor(rand() * bank.length)] ?? bank[0]!;
    const opt2 = shuffle(bank.map((x) => x.en), rand).slice(0, 4);
    if (!opt2.includes(w.en)) opt2[0] = w.en;
    const options2 = shuffle(opt2, rand);
    qs.push({
      type: "multiple_choice",
      question: `Lição ${lessonId}: Selecione "${w.en}"`,
      options: options2,
      correct: options2.findIndex((x) => x === w.en),
    });
  }
  return qs.slice(0, 8);
};

const generateQuestions = (materia: string, modulo: string, lessonId: number): Question[] => {
  const rand = mulberry32(hashSeed(`${materia}:${modulo}:${lessonId}`));
  if (materia === "math") return genMathQuestions(modulo, lessonId, rand);
  if (materia === "port") return genPortQuestions(modulo, lessonId, rand);
  return genEngQuestions(modulo, lessonId, rand);
};

const localizeEngText = (value: string) => {
  const s = String(value ?? "");
  if (!s) return s;
  if (/^match the picture to the word:?$/i.test(s.trim())) return "Associe a figura à palavra:";
  if (/^order letters:?$/i.test(s.trim())) return "Ordene as letras:";
  if (/^complete the word:?$/i.test(s.trim())) return "Complete a palavra:";
  const how = s.match(/^(Lição\s+\d+:\s+)?How do you say "([^"]+)" in English\?\s*$/i);
  if (how) {
    const prefix = how[1] ?? "";
    const pt = how[2] ?? "";
    return `${prefix}Como se diz "${pt}" em inglês?`;
  }
  const sel = s.match(/^(Lição\s+\d+:\s+)?Select\s+"([^"]+)"\s*$/i);
  if (sel) {
    const prefix = sel[1] ?? "";
    const en = sel[2] ?? "";
    return `${prefix}Selecione "${en}"`;
  }
  return s;
};

const localizeEngQuestions = (qs: Question[]) =>
  qs.map((q) => {
    if (q.type === "complete_word") {
      const hint = String(q.hint ?? "");
      const m = hint.match(/^Translation of "([^"]+)"\s*$/i);
      const nextHint = m ? `Tradução de "${m[1] ?? ""}"` : hint;
      return { ...q, question: localizeEngText(q.question), hint: nextHint };
    }
    return { ...q, question: localizeEngText(q.question) };
  });

const coerceQuestions = (v: unknown): Question[] | null => {
  if (!Array.isArray(v)) return null;
  const out: Question[] = [];
  for (const item of v) {
    if (typeof item !== "object" || item == null) return null;
    const rec = item as Record<string, unknown>;
    const type = String(rec.type ?? "");
    const question = typeof rec.question === "string" ? rec.question : "";
    if (!question) return null;
    if (type === "multiple_choice") {
      const options = Array.isArray(rec.options) ? rec.options.map((x) => String(x)) : null;
      const correct = typeof rec.correct === "number" ? rec.correct : NaN;
      if (!options || !Number.isFinite(correct)) return null;
      out.push({ type: "multiple_choice", question, options, correct });
      continue;
    }
    if (type === "drag_order") {
      const items = Array.isArray(rec.items) ? rec.items.map((x) => String(x)) : null;
      const correctOrder = Array.isArray(rec.correctOrder) ? rec.correctOrder.map((x) => String(x)) : null;
      if (!items || !correctOrder) return null;
      out.push({ type: "drag_order", question, items, correctOrder });
      continue;
    }
    if (type === "complete_word") {
      const word = typeof rec.word === "string" ? rec.word : "";
      const hint = typeof rec.hint === "string" ? rec.hint : "";
      const missingIndices = Array.isArray(rec.missingIndices) ? rec.missingIndices.map((x) => Number(x)) : null;
      if (!word || !hint || !missingIndices || missingIndices.some((x) => !Number.isFinite(x))) return null;
      out.push({ type: "complete_word", question, word, hint, missingIndices });
      continue;
    }
    if (type === "image_match") {
      const pairsRaw = Array.isArray(rec.pairs) ? rec.pairs : null;
      const shuffledLabels = Array.isArray(rec.shuffledLabels) ? rec.shuffledLabels.map((x) => String(x)) : null;
      if (!pairsRaw || !shuffledLabels) return null;
      const pairs = pairsRaw.map((p) => {
        const pr = p as Record<string, unknown>;
        return { emoji: String(pr.emoji ?? ""), label: String(pr.label ?? "") };
      });
      if (pairs.some((p) => !p.emoji || !p.label)) return null;
      out.push({ type: "image_match", question, pairs, shuffledLabels });
      continue;
    }
    return null;
  }
  return out;
};

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
  const { loading, user, hasSubscription } = useAuth();
  const [subActive, setSubActive] = useState<boolean | null>(null);
  const [subChecked, setSubChecked] = useState(false);
  const [dbQuestions, setDbQuestions] = useState<Question[] | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const materia = (searchParams.get("materia") || "math").toLowerCase();
  const modulo = searchParams.get("modulo") || "Descoberta";
  const lessonId = Number(searchParams.get("licao") || "1");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/licao";
  const canonical = origin ? `${origin}${path}` : path;
  const materiaLabel = materia === "math" ? "Matemática" : materia === "port" ? "Português" : "Inglês";
  useSeo({
    title: `Lição ${lessonId} — ${materiaLabel} (${modulo}) | LingoABC`,
    description: "Lição interativa da LingoABC. Faça login para salvar o progresso e liberar conteúdos.",
    canonical,
    ogImage: mascot,
    noindex: true,
  });

  const getUid = useCallback(async () => {
    if (user?.id) return user.id;
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    const run = async () => {
      setSubActive(null);
      setSubChecked(false);
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
      if (mounted) {
        setSubActive(active);
        setSubChecked(true);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const effectiveHasSubscription = subActive ?? hasSubscription;
    if (lessonId === 1) return;
    if (loading) return;
    if (!user) return;
    if (effectiveHasSubscription) return;
    if (subActive == null && !subChecked) return;
    if (!effectiveHasSubscription) {
      window.location.href = "/planos";
    }
  }, [hasSubscription, loading, subActive, subChecked, user, lessonId]);

  useEffect(() => {
    let mounted = true;
    setDbQuestions(null);
    const run = async () => {
      try {
        const { data, error } = await supabase
          .from("lesson_question_sets")
          .select("questions")
          .eq("subject", materia)
          .eq("phase", modulo)
          .eq("lesson_id", lessonId)
          .eq("active", true)
          .limit(1)
          .maybeSingle();
        if (!mounted) return;
        if (error) return;
        const raw = (data as { questions?: unknown } | null)?.questions;
        const parsed = coerceQuestions(raw);
        if (parsed) setDbQuestions(parsed);
      } catch {
        if (!mounted) return;
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [lessonId, materia, modulo]);

  const questions: Question[] = useMemo(() => {
    const qs = dbQuestions ?? generateQuestions(materia, modulo, lessonId);
    if (materia === "eng") return localizeEngQuestions(qs);
    return qs;
  }, [dbQuestions, lessonId, materia, modulo]);

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

  const q = questions[current];
  const progress = ((current + (answered ? 1 : 0)) / questions.length) * 100;

  const [lastCorrect, setLastCorrect] = useState(false);

  const initQuestion = useCallback((idx: number) => {
    const question = questions[idx];
    setAnswered(false);
    setMcSelected(null);
    setLastCorrect(false);
    if (question.type === "drag_order") setDragItems([...question.items]);
    if (question.type === "complete_word") setWordLetters(new Array(question.missingIndices.length).fill(""));
    if (question.type === "image_match") {
      setMatches({});
      setSelectedEmoji(null);
    }
  }, [questions]);

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
    if (current < questions.length - 1) {
      const next = current + 1;
      setCurrent(next);
      initQuestion(next);
    } else {
      setFinished(true);
    }
  };

  useEffect(() => {
    setCurrent(0);
    initQuestion(0);
  }, [initQuestion]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const uid = await getUid();
      if (!uid) return;
      try {
        const completedKey = `progressCompleted:${uid}:${materia}:${modulo}`;
        const raw = window.localStorage.getItem(completedKey);
        const arr = raw ? (JSON.parse(raw) as number[]) : [];
        const anonKey = `progressCompleted:anon:${materia}:${modulo}`;
        const anonRaw = window.localStorage.getItem(anonKey);
        const anonArr = anonRaw ? (JSON.parse(anonRaw) as number[]) : [];
        const isDone =
          (Array.isArray(arr) && arr.includes(lessonId)) || (Array.isArray(anonArr) && anonArr.includes(lessonId));
        if (!isDone) return;
        const lessonKey = `pointsLesson:${uid}:${materia}:${modulo}:${lessonId}`;
        const anonLessonKey = `pointsLesson:anon:${materia}:${modulo}:${lessonId}`;
        const savedScore = Math.max(
          Number(window.localStorage.getItem(lessonKey) || "0"),
          Number(window.localStorage.getItem(anonLessonKey) || "0"),
        );
        if (!mounted) return;
        setScore(savedScore);
        setCurrent(Math.max(0, questions.length - 1));
        setAnswered(true);
        setFinished(true);
      } catch {
        return;
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [getUid, lessonId, materia, modulo, questions.length]);

  useEffect(() => {
    if (!finished) return;
    const run = async () => {
      try {
        const allPoints = questions.length * 20;
        const anonPerfectKey = `progressPerfect:anon:${materia}:${modulo}`;
        const anonRaw = window.localStorage.getItem(anonPerfectKey);
        const anonArr = anonRaw ? (JSON.parse(anonRaw) as number[]) : [];
        if (score === allPoints && Array.isArray(anonArr) && !anonArr.includes(lessonId)) {
          anonArr.push(lessonId);
          window.localStorage.setItem(anonPerfectKey, JSON.stringify(anonArr));
        }
        const uid = await getUid();
        if (uid) {
          const perfectKey = `progressPerfect:${uid}:${materia}:${modulo}`;
          const raw = window.localStorage.getItem(perfectKey);
          const arr = raw ? (JSON.parse(raw) as number[]) : [];
          if (score === allPoints && Array.isArray(arr) && !arr.includes(lessonId)) {
            arr.push(lessonId);
            window.localStorage.setItem(perfectKey, JSON.stringify(arr));
          }
        }
      } catch {
        return;
      }
    };
    run();
  }, [finished, getUid, lessonId, materia, modulo, questions.length, score]);

  useEffect(() => {
    if (!finished) return;
    const run = async () => {
      const uid = await getUid();
      if (!uid) return;
      let token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) token = (await supabase.auth.refreshSession()).data.session?.access_token;
      const countRow = await supabase
        .from("user_module_progress")
        .select("id,completed_lessons")
        .eq("user_id", uid)
        .eq("subject", materia)
        .eq("module", modulo)
        .maybeSingle();
      const prevCount = Number(((countRow.data as { completed_lessons?: number | null } | null)?.completed_lessons ?? 0));
      const nextCount = Math.max(prevCount, lessonId);
      await supabase
        .from("user_module_progress")
        .upsert(
          {
            user_id: uid,
            subject: materia,
            module: modulo,
            completed_lessons: nextCount,
            completed: nextCount >= 40,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,subject,module" },
        );
      const lessonKey = `pointsLesson:${uid}:${materia}:${modulo}:${lessonId}`;
      const prevLesson = Number(window.localStorage.getItem(lessonKey) || "0");
      const nextLesson = Math.max(prevLesson, Number(score || 0));
      const payload = {
        user_id: uid,
        subject: materia,
        module: modulo,
        lesson_id: lessonId,
        status: "completed",
        score: nextLesson,
      };
      const up = await supabase.from("user_activity_progress").upsert(payload, { onConflict: "user_id,subject,module,lesson_id" });
      if (up.error) {
        await supabase.from("user_activity_progress").insert(payload);
      }

      if (token) {
        try {
          const host = typeof window !== "undefined" ? window.location.hostname : "";
          const base = host === "localhost" || host === "127.0.0.1" ? "" : String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
          const url = `${base}${"/api/user/sync-progress"}`;
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              activities: [
                {
                  subject: materia,
                  module: modulo,
                  lesson_id: lessonId,
                  status: "completed",
                  score: nextLesson,
                },
              ],
              moduleProgress: [{ subject: materia, module: modulo, completed_lessons: nextCount, completed: nextCount >= 40 }],
            }),
          });
        } catch {
          void 0;
        }
      }
    };
    run();
  }, [finished, getUid, lessonId, materia, modulo, score]);

  useEffect(() => {
    if (!finished) return;
    const run = async () => {
      const writeFor = (uidKey: string) => {
        const key = `pointsTotal:${uidKey}`;
        const lessonKey = `pointsLesson:${uidKey}:${materia}:${modulo}:${lessonId}`;
        const prevLesson = Number(window.localStorage.getItem(lessonKey) || "0");
        const nextLesson = Math.max(prevLesson, Number(score || 0));
        window.localStorage.setItem(lessonKey, String(nextLesson));
        const curTotal = Number(window.localStorage.getItem(key) || "0");
        const delta = nextLesson - prevLesson;
        if (delta > 0) window.localStorage.setItem(key, String(curTotal + delta));
      };
      writeFor("anon");
      const uid = await getUid();
      if (uid) writeFor(uid);
    };
    run();
  }, [finished, getUid, lessonId, materia, modulo, score]);

  useEffect(() => {
    if (!finished) return;
    const run = async () => {
      const writeFor = (uidKey: string) => {
        const completedKey = `progressCompleted:${uidKey}:${materia}:${modulo}`;
        const raw = window.localStorage.getItem(completedKey);
        let arr = raw ? (JSON.parse(raw) as number[]) : [];
        if (!Array.isArray(arr)) arr = [];
        if (!arr.includes(lessonId)) {
          arr.push(lessonId);
        }
        window.localStorage.setItem(completedKey, JSON.stringify(arr));
      };
      writeFor("anon");
      const uid = await getUid();
      if (uid) writeFor(uid);
    };
    run();
  }, [finished, getUid, lessonId, materia, modulo]);

  if (finished) {
    const modulesOrder = ["Descoberta", "Construção", "Desenvolvimento", "Domínio"];
    const currentIdx = Math.max(0, modulesOrder.findIndex((m) => m === modulo));
    const nextModule = currentIdx >= 0 && currentIdx < modulesOrder.length - 1 ? modulesOrder[currentIdx + 1] : null;
    const handleGoNextModule = () => {
      if (!loading && user && !hasSubscription) {
        navigate("/planos");
        return;
      }
      if (nextModule) {
        navigate(`/licao?modulo=${encodeURIComponent(nextModule)}&materia=${encodeURIComponent(materia)}&licao=1`);
      } else {
        navigate("/modulos");
      }
    };
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-[70vh] px-4">
          <motion.div className="w-full max-w-2xl" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-muted-foreground">Pergunta {questions.length}/{questions.length}</span>
                <span className="text-sm font-bold text-sun flex items-center gap-1">
                  <Star className="w-4 h-4 fill-sun" /> {score} pts
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-hero rounded-full" style={{ width: "100%" }} />
              </div>
            </div>

            <div className="text-center">
            <motion.div className="text-7xl mb-6" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 1, repeat: Infinity }}>🎉</motion.div>
            <h1 className="text-4xl font-display font-extrabold mb-4">Parabéns!</h1>
            <p className="text-xl text-muted-foreground mb-2">Você completou a lição!</p>
            <div className="flex items-center justify-center gap-2 mb-8">
              <Star className="w-8 h-8 text-sun fill-sun" />
              <span className="text-3xl font-extrabold">{score} pontos</span>
              <Star className="w-8 h-8 text-sun fill-sun" />
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="bg-gradient-hero font-bold rounded-2xl px-8 py-6 text-lg" onClick={() => { setCurrent(0); setScore(0); setFinished(false); initQuestion(0); }}>
                Jogar novamente 🔄
              </Button>
              <Button size="lg" className="bg-gradient-hero font-bold rounded-2xl px-8 py-6 text-lg" onClick={handleGoNextModule}>
                Próximo módulo ▶️
              </Button>
            </div>
            </div>
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
            <span className="text-sm font-bold text-muted-foreground">Pergunta {current + 1}/{questions.length}</span>
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
                {current < questions.length - 1 ? (<>Próxima <ArrowRight className="w-5 h-5 ml-2" /></>) : "Ver resultado 🏆"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LessonPage;
