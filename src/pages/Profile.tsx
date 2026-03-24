import { useEffect, useState } from "react";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

type ProfileRow = {
  name: string | null;
  cpf: string | null;
  role: string | null;
};

const ProfilePage = () => {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        setEmail(null);
        setProfile(null);
        setLoading(false);
        navigate("/login");
        return;
      }

      setEmail(data.user.email ?? null);
      const { data: profileData } = await supabase.from("profiles").select("name, cpf, role").eq("id", data.user.id).maybeSingle();
      if (!mounted) return;
      setProfile(profileData ?? null);
      setLoading(false);
    };

    load();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => load());

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [navigate]);

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

              <div className="pt-4 flex gap-3">
                <Button className="rounded-xl" onClick={() => navigate("/dashboard")}>
                  Ir ao painel
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate("/");
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
