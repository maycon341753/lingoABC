import { useEffect, useState } from "react";
import { ActionButtons, CrudTable, StatusBadge } from "./AdminUi";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type SubscriptionSelectRow = {
  id: string;
  status: string | null;
  value: number | null;
  expires_at: string | null;
  user_id?: string | null;
  profiles: { name: string | null; email?: string | null; cpf?: string | null } | null;
  plans: { name: string | null } | null;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  user: string;
  plan: string;
  value: number;
  status: string;
  expires: string;
};

type SubscriptionCycleRow = {
  id: string;
  status: string | null;
  value: number | null;
  started_at: string | null;
  expires_at: string | null;
  plans: { name: string | null } | null;
};

type UserDetailRow = {
  id: string;
  name: string | null;
  cpf: string | null;
  role: string | null;
};

type AuthUserRow = {
  email: string | null;
};

const SubscriptionsPage = () => {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<{ id: string; name: string; email: string; cpf: string; role: string } | null>(null);
  const [detailCycles, setDetailCycles] = useState<SubscriptionCycleRow[]>([]);

  const loadRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id,user_id,status,value,expires_at,profiles(name),plans(name)")
      .order("expires_at", { ascending: false });
    if (error) {
      alert(error.message);
      setRows([]);
      setLoading(false);
      return;
    }
    const mapped =
      ((data ?? []) as SubscriptionSelectRow[]).map((s) => ({
        id: s.id,
        user_id: String(s.user_id ?? ""),
        user: s.profiles?.name ?? "-",
        plan: s.plans?.name ?? "-",
        value: Number(s.value ?? 0),
        status: s.status ?? "-",
        expires: s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "—",
      })) ?? [];
    setRows(mapped);
    setLoading(false);
  };

  const openDetails = async (userId: string) => {
    if (!userId) return;
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailUser(null);
    setDetailCycles([]);
    try {
      const [profileRes, cyclesRes, authRes] = await Promise.all([
        supabase.from("profiles").select("id,name,cpf,role").eq("id", userId).maybeSingle(),
        supabase
          .from("subscriptions")
          .select("id,status,value,started_at,expires_at,plans(name)")
          .eq("user_id", userId)
          .order("expires_at", { ascending: false, nullsFirst: false })
          .limit(12),
        supabase.from("v_admin_users").select("email").eq("user_id", userId).maybeSingle(),
      ]);

      if (profileRes.error) throw new Error(profileRes.error.message);
      if (cyclesRes.error) throw new Error(cyclesRes.error.message);
      if (authRes.error && authRes.error.code !== "PGRST116") throw new Error(authRes.error.message);

      const p = (profileRes.data ?? null) as UserDetailRow | null;
      const email = String(((authRes.data ?? null) as AuthUserRow | null)?.email ?? "");
      setDetailUser({
        id: userId,
        name: String(p?.name ?? "—"),
        email: email || "—",
        cpf: String(p?.cpf ?? "—"),
        role: String(p?.role ?? "—"),
      });
      setDetailCycles(((cyclesRes.data ?? []) as SubscriptionCycleRow[]) ?? []);
      setDetailLoading(false);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Falha ao carregar detalhes");
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadRows().then(() => {});
    return () => {
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-display font-extrabold mb-6">Assinaturas ⚙️</h1>
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes da assinatura</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-muted-foreground font-bold">Carregando…</p>
          ) : detailError ? (
            <p className="text-destructive font-bold">{detailError}</p>
          ) : (
            <div className="space-y-6">
              <div className="bg-muted/30 border border-border rounded-2xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground font-bold">Nome</span>
                    <span className="font-bold text-right">{detailUser?.name ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground font-bold">E-mail</span>
                    <span className="font-bold text-right break-all">{detailUser?.email ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground font-bold">CPF</span>
                    <span className="font-bold text-right">{detailUser?.cpf ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground font-bold">Role</span>
                    <span className="font-bold text-right">{detailUser?.role ?? "—"}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-display font-extrabold text-lg mb-3">Últimos ciclos</h3>
                {detailCycles.length === 0 ? (
                  <p className="text-muted-foreground font-bold">Sem ciclos encontrados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left p-4 font-bold text-muted-foreground">Plano</th>
                          <th className="text-left p-4 font-bold text-muted-foreground">Status</th>
                          <th className="text-left p-4 font-bold text-muted-foreground">Início</th>
                          <th className="text-left p-4 font-bold text-muted-foreground">Vencimento</th>
                          <th className="text-right p-4 font-bold text-muted-foreground">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailCycles.map((c) => {
                          const st = String(c.status ?? "").toLowerCase();
                          const active = st === "active" || st === "ativa";
                          const started = c.started_at ? new Date(c.started_at).toLocaleDateString("pt-BR") : "—";
                          const expires = c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—";
                          const value = Number(c.value ?? 0);
                          return (
                            <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="p-4 font-bold">{c.plans?.name ?? "—"}</td>
                              <td className="p-4">
                                <StatusBadge active={active} activeLabel="Ativa" inactiveLabel={c.status ?? "—"} />
                              </td>
                              <td className="p-4">{started}</td>
                              <td className="p-4">{expires}</td>
                              <td className="p-4 text-right">{`R$ ${value.toFixed(2)}`}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setDetailOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {loading ? (
        <p className="text-muted-foreground font-bold">Carregando…</p>
      ) : (
        <CrudTable
          columns={["Usuário", "Plano", "Valor", "Status", "Vencimento"]}
          data={rows}
          renderRow={(s) => (
            <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="p-4 font-bold">{s.user}</td>
              <td className="p-4">{s.plan}</td>
              <td className="p-4">R$ {s.value.toFixed(2)}</td>
              <td className="p-4">
                <StatusBadge active={(s.status ?? "").toLowerCase() === "ativa" || (s.status ?? "").toLowerCase() === "active"} activeLabel="Ativa" inactiveLabel="Expirada" />
              </td>
              <td className="p-4">{s.expires}</td>
              <ActionButtons
                onView={() => openDetails(s.user_id)}
                onDelete={async () => {
                  const del = await supabase.from("subscriptions").delete().eq("id", s.id);
                  if (del.error) {
                    alert(del.error.message);
                    return;
                  }
                  setRows((prev) => prev.filter((x) => x.id !== s.id));
                }}
              />
            </tr>
          )}
        />
      )}
    </div>
  );
};

export default SubscriptionsPage;
