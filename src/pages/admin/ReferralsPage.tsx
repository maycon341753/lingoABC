import { useEffect, useState } from "react";
import { CrudTable, ActionButtons } from "./AdminUi";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

type ReferralStatRow = {
  id: string;
  owner_name: string;
  code: string;
  clicks: number;
  signups: number;
  conversions: number;
  total_amount: number;
  commission_percent: number;
  commission_due: number;
};

type ReferralStatSelectRow = {
  link_id: string;
  owner_name: string | null;
  code: string | null;
  clicks_count: number | null;
  signups_count: number | null;
  conversions_count: number | null;
  total_amount: number | null;
  commission_percent: number | null;
  commission_due: number | null;
};

type WithdrawalAdminRow = {
  id: string;
  requested_at: string | null;
  status: string | null;
  amount: number | null;
  pix_type: string | null;
  pix_key: string | null;
  requester_name: string | null;
  requester_email: string | null;
};

const ReferralsPage = () => {
  const [rows, setRows] = useState<ReferralStatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<WithdrawalAdminRow[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editPercent, setEditPercent] = useState(20);
  const { isSuperAdmin, user } = useAuth();
  const [canEditCommission, setCanEditCommission] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!user?.id) {
        if (mounted) setCanEditCommission(false);
        return;
      }
      if (isSuperAdmin) {
        if (mounted) setCanEditCommission(true);
        return;
      }
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const roleRaw = String((data as { role?: string | null } | null)?.role ?? "").toLowerCase().trim();
      const role = roleRaw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      if (mounted) setCanEditCommission(role === "super_admin" || role === "superadmin" || role.startsWith("super_admin"));
    };
    run();
    return () => {
      mounted = false;
    };
  }, [isSuperAdmin, user?.id]);

  const loadRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("v_admin_referral_links")
      .select("link_id,owner_name,code,clicks_count,signups_count,conversions_count,total_amount,commission_percent,commission_due")
      .order("commission_due", { ascending: false });
    if (error) {
      alert(error.message);
      setRows([]);
      setLoading(false);
      return;
    }
    const mapped =
      ((data ?? []) as ReferralStatSelectRow[]).map((r) => ({
        id: r.link_id,
        owner_name: r.owner_name ?? "-",
        code: r.code ?? "-",
        clicks: Number(r.clicks_count ?? 0),
        signups: Number(r.signups_count ?? 0),
        conversions: Number(r.conversions_count ?? 0),
        total_amount: Number(r.total_amount ?? 0),
        commission_percent: Number(r.commission_percent ?? 0),
        commission_due: Number(r.commission_due ?? 0),
      })) ?? [];
    setRows(mapped);
    setLoading(false);
  };

  const loadWithdrawals = async () => {
    setWithdrawalsLoading(true);
    const { data, error } = await supabase
      .from("v_admin_referral_withdrawals")
      .select("id,requested_at,status,amount,pix_type,pix_key,requester_name,requester_email")
      .order("requested_at", { ascending: false })
      .limit(200);
    if (error) {
      alert(error.message);
      setWithdrawals([]);
      setWithdrawalsLoading(false);
      return;
    }
    setWithdrawals(((data ?? []) as WithdrawalAdminRow[]) ?? []);
    setWithdrawalsLoading(false);
  };

  useEffect(() => {
    loadRows().then(() => {});
    loadWithdrawals().then(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-display font-extrabold mb-6">Indicações ⚙️</h1>

      <div className="mb-4">
        <Button
          className="rounded-xl bg-gradient-hero font-bold"
          onClick={() => {
            setEditingId(null);
            setEditCode("");
            setEditPercent(20);
            setEditOpen(true);
          }}
        >
          Novo link
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar link" : "Novo link"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="refCode">Código</Label>
              <Input id="refCode" className="rounded-xl" value={editCode} onChange={(e) => setEditCode(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="refPercent">Comissão (%)</Label>
              <Input
                id="refPercent"
                className="rounded-xl"
                inputMode="numeric"
                value={String(editPercent)}
                onChange={(e) => setEditPercent(Math.max(0, Math.min(100, Number(e.target.value || "0"))))}
                disabled={!canEditCommission}
                readOnly={!canEditCommission}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-hero rounded-xl font-bold"
              type="button"
              onClick={async () => {
                const base = { code: editCode || "" };
                const payload = canEditCommission ? { ...base, commission_percent: Number(editPercent || 0) } : base;
                const insertPayload = canEditCommission ? payload : { ...base, commission_percent: 20 };
                const resp = editingId
                  ? await supabase.from("referral_links").update(payload).eq("id", editingId)
                  : await supabase.from("referral_links").insert(insertPayload);
                if (resp.error) {
                  alert(resp.error.message);
                  return;
                }
                setEditOpen(false);
                loadRows().then(() => {});
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <p className="text-muted-foreground font-bold">Carregando…</p>
      ) : (
        <CrudTable
          columns={["Dono", "Código", "Cliques", "Cadastros", "Conversões", "Valor total", "Comissão (%)", "A pagar"]}
          data={rows}
          renderRow={(r) => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="p-4 font-bold">{r.owner_name}</td>
              <td className="p-4">{r.code}</td>
              <td className="p-4">{r.clicks}</td>
              <td className="p-4">{r.signups}</td>
              <td className="p-4">{r.conversions}</td>
              <td className="p-4">R$ {r.total_amount.toFixed(2)}</td>
              <td className="p-4">{r.commission_percent}%</td>
              <td className="p-4 font-bold text-primary">R$ {r.commission_due.toFixed(2)}</td>
              <ActionButtons
                onEdit={() => {
                  setEditingId(r.id);
                  setEditCode(r.code);
                  setEditPercent(r.commission_percent);
                  setEditOpen(true);
                }}
                onDelete={async () => {
                  const del = await supabase.from("referral_links").delete().eq("id", r.id);
                  if (del.error) {
                    alert(del.error.message);
                    return;
                  }
                  setRows((prev) => prev.filter((x) => x.id !== r.id));
                }}
              />
            </tr>
          )}
        />
      )}

      <div className="mt-8">
        <h2 className="text-xl font-display font-extrabold mb-4">Solicitações de Saque</h2>
        {withdrawalsLoading ? (
          <p className="text-muted-foreground font-bold">Carregando…</p>
        ) : (
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-bold text-muted-foreground">Data</th>
                    <th className="text-left p-4 font-bold text-muted-foreground">Usuário</th>
                    <th className="text-left p-4 font-bold text-muted-foreground">PIX</th>
                    <th className="text-left p-4 font-bold text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-bold text-muted-foreground">Valor</th>
                    <th className="text-right p-4 font-bold text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.length === 0 ? (
                    <tr>
                      <td className="p-6 text-muted-foreground font-bold" colSpan={6}>
                        Nenhuma solicitação ainda.
                      </td>
                    </tr>
                  ) : (
                    withdrawals.map((w) => {
                      const st = String(w.status ?? "").toLowerCase().trim();
                      const label = st === "paid" ? "Pago" : st === "rejected" ? "Rejeitado" : "Pendente";
                      const badge =
                        st === "paid"
                          ? "bg-primary/10 text-primary"
                          : st === "rejected"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-sun/10 text-sun";
                      const dt = w.requested_at ? new Date(w.requested_at).toLocaleString("pt-BR") : "—";
                      const userLabel = w.requester_email || w.requester_name || "—";
                      const pix = `${w.pix_type ?? "pix"}: ${w.pix_key ?? "—"}`;
                      const value = Number(w.amount ?? 0);
                      const canPay = canEditCommission && st === "pending";
                      return (
                        <tr key={w.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="p-4">{dt}</td>
                          <td className="p-4 font-bold">{userLabel}</td>
                          <td className="p-4">{pix}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${badge}`}>{label}</span>
                          </td>
                          <td className="p-4 font-bold">{`R$ ${value.toFixed(2)}`}</td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                className="rounded-xl bg-gradient-hero font-bold"
                                type="button"
                                disabled={!canPay}
                                onClick={async () => {
                                  const ok = confirm("Confirmar que este saque foi pago?");
                                  if (!ok) return;
                                  const up = await supabase
                                    .from("referral_withdrawals")
                                    .update({ status: "paid", paid_at: new Date().toISOString(), paid_by: user?.id ?? null })
                                    .eq("id", w.id);
                                  if (up.error) {
                                    alert(up.error.message);
                                    return;
                                  }
                                  loadWithdrawals().then(() => {});
                                }}
                              >
                                Marcar como pago
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralsPage;
