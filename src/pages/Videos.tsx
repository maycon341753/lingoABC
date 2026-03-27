import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { supabase } from "@/lib/supabase";

type MediaRow = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  module: string | null;
  bucket: string;
  object_name: string;
  thumb_name: string | null;
  duration_seconds: number | null;
  is_music: boolean;
};

const VideosPage = () => {
  const [items, setItems] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const ordered = useMemo(() => {
    const vids = items.filter((i) => !i.is_music);
    const mus = items.filter((i) => i.is_music);
    return [...vids, ...mus];
  }, [items]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("videos_media").select("*").eq("active", true).order("created_at", { ascending: false });
      if (!mounted) return;
      setItems(data ?? []);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-display font-extrabold mb-6 text-center">Vídeos e Músicas</h1>
        {loading ? (
          <p className="text-center text-muted-foreground font-bold">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground font-bold">Nenhum conteúdo disponível</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ordered.map((it) => {
              const { data: pub } = supabase.storage.from(it.bucket).getPublicUrl(it.object_name);
              const url = pub.publicUrl;
              return (
                <div key={it.id} className="bg-card rounded-2xl shadow-card overflow-hidden">
                  <div className="aspect-video bg-muted">
                    {it.is_music ? (
                      <audio controls src={url} className="w-full h-12" />
                    ) : (
                      <video controls src={url} className="w-full h-full" />
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h2 className="font-display font-bold">{it.title}</h2>
                    {it.description && <p className="text-sm text-muted-foreground">{it.description}</p>}
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {it.subject && <span>{it.subject}</span>}
                      {it.module && <span>• {it.module}</span>}
                      {it.duration_seconds != null && <span>• {Math.round(it.duration_seconds / 60)} min</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default VideosPage;
