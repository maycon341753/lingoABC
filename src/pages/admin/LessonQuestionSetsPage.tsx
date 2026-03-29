import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActionButtons, CrudTable, StatusBadge } from "./AdminUi";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type Row = {
  id: string;
  subject: string;
  phase: string;
  lesson_id: number;
  active: boolean;
  updated_at: string | null;
  questions: unknown;
};

const subjectOptions = [
  { id: "math", label: "Matemática" },
  { id: "port", label: "Português" },
  { id: "eng", label: "Inglês" },
];

const phaseOptions = ["Descoberta", "Construção", "Desenvolvimento", "Domínio"];

const isValidQuestions = (raw: unknown) => {
  if (!Array.isArray(raw) || raw.length === 0) return false;
  for (const q of raw) {
    if (typeof q !== "object" || q == null) return false;
    const rec = q as Record<string, unknown>;
    const type = String(rec.type ?? "");
    const question = typeof rec.question === "string" ? rec.question : "";
    if (!question) return false;
    if (type === "multiple_choice") {
      if (!Array.isArray(rec.options) || typeof rec.correct !== "number") return false;
      continue;
    }
    if (type === "drag_order") {
      if (!Array.isArray(rec.items) || !Array.isArray(rec.correctOrder)) return false;
      continue;
    }
    if (type === "complete_word") {
      if (typeof rec.word !== "string" || typeof rec.hint !== "string" || !Array.isArray(rec.missingIndices)) return false;
      continue;
    }
    if (type === "image_match") {
      if (!Array.isArray(rec.pairs) || !Array.isArray(rec.shuffledLabels)) return false;
      continue;
    }
    return false;
  }
  return true;
};

const LessonQuestionSetsPage = () => {
  const { loading, user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [subject, setSubject] = useState("math");
  const [phase, setPhase] = useState("Descoberta");
  const [lessonId, setLessonId] = useState(1);
  const [active, setActive] = useState(true);
  const [questionsText, setQuestionsText] = useState<string>("[]");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const title = useMemo(() => {
    const s = subjectOptions.find((x) => x.id === subject)?.label ?? subject;
    return `${s} • ${phase} • Lição ${lessonId}`;
  }, [lessonId, phase, subject]);

  const load = async () => {
    setBusy(true);
    const { data: rows } = await supabase
      .from("lesson_question_sets")
      .select("id,subject,phase,lesson_id,active,updated_at,questions")
      .order("subject")
      .order("phase")
      .order("lesson_id");
    setData((rows ?? []) as Row[]);
    setBusy(false);
  };

  useEffect(() => {
    if (loading) return;
    if (!user?.id) {
      navigate("/login");
      return;
    }
    if (!isSuperAdmin) {
      navigate("/admin/dashboard");
      return;
    }
    load();
  }, [isSuperAdmin, loading, navigate, user?.id]);

  const openCreate = () => {
    setEditingId(null);
    setSubject("math");
    setPhase("Descoberta");
    setLessonId(1);
    setActive(true);
    setQuestionsText("[]");
    setSaveError(null);
    setDialogOpen(true);
  };

  const openEdit = (r: Row) => {
    setEditingId(r.id);
    setSubject(String(r.subject ?? "math"));
    setPhase(String(r.phase ?? "Descoberta"));
    setLessonId(Number(r.lesson_id ?? 1));
    setActive(Boolean(r.active));
    try {
      setQuestionsText(JSON.stringify(r.questions ?? [], null, 2));
    } catch {
      setQuestionsText("[]");
    }
    setSaveError(null);
    setDialogOpen(true);
  };

  const save = async () => {
    setSaveError(null);
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(questionsText);
    } catch {
      setSaveError("JSON inválido.");
      return;
    }
    if (!isValidQuestions(parsed)) {
      setSaveError("Formato de questões inválido.");
      return;
    }
    const lid = Math.max(1, Math.min(40, Number(lessonId) || 1));
    setSaving(true);
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      subject,
      phase,
      lesson_id: lid,
      active,
      questions: parsed,
    };
    const r = await supabase.from("lesson_question_sets").upsert(payload, { onConflict: "subject,phase,lesson_id" });
    if (r.error) {
      setSaveError(r.error.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-extrabold">Questões das Lições 🧩</h1>
          <p className="text-muted-foreground font-bold text-sm">Conteúdo por matéria + módulo + lição (fallback automático se não existir).</p>
        </div>
        <Button className="rounded-xl font-bold bg-gradient-hero text-primary-foreground w-full sm:w-auto" onClick={openCreate}>
          Nova questão
        </Button>
      </div>

      {busy ? (
        <p className="text-muted-foreground font-bold">Carregando…</p>
      ) : (
        <CrudTable
          columns={["Matéria", "Módulo", "Lição", "Status", "Atualizado", "Ações"]}
          data={data}
          renderRow={(r) => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="p-3 sm:p-4 font-bold">{subjectOptions.find((x) => x.id === r.subject)?.label ?? r.subject}</td>
              <td className="p-3 sm:p-4">{r.phase}</td>
              <td className="p-3 sm:p-4">{r.lesson_id}</td>
              <td className="p-3 sm:p-4">
                <StatusBadge active={r.active} />
              </td>
              <td className="p-3 sm:p-4">{r.updated_at ? new Date(r.updated_at).toLocaleString("pt-BR") : "—"}</td>
              <ActionButtons
                onEdit={() => openEdit(r)}
                onDelete={async () => {
                  const del = await supabase.from("lesson_question_sets").delete().eq("id", r.id);
                  if (del.error) {
                    alert(del.error.message);
                    return;
                  }
                  setData((prev) => prev.filter((x) => x.id !== r.id));
                }}
              />
            </tr>
          )}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? `Editar: ${title}` : `Criar: ${title}`}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Matéria</Label>
                <select className="h-10 rounded-xl border bg-background px-3 text-sm font-bold" value={subject} onChange={(e) => setSubject(e.target.value)}>
                  {subjectOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Módulo</Label>
                <select className="h-10 rounded-xl border bg-background px-3 text-sm font-bold" value={phase} onChange={(e) => setPhase(e.target.value)}>
                  {phaseOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Lição (1–40)</Label>
                <Input className="rounded-xl" value={String(lessonId)} onChange={(e) => setLessonId(Number(e.target.value || "1"))} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input id="active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                <Label htmlFor="active">Ativo</Label>
              </div>
              <Button
                variant="outline"
                className="rounded-xl font-bold"
                type="button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(questionsText);
                    setQuestionsText(JSON.stringify(parsed, null, 2));
                  } catch {
                    setSaveError("JSON inválido.");
                  }
                }}
              >
                Formatar JSON
              </Button>
            </div>

            <div className="grid gap-2">
              <Label>Questões (JSON)</Label>
              <Textarea className="min-h-[320px] rounded-xl font-mono text-xs" value={questionsText} onChange={(e) => setQuestionsText(e.target.value)} />
              {saveError && <p className="text-sm font-bold text-destructive">{saveError}</p>}
            </div>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button className="bg-gradient-hero rounded-xl font-bold text-primary-foreground" type="button" onClick={save} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LessonQuestionSetsPage;
