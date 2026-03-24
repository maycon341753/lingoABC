import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import mascot from "@/assets/mascot-owl.png";
import { supabase } from "@/lib/supabase";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggedUserLabel, setLoggedUserLabel] = useState<string | null>(null);
  const [loggedUserIsAdmin, setLoggedUserIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data.user) {
        setLoggedUserLabel(null);
        return;
      }

      setLoggedUserLabel(data.user.email ?? "Usuário logado");
      supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (!mounted) return;
          setLoggedUserIsAdmin(profile?.role === "admin" || profile?.role === "super_admin");
        });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setLoggedUserLabel(session?.user?.email ?? null);
      setLoggedUserIsAdmin(false);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (!mounted) return;
            setLoggedUserIsAdmin(profile?.role === "admin" || profile?.role === "super_admin");
          });
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        className="w-full max-w-md bg-card rounded-3xl shadow-card p-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img src={mascot} alt="LingoABC" className="w-16 h-16 mx-auto mb-3" />
          </Link>
          <h1 className="text-2xl font-display font-extrabold">Bem-vindo de volta! 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">Entre na sua conta</p>
        </div>

        {loggedUserLabel && (
          <div className="mb-4 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm">
            <p className="font-bold">Você já está logado</p>
            <p className="text-muted-foreground break-all">{loggedUserLabel}</p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                className="rounded-xl"
                onClick={() => navigate(loggedUserIsAdmin ? "/admin" : "/perfil")}
              >
                {loggedUserIsAdmin ? "Ir ao admin" : "Ir ao perfil"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
              >
                Sair
              </Button>
            </div>
          </div>
        )}

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (isSubmitting) return;
            setIsSubmitting(true);

            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (error || !data.user) {
              setIsSubmitting(false);
              alert(error?.message ?? "Falha ao entrar.");
              return;
            }

            let identified = data.user.email ?? "Usuário";
            const { data: profileData } = await supabase
              .from("profiles")
              .select("name, role")
              .eq("id", data.user.id)
              .maybeSingle();

            if (profileData?.name) identified = profileData.name;
            const isAdmin = profileData?.role === "admin" || profileData?.role === "super_admin";
            setLoggedUserLabel(data.user.email ?? null);
            setLoggedUserIsAdmin(isAdmin);
            setIsSubmitting(false);
            alert(`Bem-vindo, ${identified}!`);
            navigate(isAdmin ? "/admin" : "/perfil");
          }}
        >
          <div>
            <Label htmlFor="email" className="font-bold">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              className="rounded-xl mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password" className="font-bold">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="rounded-xl mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-hero font-bold rounded-xl py-5 text-lg">
            Entrar 🚀
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Não tem conta?{" "}
          <Link to="/cadastro" className="text-primary font-bold hover:underline">
            Cadastre-se grátis
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
