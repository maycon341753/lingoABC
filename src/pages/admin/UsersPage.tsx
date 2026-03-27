import { useEffect, useState } from "react";
import { ActionButtons, CrudTable, StatusBadge } from "./AdminUi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

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

const UsersPage = () => {
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
  const [subExpiresAt, setSubExpiresAt] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const { isSuperAdmin } = useAuth();

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

  return (
    <div>
      <h1 className="text-2xl font-display font-extrabold mb-6">Usuários ⚙️</h1>

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-xl">
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
                    const nextName = plans.find((p) => p.id === nextId)?.name ?? "—";
                    setUserPlanName(nextName || "—");
                  }}
                  disabled={!isSuperAdmin}
                >
                  {!isSuperAdmin ? (
                    <option value="">{userPlanName}</option>
                  ) : (
                    <>
                      <option value="">Selecione…</option>
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
                    onChange={(e) => setUserStatus(e.target.value)}
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
                const upd = await supabase
                  .from("profiles")
                  .update({ name: userName || null, role: userRole || null })
                  .eq("id", editingUserId);
                if (upd.error) {
                  alert(upd.error.message);
                  return;
                }

                if (isSuperAdmin) {
                  const nextStatus = (userStatus || "—").trim();
                  const nextPlanId = userPlanId || null;
                  if (nextStatus !== "—" || nextPlanId) {
                    const nowIso = new Date().toISOString();
                    const nextExpiresAt = nextStatus === "active" ? null : nowIso;
                    if (subRowId) {
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
                    } else {
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

                setUsersData((prev) => prev.map((u) => (u.id === editingUserId ? { ...u, name: userName, cpf: userCpf, role: userRole } : u)));
                if (isSuperAdmin) {
                  setUsersData((prev) =>
                    prev.map((u) =>
                      u.id === editingUserId
                        ? {
                            ...u,
                            plan: userPlanName || u.plan,
                            subscription_status: userStatus === "—" ? null : userStatus,
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
            <td className="p-4 font-bold">{u.name}</td>
            <td className="p-4">{u.email}</td>
            <td className="p-4">{u.plan}</td>
            <td className="p-4">
              <StatusBadge active={(u.subscription_status ?? "").toLowerCase() === "active" || (u.subscription_status ?? "").toLowerCase() === "ativa"} activeLabel="Ativa" inactiveLabel="—" />
            </td>
            <td className="p-4">{u.role ?? "user"}</td>
            <ActionButtons
              onEdit={() => {
                setEditingUserId(u.id);
                setUserName(u.name);
                setUserEmail(u.email);
                setUserCpf((u.cpf ?? "").replace(/\D/g, "").slice(0, 11));
                setUserRole(u.role ?? "user");
                setUserPlanName(u.plan ?? "—");
                setUserStatus((u.subscription_status ?? "—") || "—");
                setUserPlanId("");
                setSubRowId(null);
                setSubExpiresAt(null);
                if (isSuperAdmin) {
                  supabase
                    .from("subscriptions")
                    .select("id,plan_id,status,expires_at")
                    .eq("user_id", u.id)
                    .order("expires_at", { ascending: false, nullsFirst: true })
                    .limit(1)
                    .maybeSingle()
                    .then(({ data, error }) => {
                      if (error) return;
                      const row = (data ?? null) as SubscriptionEditRow | null;
                      if (!row) return;
                      setSubRowId(row.id);
                      setSubExpiresAt(row.expires_at ?? null);
                      setUserPlanId(row.plan_id ?? "");
                      if (row.plan_id) {
                        const planName = plans.find((p) => p.id === row.plan_id)?.name ?? u.plan ?? "—";
                        setUserPlanName(planName || "—");
                      }
                      const st = (row.status ?? u.subscription_status ?? "—") || "—";
                      setUserStatus(st);
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
