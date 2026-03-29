import { useEffect, useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import mascot from "@/assets/mascot-owl.png";
import { useSeo } from "@/lib/useSeo";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

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

const subjectLabel = (v: string | null) => {
  const s = String(v ?? "").toLowerCase().trim();
  if (s === "math") return "Matemática";
  if (s === "port") return "Português";
  if (s === "eng") return "Inglês";
  return null;
};

const DidacticBooksPage = () => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const canonical = origin ? `${origin}/modulos/livros-didaticos` : "/modulos/livros-didaticos";
  useSeo({
    title: "Livros Didáticos | LingoABC",
    description: "Baixe livros didáticos em PDF para apoiar o aprendizado das crianças.",
    canonical,
    ogImage: mascot,
    noindex: true,
  });

  const [rows, setRows] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("didactic_books")
        .select("id,title,description,subject,module,file_bucket,file_path,active,created_at")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (error) {
        setRows([]);
        setLoading(false);
        return;
      }
      setRows((data ?? []) as BookRow[]);
      setLoading(false);
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const openPdf = async (row: BookRow) => {
    setOpeningId(row.id);
    const signed = await supabase.storage.from(row.file_bucket).createSignedUrl(row.file_path, 60 * 30);
    setOpeningId(null);
    if (signed.error || !signed.data?.signedUrl) {
      alert(signed.error?.message || "Não foi possível abrir o PDF.");
      return;
    }
    window.open(signed.data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 py-10">
        <div className="bg-card rounded-3xl shadow-card p-8">
          <h1 className="text-3xl font-display font-extrabold mb-2">Livros Didáticos</h1>
          <p className="text-muted-foreground font-bold mb-8">Materiais em PDF para apoiar o estudo em casa.</p>

          {loading ? (
            <p className="text-muted-foreground font-bold">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground font-bold">Nenhum livro disponível no momento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rows.map((r) => (
                <div key={r.id} className="bg-background rounded-2xl border border-border p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h2 className="font-display font-extrabold text-lg leading-tight">{r.title}</h2>
                    {subjectLabel(r.subject) ? (
                      <span className="text-[11px] font-extrabold px-2 py-1 rounded-full bg-muted text-muted-foreground">{subjectLabel(r.subject)}</span>
                    ) : null}
                  </div>
                  {r.module ? <p className="text-xs font-extrabold text-muted-foreground mb-2">{r.module}</p> : null}
                  {r.description ? <p className="text-sm text-muted-foreground font-bold mb-5">{r.description}</p> : <div className="h-5" />}
                  <Button className="bg-gradient-hero rounded-xl font-bold w-full" onClick={() => openPdf(r)} disabled={openingId === r.id}>
                    {openingId === r.id ? "Abrindo…" : "Abrir PDF"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DidacticBooksPage;

