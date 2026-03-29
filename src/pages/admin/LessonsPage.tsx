import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionButtons, CrudTable, StatusBadge } from "./AdminUi";
import { supabase } from "@/lib/supabase";

type ModuleOption = {
  id: string;
  title: string;
};

type LessonRow = {
  id: string;
  title: string;
  position: number;
  active: boolean;
  module_id: string;
  module_title: string;
};

type LessonSelectRow = {
  id: string;
  title: string;
  position: number;
  active: boolean;
  module_id: string;
  modules: { title: string } | null;
};

const LessonsPage = () => {
  const [lessonsData, setLessonsData] = useState<LessonRow[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonModuleId, setLessonModuleId] = useState<string>("");
  const [lessonPosition, setLessonPosition] = useState<number>(1);
  const [lessonActive, setLessonActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [{ data: modulesData }, { data: lessonsData }] = await Promise.all([
        supabase.from("modules").select("id,title").order("title"),
        supabase.from("lessons").select("id,title,position,active,module_id,modules(title)").order("position"),
      ]);
      if (!mounted) return;
      const mods = (modulesData ?? []) as ModuleOption[];
      setModules(mods);
      setLessonModuleId((prev) => prev || mods[0]?.id || "");
      const mapped: LessonRow[] =
        ((lessonsData ?? []) as LessonSelectRow[]).map((r) => ({
          id: r.id,
          title: r.title,
          position: r.position,
          active: r.active,
          module_id: r.module_id,
          module_title: r.modules?.title ?? "-",
        })) ?? [];
      setLessonsData(mapped);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-extrabold">Lições ⚙️</h1>
        <Button
          className="bg-gradient-hero rounded-xl font-bold"
          type="button"
          onClick={() => {
            const moduleId = lessonModuleId || modules[0]?.id || "";
            const nextPosition =
              Math.max(0, ...lessonsData.filter((l) => l.module_id === moduleId).map((l) => l.position)) + 1;
            setEditingLessonId(null);
            setLessonTitle("");
            setLessonModuleId(moduleId);
            setLessonPosition(nextPosition || 1);
            setLessonActive(true);
            setLessonDialogOpen(true);
          }}
        >
          Nova lição
        </Button>
      </div>

      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingLessonId ? "Editar lição" : "Criar lição"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="lessonTitle">Título</Label>
              <Input id="lessonTitle" className="rounded-xl" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lessonModule">Módulo</Label>
                <select
                  id="lessonModule"
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={lessonModuleId}
                  onChange={(e) => setLessonModuleId(e.target.value)}
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lessonPosition">Posição</Label>
                <Input
                  id="lessonPosition"
                  className="rounded-xl"
                  value={String(lessonPosition)}
                  onChange={(e) => setLessonPosition(Number(e.target.value || "1"))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <label className="flex items-center gap-3 rounded-xl border border-input bg-background px-3 py-2 h-10">
                <input type="checkbox" checked={lessonActive} onChange={(e) => setLessonActive(e.target.checked)} />
                <span className="text-sm font-bold">{lessonActive ? "Ativo" : "Inativo"}</span>
              </label>
            </div>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setLessonDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-hero rounded-xl font-bold"
              type="button"
              disabled={saving}
              onClick={async () => {
                if (!lessonTitle.trim()) {
                  alert("Informe um título.");
                  return;
                }
                if (!lessonModuleId) {
                  alert("Selecione um módulo.");
                  return;
                }

                setSaving(true);

                if (!editingLessonId) {
                  const ins = await supabase
                    .from("lessons")
                    .insert({ title: lessonTitle.trim(), module_id: lessonModuleId, position: lessonPosition, active: lessonActive })
                    .select("id,title,position,active,module_id")
                    .single();
                  if (ins.error) {
                    alert(ins.error.message);
                    setSaving(false);
                    return;
                  }
                  const moduleTitle = modules.find((m) => m.id === ins.data.module_id)?.title ?? "-";
                  setLessonsData((prev) =>
                    [...prev, { ...ins.data, module_title: moduleTitle } as LessonRow].sort((a, b) => a.position - b.position),
                  );
                  setSaving(false);
                  setLessonDialogOpen(false);
                  return;
                }

                const upd = await supabase
                  .from("lessons")
                  .update({ title: lessonTitle.trim(), module_id: lessonModuleId, position: lessonPosition, active: lessonActive })
                  .eq("id", editingLessonId);
                if (upd.error) {
                  alert(upd.error.message);
                  setSaving(false);
                  return;
                }
                setLessonsData((prev) =>
                  prev
                    .map((l) =>
                      l.id === editingLessonId
                        ? {
                            ...l,
                            title: lessonTitle.trim(),
                            module_id: lessonModuleId,
                            module_title: modules.find((m) => m.id === lessonModuleId)?.title ?? l.module_title,
                            position: lessonPosition,
                            active: lessonActive,
                          }
                        : l,
                    )
                    .sort((a, b) => a.position - b.position),
                );
                setSaving(false);
                setLessonDialogOpen(false);
              }}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CrudTable
        columns={["Título", "Módulo", "Posição", "Status"]}
        data={lessonsData}
        renderRow={(l) => (
          <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="p-3 sm:p-4 font-bold">{l.title}</td>
              <td className="p-3 sm:p-4">{l.module_title}</td>
              <td className="p-3 sm:p-4">{l.position}</td>
              <td className="p-3 sm:p-4">
              <StatusBadge active={l.active} />
            </td>
            <ActionButtons
              onEdit={() => {
                setEditingLessonId(l.id);
                setLessonTitle(l.title);
                setLessonModuleId(l.module_id);
                setLessonPosition(l.position);
                setLessonActive(l.active);
                setLessonDialogOpen(true);
              }}
              onDelete={async () => {
                const del = await supabase.from("lessons").delete().eq("id", l.id);
                if (del.error) {
                  alert(del.error.message);
                  return;
                }
                setLessonsData((prev) => prev.filter((x) => x.id !== l.id));
              }}
            />
          </tr>
        )}
      />
    </div>
  );
};

export default LessonsPage;
