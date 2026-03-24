import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import mascot from "@/assets/mascot-owl.png";

const LoginPage = () => {
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
          <h1 className="text-2xl font-display font-extrabold">Bem-vindo de volta! 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">Entre na sua conta</p>
        </div>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); navigate("/dashboard"); }}>
          <div>
            <Label htmlFor="email" className="font-bold">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              className="rounded-xl mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            />
          </div>
          <Button type="submit" className="w-full bg-gradient-hero font-bold rounded-xl py-5 text-lg">
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
