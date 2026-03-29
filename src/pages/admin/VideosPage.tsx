import { useEffect, useState } from "react";
import { ActionButtons, CrudTable } from "./AdminUi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type VideoMediaRow = {
  id: string;
  title: string;
  description?: string | null;
  subject?: string | null;
  module: string | null;
  is_music: boolean;
  active: boolean;
  bucket: string;
  object_name: string;
  thumb_name?: string | null;
};

const VideosPage = () => {
  const { user, isAdmin } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [isMusic, setIsMusic] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStartedAt, setUploadStartedAt] = useState<number | null>(null);
  const [uploadElapsedSec, setUploadElapsedSec] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editModuleName, setEditModuleName] = useState("");
  const [editIsMusic, setEditIsMusic] = useState(false);
  const [editActive, setEditActive] = useState(true);
  const [editBucket, setEditBucket] = useState<string | null>(null);
  const [editThumbName, setEditThumbName] = useState<string | null>(null);
  const [editThumbFile, setEditThumbFile] = useState<File | null>(null);
  const [rows, setRows] = useState<VideoMediaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("videos_media")
      .select("id,title,description,subject,module,is_music,active,bucket,object_name,thumb_name,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      alert(error.message);
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as VideoMediaRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadRows().then(() => {});
    return () => {
    };
  }, []);

  useEffect(() => {
    if (!uploading || uploadStartedAt == null) return;
    const id = window.setInterval(() => {
      setUploadElapsedSec(Math.floor((Date.now() - uploadStartedAt) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [uploadStartedAt, uploading]);

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-display font-extrabold mb-6">Vídeos ⚙️</h1>

      <div className="mb-6">
        <Button
          className="bg-gradient-hero rounded-xl font-bold"
          type="button"
          onClick={() => {
            setUploadError(null);
            setUploadOpen(true);
          }}
          disabled={!isAdmin}
        >
          Upload Vídeo/Música
        </Button>
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload de conteúdo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {uploadError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {uploadError}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="file">Arquivo</Label>
              <input
                id="file"
                type="file"
                accept="video/*,audio/*"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                onChange={(e) => {
                  setUploadError(null);
                  setFile(e.target.files?.[0] ?? null);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" className="rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" className="rounded-xl" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">Matéria</Label>
                <select
                  id="subject"
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="">—</option>
                  <option value="Português">Português</option>
                  <option value="Matemática">Matemática</option>
                  <option value="Inglês">Inglês</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="module">Módulo</Label>
                <select
                  id="module"
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                >
                  <option value="">—</option>
                  <option value="Descoberta">Descoberta</option>
                  <option value="Construção">Construção</option>
                  <option value="Desenvolvimento">Desenvolvimento</option>
                  <option value="Domínio">Domínio</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <label className="flex items-center gap-3 rounded-xl border border-input bg-background px-3 py-2 h-10">
                <input type="checkbox" checked={isMusic} onChange={(e) => setIsMusic(e.target.checked)} />
                <span className="text-sm font-bold">Conteúdo de música (áudio)</span>
              </label>
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setUploadOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-hero rounded-xl font-bold"
              type="button"
              onClick={async () => {
                setUploadError(null);

                if (!isAdmin) {
                  setUploadError("Você não tem permissão para enviar arquivos.");
                  return;
                }
                if (!user) {
                  setUploadError("Você precisa estar logado para enviar arquivos.");
                  return;
                }
                if (!file || !title.trim()) {
                  setUploadError("Selecione um arquivo e informe o título.");
                  return;
                }

                const maxBytes = 50 * 1024 * 1024;
                if (file.size > maxBytes) {
                  setUploadError("Arquivo muito grande. Tente um arquivo menor (até 50 MB).");
                  return;
                }

                try {
                  setUploading(true);
                  setUploadStartedAt(Date.now());
                  setUploadElapsedSec(0);

                  const safeName = file.name
                    .replace(/\s+/g, "_")
                    .replace(/[^\w.\-()]+/g, "_");
                  const uuid =
                    typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID
                      ? globalThis.crypto.randomUUID()
                      : String(Date.now());
                  const objectName = `uploads/${uuid}-${safeName}`;

                  const up = await supabase.storage.from("videos_music").upload(objectName, file, {
                    cacheControl: "3600",
                    contentType: file.type || undefined,
                    upsert: false,
                  });
                  if (up.error) {
                    const msg = up.error.message || "Falha no upload.";
                    if (msg.toLowerCase().includes("row-level security") || msg.toLowerCase().includes("rls")) {
                      setUploadError(
                        "Permissão negada para upload. No Supabase: Storage → Policies do bucket videos_music → permitir INSERT/UPDATE/DELETE para admin/super_admin.",
                      );
                    } else if (msg.toLowerCase().includes("http2") || msg.toLowerCase().includes("protocol")) {
                      setUploadError(
                        `Falha de rede (HTTP/2). Tente: 1) renomear o arquivo sem espaços, 2) enviar um arquivo menor (ex.: < 20MB), 3) testar upload direto no Supabase Storage. Detalhe: ${msg}`,
                      );
                    } else {
                      setUploadError(msg);
                    }
                    return;
                  }

                  const ins = await supabase.from("videos_media").insert({
                    title: title.trim(),
                    description: description || null,
                    subject: subject || null,
                    module: moduleName || null,
                    bucket: "videos_music",
                    object_name: objectName,
                    is_music: isMusic,
                    active: true,
                    owner_id: user.id,
                  });
                  if (ins.error) {
                    setUploadError(ins.error.message);
                    return;
                  }

                  await loadRows();
                  setUploadOpen(false);
                  setFile(null);
                  setTitle("");
                  setDescription("");
                  setSubject("");
                  setModuleName("");
                  setIsMusic(false);
                } catch (e) {
                  const message = (e as Error)?.message || "Falha ao enviar o arquivo.";
                  setUploadError(
                    message.toLowerCase().includes("http2") || message.toLowerCase().includes("protocol")
                      ? `Falha de rede (HTTP/2). Tente enviar um arquivo menor/compactado e verifique se o upload funciona no painel do Supabase Storage. Detalhe: ${message}`
                      : message,
                  );
                } finally {
                  setUploading(false);
                  setUploadStartedAt(null);
                }
              }}
              disabled={uploading}
            >
              {uploading
                ? `Enviando... (${String(Math.floor(uploadElapsedSec / 60)).padStart(2, "0")}:${String(uploadElapsedSec % 60).padStart(2, "0")})`
                : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <p className="text-muted-foreground font-bold">Carregando…</p>
      ) : (
        <CrudTable
          columns={["Título", "Módulo", "Tipo", "Status"]}
          data={rows}
          renderRow={(v) => (
            <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="p-3 sm:p-4 font-bold">{v.title}</td>
              <td className="p-3 sm:p-4">{v.module ?? "—"}</td>
              <td className="p-3 sm:p-4">{v.is_music ? "Música" : "Vídeo"}</td>
              <td className="p-3 sm:p-4">{v.active ? "Ativo" : "Inativo"}</td>
              <ActionButtons
                onEdit={() => {
                  setEditError(null);
                  setEditingId(v.id);
                  setEditTitle(v.title ?? "");
                  setEditDescription(v.description ?? "");
                  setEditSubject(v.subject ?? "");
                  setEditModuleName(v.module ?? "");
                  setEditIsMusic(Boolean(v.is_music));
                  setEditActive(Boolean(v.active));
                  setEditBucket(v.bucket ?? null);
                  setEditThumbName((v.thumb_name ?? null) as string | null);
                  setEditThumbFile(null);
                  setEditOpen(true);
                }}
                onDelete={async () => {
                  const del = await supabase.from("videos_media").delete().eq("id", v.id);
                  if (del.error) {
                    alert(del.error.message);
                    return;
                  }
                  setRows((prev) => prev.filter((x) => x.id !== v.id));
                }}
              />
            </tr>
          )}
        />
      )}

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditError(null);
            setEditSaving(false);
            setEditingId(null);
            setEditBucket(null);
            setEditThumbName(null);
            setEditThumbFile(null);
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar vídeo/música</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {editError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {editError}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="editTitle">Título</Label>
              <Input id="editTitle" className="rounded-xl" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editDescription">Descrição</Label>
              <Input id="editDescription" className="rounded-xl" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="editSubject">Matéria</Label>
                <select
                  id="editSubject"
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                >
                  <option value="">—</option>
                  <option value="Português">Português</option>
                  <option value="Matemática">Matemática</option>
                  <option value="Inglês">Inglês</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editModule">Módulo</Label>
                <select
                  id="editModule"
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={editModuleName}
                  onChange={(e) => setEditModuleName(e.target.value)}
                >
                  <option value="">—</option>
                  <option value="Descoberta">Descoberta</option>
                  <option value="Construção">Construção</option>
                  <option value="Desenvolvimento">Desenvolvimento</option>
                  <option value="Domínio">Domínio</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <label className="flex items-center gap-3 rounded-xl border border-input bg-background px-3 py-2 h-10">
                  <input type="checkbox" checked={editIsMusic} onChange={(e) => setEditIsMusic(e.target.checked)} />
                  <span className="text-sm font-bold">Conteúdo de música (áudio)</span>
                </label>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <label className="flex items-center gap-3 rounded-xl border border-input bg-background px-3 py-2 h-10">
                  <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                  <span className="text-sm font-bold">{editActive ? "Ativo" : "Inativo"}</span>
                </label>
              </div>
            </div>
            {editIsMusic && (
              <div className="grid gap-2">
                <Label htmlFor="editThumb">Foto de capa (música)</Label>
                {editBucket && editThumbName ? (
                  <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                    <img
                      alt={editTitle || "Capa"}
                      className="w-full h-40 object-cover"
                      src={supabase.storage.from(editBucket).getPublicUrl(editThumbName).data.publicUrl}
                    />
                  </div>
                ) : null}
                <input
                  id="editThumb"
                  type="file"
                  accept="image/*"
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  onChange={(e) => {
                    setEditError(null);
                    setEditThumbFile(e.target.files?.[0] ?? null);
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setEditOpen(false)} disabled={editSaving}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-hero rounded-xl font-bold"
              type="button"
              disabled={editSaving}
              onClick={async () => {
                setEditError(null);
                if (!isAdmin) {
                  setEditError("Você não tem permissão para editar.");
                  return;
                }
                if (!editingId) {
                  setEditError("Registro inválido.");
                  return;
                }
                if (!editTitle.trim()) {
                  setEditError("Informe um título.");
                  return;
                }
                setEditSaving(true);
                let nextThumb: string | null | undefined = editThumbName;
                if (editThumbFile && editBucket) {
                  const maxBytes = 3 * 1024 * 1024;
                  if (editThumbFile.size > maxBytes) {
                    setEditError("Imagem muito grande. Envie uma imagem menor (até 3 MB).");
                    setEditSaving(false);
                    return;
                  }
                  const safeName = editThumbFile.name.replace(/\s+/g, "_").replace(/[^\w.\-()]+/g, "_");
                  const uuid =
                    typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now());
                  const objectName = `thumbs/${uuid}-${safeName}`;
                  const up = await supabase.storage.from(editBucket).upload(objectName, editThumbFile, {
                    cacheControl: "3600",
                    contentType: editThumbFile.type || undefined,
                    upsert: false,
                  });
                  if (up.error) {
                    const msg = String(up.error.message ?? "");
                    const lower = msg.toLowerCase();
                    if (lower.includes("54001") || lower.includes("stack depth")) {
                      setEditError(
                        "Upload da capa: erro no banco (stack depth). Ajuste as policies do Storage (storage.objects) para permitir INSERT no bucket e evitar recursão em RLS.",
                      );
                    } else if (lower.includes("row-level security") || lower.includes("rls") || lower.includes("permission") || lower.includes("not authorized")) {
                      setEditError("Upload da capa: permissão negada. Ajuste as policies do Storage (storage.objects) para o bucket.");
                    } else {
                      setEditError(`Upload da capa: ${msg || "falha no upload"}`);
                    }
                    setEditSaving(false);
                    return;
                  }
                  nextThumb = objectName;
                }
                const payload = {
                  title: editTitle.trim(),
                  description: editDescription || null,
                  subject: editSubject || null,
                  module: editModuleName || null,
                  is_music: editIsMusic,
                  active: editActive,
                  thumb_name: editIsMusic ? (nextThumb ?? null) : null,
                };

                const rpc = await supabase.rpc("admin_update_videos_media", {
                  p_id: editingId,
                  p_title: payload.title,
                  p_description: payload.description,
                  p_subject: payload.subject,
                  p_module: payload.module,
                  p_is_music: payload.is_music,
                  p_active: payload.active,
                  p_thumb_name: payload.thumb_name,
                });

                if (rpc.error) {
                  const msg = String(rpc.error.message ?? "");
                  const lower = msg.toLowerCase();
                  const missingRpc = lower.includes("could not find the function") || lower.includes("pgrst202");
                  if (!missingRpc) {
                    setEditError(`Salvar dados: ${msg}`);
                    setEditSaving(false);
                    return;
                  }

                  const upd = await supabase.from("videos_media").update(payload).eq("id", editingId);
                  if (upd.error) {
                    setEditError(`Salvar dados: ${upd.error.message}`);
                    setEditSaving(false);
                    return;
                  }
                }
                setRows((prev) =>
                  prev.map((r) =>
                    r.id === editingId
                      ? {
                          ...r,
                          ...payload,
                        }
                      : r,
                  ),
                );
                setEditSaving(false);
                setEditOpen(false);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideosPage;
