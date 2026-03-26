import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type InvoiceItem = {
  id: string | null;
  invoiceUrl: string | null;
  description: string;
  billingType: string | null;
  value: number;
  status: string | null;
  dateCreated: string | null;
  paymentDate: string | null;
  confirmedDate: string | null;
  dueDate: string | null;
};

const buildApiUrl = (path: string) => {
  const base = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  if (!base) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

const formatBrl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const parseDate = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
};

const fmtDate = (iso: string | null) => {
  const d = parseDate(iso);
  if (!d) return "—";
  return d.toLocaleString("pt-BR");
};

const UserInvoicesPage = () => {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, navigate, user]);

  const totalPaid = useMemo(() => items.reduce((sum, it) => sum + Number(it.value || 0), 0), [items]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    let mounted = true;
    const load = async () => {
      setFetching(true);
      setError(null);

      let token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) token = (await supabase.auth.refreshSession()).data.session?.access_token;
      if (!token) {
        setFetching(false);
        setError("Faça login novamente.");
        return;
      }

      try {
        const r = await fetch(buildApiUrl("/api/asaas/invoices"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        });
        const j = await r.json().catch(() => null);
        if (!mounted) return;
        if (!r.ok) {
          const msg =
            typeof j?.error === "string" ? String(j.error) : typeof j?.message === "string" ? String(j.message) : `http_${r.status}`;
          setError(msg);
          setFetching(false);
          return;
        }
        const list = Array.isArray(j?.items) ? (j.items as InvoiceItem[]) : [];
        setItems(list);
      } catch {
        if (!mounted) return;
        setError("Falha de conexão com o servidor.");
      } finally {
        if (mounted) setFetching(false);
      }
    };

    load().then(() => {});
    return () => {
      mounted = false;
    };
  }, [loading, user]);

  if (!loading && !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="bg-card rounded-3xl shadow-card p-6">
          <div className="flex flex-col gap-1">
            <h1 className="font-display font-extrabold text-2xl">Faturas</h1>
            <p className="text-sm text-muted-foreground">Pagamentos confirmados e transações concluídas</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <div className="bg-background rounded-2xl border p-4 min-w-[220px]">
              <p className="text-xs text-muted-foreground font-bold">Total pago</p>
              <p className="text-2xl font-extrabold">R$ {formatBrl(totalPaid)}</p>
            </div>
            <div className="bg-background rounded-2xl border p-4 min-w-[220px]">
              <p className="text-xs text-muted-foreground font-bold">Transações</p>
              <p className="text-2xl font-extrabold">{items.length}</p>
            </div>
          </div>

          <div className="mt-6">
            {fetching ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : error ? (
              <p className="text-sm font-bold text-destructive">{error}</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma fatura paga encontrada.</p>
            ) : (
              <div className="grid gap-3">
                {items.map((it) => {
                  const displayDate = it.confirmedDate || it.paymentDate || it.dateCreated;
                  return (
                    <div key={it.id ?? `${it.description}-${displayDate ?? ""}`} className="bg-background rounded-2xl border p-5">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-bold">{it.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {it.billingType ?? "—"} • {fmtDate(displayDate)}
                          </p>
                          <p className="text-xs text-muted-foreground">Status: {it.status ?? "—"}</p>
                        </div>
                        <div className="flex flex-col items-start md:items-end gap-2">
                          <p className="text-lg font-extrabold">R$ {formatBrl(Number(it.value ?? 0))}</p>
                          {it.invoiceUrl ? (
                            <a
                              className="text-sm font-bold text-primary hover:underline"
                              href={it.invoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir fatura
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sem link</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserInvoicesPage;

