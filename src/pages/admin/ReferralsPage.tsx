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

const ReferralsPage = () => {
  const [rows, setRows] = useState<ReferralStatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editPercent, setEditPercent] = useState(20);
  const { isSuperAdmin } = useAuth();

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

  useEffect(() => {
    loadRows().then(() => {});
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
                disabled={!isSuperAdmin}
                readOnly={!isSuperAdmin}
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
                const payload = isSuperAdmin ? { ...base, commission_percent: Number(editPercent || 0) } : base;
                const insertPayload = isSuperAdmin ? payload : { ...base, commission_percent: 20 };
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
    </div>
  );
};

export default ReferralsPage;
