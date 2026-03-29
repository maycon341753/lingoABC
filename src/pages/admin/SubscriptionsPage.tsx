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
  user_id: string | null;
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

type AdminUserRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  cpf: string | null;
  role: string | null;
};

type ActiveSubscriptionRpcRow = {
  id: string;
  user_id: string;
  user_name: string | null;
  plan_name: string | null;
  value: number | null;
  status: string | null;
  expires_at: string | null;
};

type UserProfileRpcRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  cpf: string | null;
  role: string | null;
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
    const rpc = await supabase.rpc("admin_active_subscriptions");
    if (rpc.error) {
      const msg = String(rpc.error.message ?? "").toLowerCase();
      if (msg.includes("not_allowed")) {
        alert("Sem permissão. Promova seu usuário para super_admin e faça logout/login.");
        setRows([]);
        setLoading(false);
        return;
      }
    }
    if (!rpc.error && Array.isArray(rpc.data)) {
      const data = rpc.data as ActiveSubscriptionRpcRow[];
      setRows(
        data.map((r) => ({
          id: String(r.id ?? ""),
          user_id: String(r.user_id ?? ""),
          user: String(r.user_name ?? "-"),
          plan: String(r.plan_name ?? "-"),
          value: Number(r.value ?? 0),
          status: String(r.status ?? "-"),
          expires: r.expires_at ? new Date(r.expires_at).toLocaleDateString("pt-BR") : "—",
        })),
      );
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("id,user_id,status,value,expires_at,plans(name)")
      .order("expires_at", { ascending: false });
    if (error) {
      alert(
        String(error.message ?? "").toLowerCase().includes("stack depth")
          ? "Erro no banco (stack depth). É necessário ajustar RLS/policies ou criar a função admin_active_subscriptions no Supabase."
          : error.message,
      );
      setRows([]);
      setLoading(false);
      return;
    }
    const nowMs = Date.now();
    const src = ((data ?? []) as SubscriptionSelectRow[]) ?? [];
    const activeOnly = src.filter((s) => {
      const st = String(s.status ?? "").toLowerCase().trim();
      const okStatus = st === "active" || st === "ativa" || st === "ativo" || st === "paid" || st === "confirmed" || st === "received";
      if (!okStatus) return false;
      const expIso = String(s.expires_at ?? "");
      if (!expIso) return true;
      const t = new Date(expIso).getTime();
      if (!Number.isFinite(t)) return true;
      return t > nowMs;
    });

    const userIds = Array.from(new Set(activeOnly.map((s) => String(s.user_id ?? "")).filter(Boolean)));
    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: usersData } = await supabase.from("v_admin_users").select("user_id,name").in("user_id", userIds);
      userMap =
        (Array.isArray(usersData) ? usersData : []).reduce<Record<string, string>>((acc, r) => {
          const row = r as { user_id?: string | null; name?: string | null };
          const id = String(row.user_id ?? "");
          if (id) acc[id] = String(row.name ?? "");
          return acc;
        }, {});
    }

    const mapped = activeOnly.map((s) => ({
      id: s.id,
      user_id: String(s.user_id ?? ""),
      user: userMap[String(s.user_id ?? "")] || "-",
      plan: s.plans?.name ?? "-",
      value: Number(s.value ?? 0),
      status: s.status ?? "-",
      expires: s.expires_at ? new Date(s.expires_at).toLocaleDateString("pt-BR") : "—",
    }));
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
      const [userRpc, cyclesRpc] = await Promise.all([
        supabase.rpc("admin_user_profile", { p_user_id: userId }),
        supabase.rpc("admin_user_subscription_cycles", { p_user_id: userId }),
      ]);
      if (userRpc.error || cyclesRpc.error) {
        const msg = String(userRpc.error?.message ?? cyclesRpc.error?.message ?? "").toLowerCase();
        if (msg.includes("not_allowed")) {
          throw new Error("Sem permissão. Promova seu usuário para super_admin e faça logout/login.");
        }
      }
      if (!userRpc.error && Array.isArray(userRpc.data) && userRpc.data.length > 0 && !cyclesRpc.error && Array.isArray(cyclesRpc.data)) {
        const u = (userRpc.data[0] ?? null) as UserProfileRpcRow | null;
        setDetailUser({
          id: userId,
          name: String(u?.name ?? "—"),
          email: String(u?.email ?? "—"),
          cpf: String(u?.cpf ?? "—"),
          role: String(u?.role ?? "—"),
        });
        setDetailCycles(((cyclesRpc.data ?? []) as SubscriptionCycleRow[]) ?? []);
        setDetailLoading(false);
        return;
      }

      const [userRes, cyclesRes] = await Promise.all([
        supabase.from("v_admin_users").select("user_id,name,email,cpf,role").eq("user_id", userId).maybeSingle(),
        supabase
          .from("subscriptions")
          .select("id,status,value,started_at,expires_at,plans(name)")
          .eq("user_id", userId)
          .order("expires_at", { ascending: false, nullsFirst: false })
          .limit(12),
      ]);

      if (userRes.error) throw new Error(userRes.error.message);
      if (cyclesRes.error) throw new Error(cyclesRes.error.message);

      const u = (userRes.data ?? null) as AdminUserRow | null;
      setDetailUser({
        id: userId,
        name: String(u?.name ?? "—"),
        email: String(u?.email ?? "—"),
        cpf: String(u?.cpf ?? "—"),
        role: String(u?.role ?? "—"),
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
