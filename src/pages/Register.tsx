import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import mascot from "@/assets/mascot-owl.png";
import { supabase } from "@/lib/supabase";

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

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

            if (data.user && data.session) {
              const { error: profileError } = await supabase.from("profiles").upsert({
                id: data.user.id,
                name,
                cpf,
              });

              if (profileError) {
                setIsSubmitting(false);
                alert(profileError.message);
                return;
              }

              setIsSubmitting(false);
              navigate("/dashboard");
              return;
            }

            setIsSubmitting(false);
            alert("Conta criada. Ajuste o Supabase para não exigir confirmação de e-mail.");
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
              placeholder="00000000000"
              className="rounded-xl mt-1"
              value={cpf}
              onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
              inputMode="numeric"
              pattern="[0-9]{11}"
              maxLength={11}
              required
            />
          </div>
          <div>
            <Label htmlFor="password" className="font-bold">Senha</Label>
            <Input id="password" type="password" placeholder="Mínimo 6 caracteres" className="rounded-xl mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="confirmPassword" className="font-bold">Confirmar senha</Label>
            <Input id="confirmPassword" type="password" placeholder="Repita sua senha" className="rounded-xl mt-1" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
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
