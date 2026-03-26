import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type ProfileRow = {
  name: string | null;
  cpf: string | null;
  role: string | null;
};

type ProfilePlanRow = {
  plan_name: string | null;
  plan_code: string | null;
  period_months: number | null;
  price: number | null;
  billing_cycle: string | null;
  subscription_status: string | null;
  started_at: string | null;
  expires_at: string | null;
  value: number | null;
};

type SubscriptionWithPlanRow = {
  status: string | null;
  started_at: string | null;
  expires_at: string | null;
  value: number | null;
  plans: {
    code: string | null;
    name: string | null;
    period_months: number | null;
    price: number | null;
    billing_cycle: string | null;
  } | null;
};

const buildApiUrl = (path: string) => {
  const base = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  if (!base) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

const ProfilePage = () => {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [plan, setPlan] = useState<ProfilePlanRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const statusNorm = String(plan?.subscription_status ?? "").toLowerCase();
  const expiresAtMs = plan?.expires_at ? new Date(plan.expires_at).getTime() : null;
  const hasActiveSubscription =
    (statusNorm === "active" || statusNorm === "ativa") && expiresAtMs != null && Number.isFinite(expiresAtMs) && expiresAtMs > Date.now();

  const load = useCallback(async (mountedRef?: { current: boolean }) => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (mountedRef && !mountedRef.current) return;

      if (!data.user) {
        setEmail(null);
        setProfile(null);
        setLoading(false);
        navigate("/login");
        return;
      }

      setEmail(data.user.email ?? null);
      const { data: profileData } = await supabase.from("profiles").select("name, cpf, role").eq("id", data.user.id).maybeSingle();
      if (mountedRef && !mountedRef.current) return;
      setProfile(profileData ?? null);
      const { data: planData, error: planError } = await supabase
        .from("v_user_profile_plan")
        .select("plan_name, plan_code, period_months, price, billing_cycle, subscription_status, started_at, expires_at, value")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (mountedRef && !mountedRef.current) return;
      if (!planError && planData) {
        setPlan(planData ?? null);
        setLoading(false);
        return;
      }

      const { data: subRow } = await supabase
        .from("subscriptions")
        .select("status,started_at,expires_at,value,plans(code,name,period_months,price,billing_cycle)")
        .eq("user_id", data.user.id)
        .order("expires_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (mountedRef && !mountedRef.current) return;
      if (subRow) {
        const row = subRow as SubscriptionWithPlanRow;
        const p = row.plans ?? null;
        setPlan({
          plan_name: p?.name ?? null,
          plan_code: p?.code ?? null,
          period_months: p?.period_months ?? null,
          price: p?.price ?? null,
          billing_cycle: p?.billing_cycle ?? null,
          subscription_status: row.status ?? null,
          started_at: row.started_at ?? null,
          expires_at: row.expires_at ?? null,
          value: row.value ?? null,
        });
      } else {
        setPlan(null);
      }
      setLoading(false);
  }, [navigate]);

  useEffect(() => {
    const mountedRef = { current: true };
    load(mountedRef).then(() => {});
    const { data: subscription } = supabase.auth.onAuthStateChange(() => load(mountedRef));

    return () => {
      mountedRef.current = false;
      subscription.subscription.unsubscribe();
    };
  }, [load]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <div className="bg-card rounded-3xl shadow-card p-8">
          <h1 className="text-2xl font-display font-extrabold">Meu Perfil</h1>
          {loading ? (
            <p className="mt-3 text-muted-foreground">Carregando...</p>
          ) : (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Nome</span>
                <span className="font-bold text-right">{profile?.name ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">E-mail</span>
                <span className="font-bold text-right break-all">{email ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">CPF</span>
                <span className="font-bold text-right">{profile?.cpf ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Role</span>
                <span className="font-bold text-right">{profile?.role ?? "user"}</span>
              </div>

              <div className="pt-4">
                <h2 className="font-display font-bold text-lg mb-2">Assinatura</h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Plano</span>
                    <span className="font-bold text-right">{plan?.plan_name ?? "Sem assinatura"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Ciclo</span>
                    <span className="font-bold text-right">{plan?.billing_cycle ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className="font-bold text-right">{plan?.subscription_status ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Início</span>
                    <span className="font-bold text-right">{plan?.started_at ? new Date(plan.started_at).toLocaleDateString() : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Vencimento</span>
                    <span className="font-bold text-right">{plan?.expires_at ? new Date(plan.expires_at).toLocaleDateString() : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Valor</span>
                    <span className="font-bold text-right">
                      {plan?.value != null
                        ? `R$ ${plan.value.toFixed(2)}`
                        : plan?.price != null
                          ? `R$ ${plan.price.toFixed(2)}`
                          : "—"}
                    </span>
                  </div>
                </div>
                {!hasActiveSubscription && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      className="rounded-xl font-bold"
                      disabled={syncing}
                      onClick={async () => {
                        setSyncing(true);
                        const { data } = await supabase.auth.getSession();
                        const token = data.session?.access_token;
                        if (!token) {
                          setSyncing(false);
                          navigate("/login");
                          return;
                        }
                        const r = await fetch(buildApiUrl("/api/asaas/sync-latest"), {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({}),
                        });
                        const j = await r.json().catch(() => null);
                        setSyncing(false);
                        if (!r.ok || !j?.ok) {
                          alert("Não foi possível atualizar a assinatura.");
                          return;
                        }
                        load().then(() => {});
                      }}
                    >
                      Atualizar assinatura
                    </Button>
                    <Button className="rounded-xl bg-gradient-hero font-bold" onClick={() => navigate("/planos")}>
                      Assinar / Renovar
                    </Button>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <Button className="rounded-xl" onClick={() => navigate("/dashboard")}>
                  Ir ao painel
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={async () => {
                    await signOut();
                    navigate("/login", { replace: true });
                  }}
                >
                  Sair
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
