import { useEffect, useState } from "react";
import { ActionButtons, CrudTable } from "./AdminUi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

type PlanRow = {
  id: string;
  code: string | null;
  name: string;
  period_months: number;
  billing_cycle: string | null;
  price: number;
};

type PlanSelectRow = {
  id: string;
  code: string | null;
  name: string;
  period_months: number | null;
  billing_cycle: string | null;
  price: number | null;
};

type PlanUpsertRpcResponse = {
  id: string;
};

const formatBrlFromDigits = (digitsOnly: string) => {
  const digits = String(digitsOnly || "").replace(/\D/g, "");
  if (!digits) return "";
  const cents = Number(digits);
  const integer = Math.floor(cents / 100);
  const decimal = cents % 100;
  const integerFormatted = String(integer).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${integerFormatted},${String(decimal).padStart(2, "0")}`;
};

const formatBrlFromNumber = (value: number) => {
  const cents = Math.round(Number(value || 0) * 100);
  return formatBrlFromDigits(String(cents));
};

const parseBrlToNumber = (value: string) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
};

const PlansManagePage = () => {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [planCode, setPlanCode] = useState("");
  const [planName, setPlanName] = useState("");
  const [planMonths, setPlanMonths] = useState(1);
  const [planCycle, setPlanCycle] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<PlanRow | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plans")
      .select("id,code,name,period_months,billing_cycle,price")
      .order("period_months");
    if (error) {
      alert(error.message);
      setRows([]);
      setLoading(false);
      return;
    }
    const mapped =
      ((data ?? []) as PlanSelectRow[]).map((p) => ({
        id: p.id,
        code: p.code ?? null,
        name: p.name,
        period_months: Number(p.period_months ?? 1),
        billing_cycle: p.billing_cycle ?? null,
        price: Number(p.price ?? 0),
      })) ?? [];
    setRows(mapped);
    setLoading(false);
  };

  useEffect(() => {
    loadRows().then(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-display font-extrabold mb-6">Planos ⚙️</h1>

      <div className="mb-4">
        <Button
          className="rounded-xl bg-gradient-hero font-bold"
          onClick={() => {
            setEditingId(null);
            setPlanCode("");
            setPlanName("");
            setPlanMonths(1);
            setPlanCycle("");
            setPlanPrice("");
            setEditOpen(true);
          }}
        >
          Novo plano
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar plano" : "Novo plano"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="planCode">Código</Label>
              <Input id="planCode" className="rounded-xl" value={planCode} onChange={(e) => setPlanCode(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="planName">Nome</Label>
              <Input id="planName" className="rounded-xl" value={planName} onChange={(e) => setPlanName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="planMonths">Meses</Label>
                <Input
                  id="planMonths"
                  className="rounded-xl"
                  inputMode="numeric"
                  value={String(planMonths)}
                  onChange={(e) => setPlanMonths(Math.max(1, Number(e.target.value || "1")))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="planCycle">Ciclo</Label>
                <Input id="planCycle" className="rounded-xl" placeholder="mensal|trimestral|semestral" value={planCycle} onChange={(e) => setPlanCycle(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="planPrice">Preço (R$)</Label>
                <Input
                  id="planPrice"
                  className="rounded-xl"
                  inputMode="decimal"
                  value={planPrice}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setPlanPrice(formatBrlFromDigits(digits));
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-hero rounded-xl font-bold"
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                const priceNum = parseBrlToNumber(planPrice);
                const payload = {
                  code: planCode || null,
                  name: planName || "",
                  period_months: Number(planMonths || 1),
                  billing_cycle: planCycle || null,
                  price: Number(priceNum || 0),
                };
                  const rpc = await supabase.rpc("admin_upsert_plan", {
                    p_id: editingId,
                    p_code: payload.code,
                    p_name: payload.name,
                    p_period_months: payload.period_months,
                    p_billing_cycle: payload.billing_cycle,
                    p_price: payload.price,
                  });
                  if (rpc.error) {
                    const msg = String(rpc.error.message ?? "");
                    const lower = msg.toLowerCase();
                    const missingRpc = lower.includes("could not find the function") || lower.includes("pgrst202");
                    if (!missingRpc) {
                      setSaving(false);
                      alert(msg);
                      return;
                    }
                    const resp = editingId
                      ? await supabase.from("plans").update(payload).eq("id", editingId)
                      : await supabase.from("plans").insert(payload);
                    setSaving(false);
                    if (resp.error) {
                      alert(resp.error.message);
                      return;
                    }
                  } else {
                    const out = (Array.isArray(rpc.data) ? rpc.data[0] : null) as PlanUpsertRpcResponse | null;
                    const id = String(out?.id ?? editingId ?? "");
                    if (!editingId && id) setEditingId(id);
                    setSaving(false);
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

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeletingPlan(null);
            setDeleteSaving(false);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir plano</DialogTitle>
          </DialogHeader>
          {deleteError ? <p className="text-sm font-bold text-destructive">{deleteError}</p> : null}
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o plano <span className="font-bold">{deletingPlan?.name ?? "—"}</span>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setDeleteOpen(false)} disabled={deleteSaving}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-hero rounded-xl font-bold"
              type="button"
              disabled={deleteSaving || !deletingPlan?.id}
              onClick={async () => {
                if (!deletingPlan?.id) return;
                setDeleteSaving(true);
                setDeleteError(null);
                const rpc = await supabase.rpc("admin_delete_plan", { p_id: deletingPlan.id });
                if (rpc.error) {
                  const msg = String(rpc.error.message ?? "");
                  const lower = msg.toLowerCase();
                  const missingRpc = lower.includes("could not find the function") || lower.includes("pgrst202");
                  if (!missingRpc) {
                    setDeleteSaving(false);
                    if (lower.includes("23503") || lower.includes("foreign key")) {
                      setDeleteError("Não foi possível excluir: existem assinaturas vinculadas a este plano. Remova/alterne as assinaturas antes de excluir.");
                      return;
                    }
                    if (lower.includes("54001") || lower.includes("stack depth")) {
                      setDeleteError("Erro no banco (stack depth). Crie a função admin_delete_plan no Supabase para excluir sem recursão em RLS.");
                      return;
                    }
                    setDeleteError(msg || "Falha ao excluir.");
                    return;
                  }
                  const del = await supabase.from("plans").delete().eq("id", deletingPlan.id);
                  if (del.error) {
                    const dmsg = String(del.error.message ?? "");
                    const dlower = dmsg.toLowerCase();
                    setDeleteSaving(false);
                    if (dlower.includes("23503") || dlower.includes("foreign key")) {
                      setDeleteError("Não foi possível excluir: existem assinaturas vinculadas a este plano. Remova/alterne as assinaturas antes de excluir.");
                      return;
                    }
                    if (dlower.includes("54001") || dlower.includes("stack depth")) {
                      setDeleteError("Erro no banco (stack depth). É necessário ajustar RLS/policies ou usar RPC admin_delete_plan.");
                      return;
                    }
                    setDeleteError(dmsg || "Falha ao excluir.");
                    return;
                  }
                }
                setRows((prev) => prev.filter((x) => x.id !== deletingPlan.id));
                setDeleteSaving(false);
                setDeleteOpen(false);
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <p className="text-muted-foreground font-bold">Carregando…</p>
      ) : (
        <CrudTable
          columns={["Código", "Nome", "Meses", "Ciclo", "Preço"]}
          data={rows}
          renderRow={(p) => (
            <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="p-3 sm:p-4 font-bold">{p.code ?? "—"}</td>
              <td className="p-3 sm:p-4">{p.name}</td>
              <td className="p-3 sm:p-4">{p.period_months}</td>
              <td className="p-3 sm:p-4">{p.billing_cycle ?? "—"}</td>
              <td className="p-3 sm:p-4">R$ {p.price.toFixed(2)}</td>
              <ActionButtons
                onEdit={() => {
                  setEditingId(p.id);
                  setPlanCode(p.code ?? "");
                  setPlanName(p.name);
                  setPlanMonths(p.period_months);
                  setPlanCycle(p.billing_cycle ?? "");
                  setPlanPrice(formatBrlFromNumber(p.price));
                  setEditOpen(true);
                }}
                onDelete={() => {
                  setDeletingPlan(p);
                  setDeleteError(null);
                  setDeleteSaving(false);
                  setDeleteOpen(true);
                }}
              />
            </tr>
          )}
        />
      )}
    </div>
  );
};

export default PlansManagePage;
