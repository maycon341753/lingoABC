import { useEffect, useState } from "react";
import { ActionButtons, CrudTable, StatusBadge } from "./AdminUi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const buildApiUrl = (path: string) => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return path;
  }
  const base = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  if (!base) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

type AdminUsersViewRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  cpf: string | null;
  role: string | null;
  plan_name: string | null;
  subscription_status: string | null;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  cpf: string;
  role: string;
  plan: string;
  subscription_status: string | null;
};

type PlanRow = {
  id: string;
  name: string | null;
};

type SubscriptionEditRow = {
  id: string;
  plan_id: string | null;
  status: string | null;
  expires_at: string | null;
};

type SubscriptionCycleRow = {
  id: string;
  status: string | null;
  value: number | null;
  started_at: string | null;
  expires_at: string | null;
  plans: { name: string | null } | null;
};

type UserEmailsResponse = {
  ok?: boolean;
  emails?: Record<string, string>;
};

const UsersPage = () => {
  const CURRENT_PLAN = "__current_plan__";
  const LOADING_PLAN = "__loading_plan__";
  const [usersData, setUsersData] = useState<UserRow[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userCpf, setUserCpf] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [userPlanId, setUserPlanId] = useState<string>("");
  const [userPlanName, setUserPlanName] = useState("—");
  const [userStatus, setUserStatus] = useState<string>("—");
  const [subRowId, setSubRowId] = useState<string | null>(null);
  const [subPlanId, setSubPlanId] = useState<string | null>(null);
  const [subExpiresAt, setSubExpiresAt] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [subDirty, setSubDirty] = useState(false);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const { isSuperAdmin } = useAuth();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUsersViewRow | null>(null);
  const [detailCycles, setDetailCycles] = useState<SubscriptionCycleRow[]>([]);

  const fillMissingEmails = async (rows: UserRow[]) => {
    const ids = rows.filter((r) => !r.email || r.email === "-").map((r) => r.id);
    if (ids.length === 0) return;
    let token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) token = (await supabase.auth.refreshSession()).data.session?.access_token;
    if (!token) return;
    const r = await fetch(buildApiUrl("/api/admin/user-emails"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userIds: ids }),
    });
    const j = (await r.json().catch(() => null)) as UserEmailsResponse | null;
    const map = j?.emails ?? null;
    if (!map) return;
    setUsersData((prev) =>
      prev.map((u) => {
        const email = map[u.id];
        if (!email) return u;
        if (u.email && u.email !== "-") return u;
        return { ...u, email };
      }),
    );
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.from("v_admin_users").select("*").order("user_id");
      if (!mounted) return;
      const mapped =
        ((data ?? []) as AdminUsersViewRow[]).map((r) => ({
          id: r.user_id,
          name: r.name ?? "-",
          email: r.email ?? "-",
          cpf: r.cpf ?? "",
          role: r.role ?? "user",
          plan: r.plan_name ?? "—",
          subscription_status: r.subscription_status ?? null,
        })) ?? [];
      setUsersData(mapped);
      fillMissingEmails(mapped).then(() => {});
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.from("plans").select("id,name").order("period_months", { ascending: true });
      if (!mounted) return;
      setPlans(((data ?? []) as PlanRow[]) ?? []);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [isSuperAdmin]);

  const openDetails = async (userId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailUser(null);
    setDetailCycles([]);
    try {
      const [userRes, cyclesRes] = await Promise.all([
        supabase.from("v_admin_users").select("user_id,name,email,cpf,role,plan_name,subscription_status").eq("user_id", userId).maybeSingle(),
        supabase
          .from("subscriptions")
          .select("id,status,value,started_at,expires_at,plans(name)")
          .eq("user_id", userId)
          .order("expires_at", { ascending: false, nullsFirst: false })
          .limit(12),
      ]);
      if (userRes.error) throw new Error(userRes.error.message);
      if (cyclesRes.error) throw new Error(cyclesRes.error.message);
      const row = (userRes.data ?? null) as AdminUsersViewRow | null;
      if (row && (!row.email || row.email === "-")) {
        try {
          let token = (await supabase.auth.getSession()).data.session?.access_token;
          if (!token) token = (await supabase.auth.refreshSession()).data.session?.access_token;
          if (token) {
            const rr = await fetch(buildApiUrl("/api/admin/user-emails"), {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ userIds: [userId] }),
            });
            const jj = (await rr.json().catch(() => null)) as UserEmailsResponse | null;
            const email = jj?.emails?.[userId] ?? null;
            setDetailUser({ ...row, email: email || row.email });
          } else {
            setDetailUser(row);
          }
        } catch {
          setDetailUser(row);
        }
      } else {
        setDetailUser(row);
      }
      setDetailCycles(((cyclesRes.data ?? []) as SubscriptionCycleRow[]) ?? []);
      setDetailLoading(false);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Falha ao carregar detalhes");
      setDetailLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-display font-extrabold mb-6">Usuários ⚙️</h1>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do usuário</DialogTitle>
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
                    <span className="font-bold text-right">{detailUser?.cpf ? formatCpf(detailUser.cpf) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground font-bold">Role</span>
                    <span className="font-bold text-right">{detailUser?.role ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground font-bold">Plano</span>
                    <span className="font-bold text-right">{detailUser?.plan_name ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground font-bold">Status</span>
                    <span className="font-bold text-right">{detailUser?.subscription_status ?? "—"}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-display font-extrabold text-lg mb-3">Últimos ciclos de assinatura</h3>
                {detailCycles.length === 0 ? (
                  <p className="text-muted-foreground font-bold">Sem ciclos encontrados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[760px] w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left p-3 sm:p-4 font-bold text-muted-foreground">Plano</th>
                          <th className="text-left p-3 sm:p-4 font-bold text-muted-foreground">Status</th>
                          <th className="text-left p-3 sm:p-4 font-bold text-muted-foreground">Início</th>
                          <th className="text-left p-3 sm:p-4 font-bold text-muted-foreground">Vencimento</th>
                          <th className="text-right p-3 sm:p-4 font-bold text-muted-foreground">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailCycles.map((c) => {
                          const st = String(c.status ?? "").toLowerCase().trim();
                          const active = st === "active" || st === "ativa";
                          const started = c.started_at ? new Date(c.started_at).toLocaleDateString("pt-BR") : "—";
                          const expires = c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—";
                          const value = Number(c.value ?? 0);
                          return (
                            <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="p-3 sm:p-4 font-bold">{c.plans?.name ?? "—"}</td>
                              <td className="p-3 sm:p-4">
                                <StatusBadge active={active} activeLabel="Ativa" inactiveLabel={c.status ?? "—"} />
                              </td>
                              <td className="p-3 sm:p-4">{started}</td>
                              <td className="p-3 sm:p-4">{expires}</td>
                              <td className="p-3 sm:p-4 text-right">{`R$ ${value.toFixed(2)}`}</td>
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

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="userName">Nome</Label>
              <Input id="userName" className="rounded-xl" value={userName} onChange={(e) => setUserName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="userEmail">Email</Label>
              <Input id="userEmail" type="email" className="rounded-xl" value={userEmail} readOnly />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="userCpf">CPF</Label>
                <Input
                  id="userCpf"
                  className="rounded-xl"
                  value={formatCpf(userCpf)}
                  onChange={(e) => setUserCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  inputMode="numeric"
                  maxLength={14}
                  readOnly
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="userRole">Role</Label>
                <select
                  id="userRole"
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="super_admin">super_admin</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="userPlan">Plano</Label>
                <select
                  id="userPlan"
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={userPlanId || ""}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setUserPlanId(nextId);
                    if (nextId === "") setUserStatus("—");
                    if (nextId !== CURRENT_PLAN && nextId !== LOADING_PLAN) setSubDirty(true);
                    if (nextId === "" || nextId === CURRENT_PLAN || nextId === LOADING_PLAN) return;
                    const nextName = plans.find((p) => p.id === nextId)?.name ?? "—";
                    setUserPlanName(nextName || "—");
                  }}
                  disabled={!isSuperAdmin}
                >
                  {!isSuperAdmin ? (
                    <option value="">{userPlanName}</option>
                  ) : (
                    <>
                      <option value="">Nenhum plano</option>
                      {planLoading && (
                        <option value={LOADING_PLAN} disabled>
                          Carregando…
                        </option>
                      )}
                      {!planLoading && userPlanName !== "—" && !subPlanId && (
                        <option value={CURRENT_PLAN} disabled>
                          Atual: {userPlanName}
                        </option>
                      )}
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name ?? p.id}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                {!isSuperAdmin ? (
                  <Input className="rounded-xl" value={userStatus || "—"} readOnly />
                ) : (
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    value={userStatus}
                    onChange={(e) => {
                      setUserStatus(e.target.value);
                      setSubDirty(true);
                    }}
                  >
                    <option value="—">—</option>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="canceled">canceled</option>
                    <option value="expired">expired</option>
                    <option value="trial">trial</option>
                  </select>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-hero rounded-xl font-bold"
              type="button"
              onClick={async () => {
                if (editingUserId === null) {
                  setUserDialogOpen(false);
                  return;
                }
                const profileRpc = await supabase.rpc("admin_update_profile", {
                  p_user_id: editingUserId,
                  p_name: userName || null,
                  p_role: userRole || null,
                });
                if (profileRpc.error) {
                  const msg = String(profileRpc.error.message ?? "");
                  const lower = msg.toLowerCase();
                  const missingRpc = lower.includes("could not find the function") || lower.includes("pgrst202");
                  if (!missingRpc) {
                    alert(msg);
                    return;
                  }
                  const upd = await supabase
                    .from("profiles")
                    .update({ name: userName || null, role: userRole || null })
                    .eq("id", editingUserId);
                  if (upd.error) {
                    const m = String(upd.error.message ?? "");
                    if (m.toLowerCase().includes("stack depth")) alert("Erro no banco (stack depth) ao salvar perfil. Crie a função admin_update_profile no Supabase.");
                    else alert(m);
                    return;
                  }
                }

                if (isSuperAdmin && subDirty) {
                  const nextStatusRaw = (userStatus || "—").trim();
                  const planChoice = userPlanId || "";
                  const choseNone = planChoice === "";
                  const choseCurrent = planChoice === CURRENT_PLAN || planChoice === LOADING_PLAN;
                  const nextPlanId = choseCurrent ? subPlanId : planChoice || null;
                  const nextStatus = nextStatusRaw;
                  const wantsDelete = choseNone;
                  if (nextStatus !== "—" || nextPlanId || subRowId) {
                    const planRpc = await supabase.rpc("admin_set_user_plan", {
                      p_user_id: editingUserId,
                      p_plan_id: wantsDelete ? null : nextPlanId,
                      p_status: wantsDelete ? null : nextStatus === "—" ? null : nextStatus,
                    });
                    if (planRpc.error) {
                      const msg = String(planRpc.error.message ?? "");
                      const lower = msg.toLowerCase();
                      const missingRpc = lower.includes("could not find the function") || lower.includes("pgrst202");
                      if (!missingRpc) {
                        if (lower.includes("stack depth")) alert("Erro no banco (stack depth) ao salvar plano. Crie a função admin_set_user_plan no Supabase.");
                        else alert(msg);
                        return;
                      }

                      const nowIso = new Date().toISOString();
                      const nextExpiresAt = nextStatus === "active" ? null : nowIso;
                      if (subRowId) {
                        if (wantsDelete) {
                          const subDel = await supabase.from("subscriptions").delete().eq("id", subRowId);
                          if (subDel.error) {
                            alert(subDel.error.message);
                            return;
                          }
                        } else {
                          if (!nextPlanId) {
                            alert('Selecione um plano ou escolha "Nenhum plano" com Status "—".');
                            return;
                          }
                          const subUpd = await supabase
                            .from("subscriptions")
                            .update({
                              plan_id: nextPlanId,
                              status: nextStatus === "—" ? null : nextStatus,
                              expires_at: nextStatus === "—" ? subExpiresAt : nextExpiresAt,
                            })
                            .eq("id", subRowId);
                          if (subUpd.error) {
                            alert(subUpd.error.message);
                            return;
                          }
                        }
                      } else {
                        if (choseCurrent || wantsDelete) {
                          void 0;
                        } else {
                          if (!nextPlanId) {
                            alert('Selecione um plano ou escolha "Nenhum plano" com Status "—".');
                            return;
                          }
                          const subIns = await supabase.from("subscriptions").insert({
                            user_id: editingUserId,
                            plan_id: nextPlanId,
                            status: nextStatus === "—" ? null : nextStatus,
                            started_at: nowIso,
                            expires_at: nextStatus === "active" ? null : nowIso,
                            value: null,
                          });
                          if (subIns.error) {
                            alert(subIns.error.message);
                            return;
                          }
                        }
                      }
                    }
                  }
                }

                setUsersData((prev) => prev.map((u) => (u.id === editingUserId ? { ...u, name: userName, cpf: userCpf, role: userRole } : u)));
                if (isSuperAdmin) {
                  setUsersData((prev) =>
                    prev.map((u) =>
                      u.id === editingUserId
                        ? {
                            ...u,
                            plan: (userPlanId || "") === "" ? "—" : userPlanName || u.plan,
                            subscription_status: (userPlanId || "") === "" && (userStatus || "—") === "—" ? null : userStatus === "—" ? null : userStatus,
                          }
                        : u,
                    ),
                  );
                }
                setUserDialogOpen(false);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CrudTable
        columns={["Nome", "Email", "Plano", "Status", "Role"]}
        data={usersData}
        renderRow={(u) => (
          <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
            <td className="p-3 sm:p-4 font-bold">{u.name}</td>
            <td className="p-3 sm:p-4">{u.email}</td>
            <td className="p-3 sm:p-4">{u.plan}</td>
            <td className="p-3 sm:p-4">
              <StatusBadge active={(u.subscription_status ?? "").toLowerCase() === "active" || (u.subscription_status ?? "").toLowerCase() === "ativa"} activeLabel="Ativa" inactiveLabel="—" />
            </td>
            <td className="p-3 sm:p-4">{u.role ?? "user"}</td>
            <ActionButtons
              onView={() => openDetails(u.id)}
              onEdit={() => {
                setEditingUserId(u.id);
                setUserName(u.name);
                setUserEmail(u.email);
                setUserCpf((u.cpf ?? "").replace(/\D/g, "").slice(0, 11));
                setUserRole(u.role ?? "user");
                setUserPlanName(u.plan ?? "—");
                setUserStatus((u.subscription_status ?? "—") || "—");
                setUserPlanId(u.plan && u.plan !== "—" ? CURRENT_PLAN : "");
                setSubRowId(null);
                setSubPlanId(null);
                setSubExpiresAt(null);
                setSubDirty(false);
                if (isSuperAdmin) {
                  setPlanLoading(true);
                  supabase
                    .from("subscriptions")
                    .select("id,plan_id,status,expires_at")
                    .eq("user_id", u.id)
                    .order("expires_at", { ascending: false, nullsFirst: true })
                    .limit(1)
                    .maybeSingle()
                    .then(({ data, error }) => {
                      setPlanLoading(false);
                      if (error) return;
                      const row = (data ?? null) as SubscriptionEditRow | null;
                      if (!row) return;
                      setSubRowId(row.id);
                      setSubExpiresAt(row.expires_at ?? null);
                      setSubPlanId(row.plan_id ?? null);
                      setUserPlanId(row.plan_id ?? (u.plan && u.plan !== "—" ? CURRENT_PLAN : ""));
                      if (row.plan_id) {
                        const planName = plans.find((p) => p.id === row.plan_id)?.name ?? u.plan ?? "—";
                        setUserPlanName(planName || "—");
                      }
                      const st = (row.status ?? u.subscription_status ?? "—") || "—";
                      setUserStatus(st);
                      setSubDirty(false);
                    });
                }
                setUserDialogOpen(true);
              }}
            />
          </tr>
        )}
      />
    </div>
  );
};

export default UsersPage;
