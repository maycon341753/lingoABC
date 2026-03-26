import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import mascot from "@/assets/mascot-owl.png";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, userLabel, isAdmin, hasSubscription, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2"
          onClick={(e) => {
            if (userLabel) {
              e.preventDefault();
              navigate("/usuario/dashboard");
            }
          }}
        >
          <img src={mascot} alt="LingoABC" className="w-9 h-9" />
          <span className="font-display font-extrabold text-xl text-gradient-hero">
            LingoABC
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {userLabel && (
            <Button variant="outline" className="rounded-xl font-bold" onClick={() => navigate("/modulos")}>
              Módulos
            </Button>
          )}
          {!userLabel && (
            <Link to="/planos" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Planos
            </Link>
          )}
          {!userLabel && (
            <Link to="/sobre" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Sobre
            </Link>
          )}
          {userLabel ? (
            <>
              <Link to="/perfil" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                {userLabel}
              </Link>
              <Button variant="outline" className="rounded-xl font-bold" onClick={() => navigate("/perfil")}>
                Perfil
              </Button>
              <Button variant="outline" className="rounded-xl font-bold" onClick={() => navigate("/usuario/faturas")}>
                Faturas
              </Button>
              {isAdmin && (
                <Button variant="outline" className="rounded-xl font-bold" onClick={() => navigate("/admin")}>
                  Admin
                </Button>
              )}
              <Button variant="outline" className="rounded-xl font-bold" onClick={() => navigate("/usuario/dashboard")}>
                Dashboard
              </Button>
              {!hasSubscription && (
                <Button className="bg-gradient-hero rounded-xl font-bold" onClick={() => navigate(user ? "/usuario/planos" : "/planos")}>
                  Assinar Plano
                </Button>
              )}
              <Button
                className="bg-gradient-hero rounded-xl font-bold"
                onClick={async () => {
                  await signOut();
                  navigate("/login", { replace: true });
                }}
              >
                Sair
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="rounded-xl font-bold" onClick={() => navigate("/login")}>
                Entrar
              </Button>
              <Button className="bg-gradient-hero rounded-xl font-bold" onClick={() => navigate("/cadastro")}>
                Começar Grátis
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="md:hidden bg-background border-b border-border px-4 pb-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="flex flex-col gap-3 pt-2">
              {userLabel && (
                <Button
                  variant="outline"
                  className="rounded-xl font-bold"
                  onClick={() => {
                    navigate("/modulos");
                    setOpen(false);
                  }}
                >
                  Módulos
                </Button>
              )}
              {!userLabel && (
                <Link to="/planos" className="text-sm font-semibold py-2" onClick={() => setOpen(false)}>
                  Planos
                </Link>
              )}
              {!userLabel && (
                <Link to="/sobre" className="text-sm font-semibold py-2" onClick={() => setOpen(false)}>
                  Sobre
                </Link>
              )}
              {userLabel ? (
                <>
                  <Link to="/perfil" className="text-sm font-semibold py-2" onClick={() => setOpen(false)}>
                    {userLabel}
                  </Link>
                  <Button
                    variant="outline"
                    className="rounded-xl font-bold"
                    onClick={() => {
                      navigate("/perfil");
                      setOpen(false);
                    }}
                  >
                    Perfil
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl font-bold"
                    onClick={() => {
                      navigate("/usuario/faturas");
                      setOpen(false);
                    }}
                  >
                    Faturas
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="rounded-xl font-bold"
                      onClick={() => {
                        navigate("/admin");
                        setOpen(false);
                      }}
                    >
                      Admin
                    </Button>
                  )}
                  <Button variant="outline" className="rounded-xl font-bold" onClick={() => { navigate("/usuario/dashboard"); setOpen(false); }}>
                    Dashboard
                  </Button>
                  {!hasSubscription && (
                    <Button
                      className="bg-gradient-hero rounded-xl font-bold"
                      onClick={() => {
                        navigate(user ? "/usuario/planos" : "/planos");
                        setOpen(false);
                      }}
                    >
                      Assinar Plano
                    </Button>
                  )}
                  <Button
                    className="bg-gradient-hero rounded-xl font-bold"
                    onClick={async () => {
                      await signOut();
                      navigate("/login", { replace: true });
                      setOpen(false);
                    }}
                  >
                    Sair
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="rounded-xl font-bold" onClick={() => { navigate("/login"); setOpen(false); }}>Entrar</Button>
                  <Button className="bg-gradient-hero rounded-xl font-bold" onClick={() => { navigate("/cadastro"); setOpen(false); }}>Começar Grátis</Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
