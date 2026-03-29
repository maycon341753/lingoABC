import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ActionButtons, CrudTable } from "./AdminUi";

type BookRow = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  module: string | null;
  file_bucket: string;
  file_path: string;
  active: boolean;
  created_at: string;
};

type BookSelectRow = {
  id: string;
  title: string | null;
  description: string | null;
  subject: string | null;
  module: string | null;
  file_bucket: string | null;
  file_path: string | null;
  active: boolean | null;
  created_at: string;
};

const BUCKET = "didactic_books";

const DidacticBooksAdminPage = () => {
  const { isSuperAdmin } = useAuth();
  const [rows, setRows] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [active, setActive] = useState(true);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("didactic_books")
      .select("id,title,description,subject,module,file_bucket,file_path,active,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      alert(error.message);
      setRows([]);
      setLoading(false);
      return;
    }
    const mapped =
      ((data ?? []) as BookSelectRow[]).map((r) => ({
        id: r.id,
        title: String(r.title ?? ""),
        description: r.description ?? null,
        subject: r.subject ?? null,
        module: r.module ?? null,
        file_bucket: String(r.file_bucket ?? BUCKET),
        file_path: String(r.file_path ?? ""),
        active: Boolean(r.active ?? true),
        created_at: r.created_at,
      })) ?? [];
    setRows(mapped);
    setLoading(false);
  };

  useEffect(() => {
    loadRows().then(() => {});
  }, []);

  const uploadPdf = async () => {
    if (!pdfFile) return null;
    const maxBytes = 40 * 1024 * 1024;
    if (pdfFile.size > maxBytes) throw new Error("Arquivo muito grande. Envie um PDF de até 40 MB.");
    const safeName = pdfFile.name.replace(/\s+/g, "_").replace(/[^\w.\-()]+/g, "_");
    const uuid = typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now());
    const objectName = `pdfs/${uuid}-${safeName}`;
    const up = await supabase.storage.from(BUCKET).upload(objectName, pdfFile, { cacheControl: "3600", contentType: pdfFile.type || "application/pdf", upsert: false });
    if (up.error) throw new Error(up.error.message || "Falha no upload do PDF.");
    return { bucket: BUCKET, path: objectName };
  };

  const save = async () => {
    setErrorMsg(null);
    if (!isSuperAdmin) {
      setErrorMsg("Apenas super admin pode gerenciar livros.");
      return;
    }
    if (!title.trim()) {
      setErrorMsg("Informe um título.");
      return;
    }
    if (!editingId && !pdfFile) {
      setErrorMsg("Envie um PDF.");
      return;
    }
    setSaving(true);
    try {
      const uploaded = await uploadPdf();
      const fileBucket = uploaded?.bucket ?? null;
      const filePath = uploaded?.path ?? null;

      const rpc = await supabase.rpc("admin_upsert_didactic_book", {
        p_id: editingId,
        p_title: title.trim(),
        p_description: description || null,
        p_subject: subject || null,
        p_module: moduleName || null,
        p_active: active,
        p_file_bucket: fileBucket,
        p_file_path: filePath,
      });
      if (rpc.error) {
        const msg = String(rpc.error.message ?? "");
        const lower = msg.toLowerCase();
        const missingRpc = lower.includes("could not find the function") || lower.includes("pgrst202");
        if (!missingRpc) throw new Error(msg);

        const payload = {
          title: title.trim(),
          description: description || null,
          subject: subject || null,
          module: moduleName || null,
          active,
          ...(fileBucket && filePath ? { file_bucket: fileBucket, file_path: filePath } : {}),
        };
        const resp = editingId ? await supabase.from("didactic_books").update(payload).eq("id", editingId) : await supabase.from("didactic_books").insert({ ...payload, file_bucket: BUCKET, file_path: filePath });
        if (resp.error) throw new Error(resp.error.message);
      }

      setSaving(false);
      setEditOpen(false);
      setEditingId(null);
      setPdfFile(null);
      loadRows().then(() => {});
    } catch (e) {
      setSaving(false);
      setErrorMsg(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  };

  const remove = async (row: BookRow) => {
    if (!isSuperAdmin) {
      alert("Apenas super admin pode excluir.");
      return;
    }
    const rpc = await supabase.rpc("admin_delete_didactic_book", { p_id: row.id });
    if (rpc.error) {
      const msg = String(rpc.error.message ?? "");
      const lower = msg.toLowerCase();
      const missingRpc = lower.includes("could not find the function") || lower.includes("pgrst202");
      if (!missingRpc) {
        alert(msg);
        return;
      }
      const del = await supabase.from("didactic_books").delete().eq("id", row.id);
      if (del.error) {
        alert(del.error.message);
        return;
      }
    }
    setRows((prev) => prev.filter((x) => x.id !== row.id));
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-extrabold mb-6">Livros Didáticos ⚙️</h1>

      <div className="mb-4">
        <Button
          className="rounded-xl bg-gradient-hero font-bold"
          onClick={() => {
            setEditingId(null);
            setTitle("");
            setDescription("");
            setSubject("");
            setModuleName("");
            setActive(true);
            setPdfFile(null);
            setErrorMsg(null);
            setEditOpen(true);
          }}
        >
          Novo livro (PDF)
        </Button>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingId(null);
            setPdfFile(null);
            setSaving(false);
            setErrorMsg(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar livro" : "Novo livro"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {errorMsg ? <p className="text-sm font-bold text-destructive">{errorMsg}</p> : null}
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" className="rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Descrição</Label>
              <Input id="desc" className="rounded-xl" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">Matéria</Label>
                <select id="subject" className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-bold" value={subject} onChange={(e) => setSubject(e.target.value)}>
                  <option value="">—</option>
                  <option value="math">Matemática</option>
                  <option value="port">Português</option>
                  <option value="eng">Inglês</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="module">Módulo</Label>
                <select id="module" className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-bold" value={moduleName} onChange={(e) => setModuleName(e.target.value)}>
                  <option value="">—</option>
                  <option value="Descoberta">Descoberta</option>
                  <option value="Construção">Construção</option>
                  <option value="Desenvolvimento">Desenvolvimento</option>
                  <option value="Domínio">Domínio</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <label className="flex items-center gap-3 rounded-xl border border-input bg-background px-3 py-2 h-10">
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                  <span className="text-sm font-bold">{active ? "Ativo" : "Inativo"}</span>
                </label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pdf">PDF</Label>
              <input
                id="pdf"
                type="file"
                accept="application/pdf"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                onChange={(e) => {
                  setErrorMsg(null);
                  setPdfFile(e.target.files?.[0] ?? null);
                }}
              />
              {editingId ? <p className="text-xs text-muted-foreground font-bold">Envie um novo PDF apenas se quiser substituir.</p> : null}
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button className="bg-gradient-hero rounded-xl font-bold" type="button" onClick={save} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <p className="text-muted-foreground font-bold">Carregando…</p>
      ) : (
        <CrudTable
          columns={["Título", "Matéria", "Módulo", "Ativo", "Criado em"]}
          data={rows}
          renderRow={(r) => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="p-4 font-bold">{r.title}</td>
              <td className="p-4">{r.subject ?? "—"}</td>
              <td className="p-4">{r.module ?? "—"}</td>
              <td className="p-4">{r.active ? "Sim" : "Não"}</td>
              <td className="p-4">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
              <ActionButtons
                onEdit={() => {
                  setEditingId(r.id);
                  setTitle(r.title);
                  setDescription(r.description ?? "");
                  setSubject(r.subject ?? "");
                  setModuleName(r.module ?? "");
                  setActive(r.active);
                  setPdfFile(null);
                  setErrorMsg(null);
                  setEditOpen(true);
                }}
                onDelete={() => remove(r)}
              />
            </tr>
          )}
        />
      )}
    </div>
  );
};

export default DidacticBooksAdminPage;

