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
  module: string | null;
  is_music: boolean;
  active: boolean;
  bucket: string;
  object_name: string;
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
  const [rows, setRows] = useState<VideoMediaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("videos_media")
      .select("id,title,module,is_music,active,bucket,object_name,created_at")
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
      <h1 className="text-2xl font-display font-extrabold mb-6">Vídeos ⚙️</h1>

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
        <DialogContent className="sm:max-w-xl">
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
              <td className="p-4 font-bold">{v.title}</td>
              <td className="p-4">{v.module ?? "—"}</td>
              <td className="p-4">{v.is_music ? "Música" : "Vídeo"}</td>
              <td className="p-4">{v.active ? "Ativo" : "Inativo"}</td>
              <ActionButtons
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
    </div>
  );
};

export default VideosPage;
