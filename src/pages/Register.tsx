import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import mascot from "@/assets/mascot-owl.png";

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); navigate("/dashboard"); }}>
          <div>
            <Label htmlFor="name" className="font-bold">Nome do responsável</Label>
            <Input id="name" placeholder="Seu nome" className="rounded-xl mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email" className="font-bold">E-mail</Label>
            <Input id="email" type="email" placeholder="seu@email.com" className="rounded-xl mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password" className="font-bold">Senha</Label>
            <Input id="password" type="password" placeholder="Mínimo 6 caracteres" className="rounded-xl mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full bg-gradient-hero font-bold rounded-xl py-5 text-lg">
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
