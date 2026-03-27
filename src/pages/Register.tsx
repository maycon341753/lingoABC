import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import mascot from "@/assets/mascot-owl.png";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("Conta criada com sucesso!");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Dialog
        open={successOpen}
        onOpenChange={(open) => {
          setSuccessOpen(open);
          if (!open) navigate("/login", { replace: true });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sucesso</DialogTitle>
            <DialogDescription>{successMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              className="bg-gradient-hero rounded-xl font-bold"
              type="button"
              onClick={() => navigate("/login", { replace: true })}
            >
              Ir para o login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <motion.div
        className="w-full max-w-md bg-card rounded-3xl shadow-card p-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img src={mascot} alt="LingoABC" className="w-16 h-16 mx-auto mb-3" />
          </Link>
          <h1 className="text-2xl font-display font-extrabold">Crie sua conta! 🎉</h1>
          <p className="text-muted-foreground text-sm mt-1">É grátis para começar</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (isSubmitting) return;
            if (!/^\d{11}$/.test(cpf)) {
              alert("CPF inválido. Use 11 dígitos.");
              return;
            }
            if (password !== confirmPassword) {
              alert("As senhas não coincidem.");
              return;
            }
            setIsSubmitting(true);
            const { data, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { name, cpf },
              },
            });

            if (error) {
              setIsSubmitting(false);
              alert(error.message);
              return;
            }

            setIsSubmitting(false);
            if (data.user) {
              const { error: profileError } = await supabase.from("profiles").upsert({
                id: data.user.id,
                name,
                cpf,
              });
              if (profileError) {
                alert(profileError.message);
                return;
              }
              try {
                const refCode = String(window.localStorage.getItem("referral:code") ?? "").trim();
                if (refCode) {
                  await supabase.rpc("referral_register_signup", { p_code: refCode });
                  window.localStorage.removeItem("referral:code");
                  window.localStorage.removeItem("referral:ts");
                }
              } catch {
                void 0;
              }
              if (!data.session) {
                setSuccessMessage("Conta criada! Se o e-mail estiver com confirmação ativa, verifique sua caixa de entrada e depois faça login.");
              } else {
                setSuccessMessage("Conta criada com sucesso! Você será direcionado para o login.");
              }
              setSuccessOpen(true);
              window.setTimeout(() => {
                navigate("/login", { replace: true });
              }, 1200);
              return;
            }

            alert("Conta criada, mas não foi possível finalizar o cadastro. Tente novamente.");
          }}
        >
          <div>
            <Label htmlFor="name" className="font-bold">Nome do responsável</Label>
            <Input id="name" placeholder="Seu nome" className="rounded-xl mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email" className="font-bold">E-mail</Label>
            <Input id="email" type="email" placeholder="seu@email.com" className="rounded-xl mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cpf" className="font-bold">CPF</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              className="rounded-xl mt-1"
              value={formatCpf(cpf)}
              onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
              inputMode="numeric"
              maxLength={14}
              required
            />
          </div>
          <div>
            <Label htmlFor="password" className="font-bold">Senha</Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                className="rounded-xl pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="confirmPassword" className="font-bold">Confirmar senha</Label>
            <div className="relative mt-1">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repita sua senha"
                className="rounded-xl pr-12"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-hero font-bold rounded-xl py-5 text-lg">
            Criar Conta Grátis 🚀
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Já tem conta?{" "}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Entrar
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
