import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import { Settings, LayoutDashboard, GraduationCap, BookOpen, Users, CreditCard, Film, BarChart3, BadgePercent, NotebookPen, ListChecks, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/modulos", label: "Módulos", icon: GraduationCap },
  { to: "/admin/licoes", label: "Lições", icon: BookOpen },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/assinaturas", label: "Assinaturas", icon: CreditCard },
  { to: "/admin/planos", label: "Planos", icon: NotebookPen },
  { to: "/admin/indicacoes", label: "Indicações", icon: BadgePercent },
  { to: "/admin/videos", label: "Vídeos", icon: Film },
  { to: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/admin/seo", label: "SEO", icon: Search },
];

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { loading, user, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    if (!isAdmin) {
      navigate("/usuario/dashboard");
    }
  }, [isAdmin, loading, navigate, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-6xl px-4 py-10">
          <div className="bg-card rounded-3xl shadow-card p-8">
            <p className="text-muted-foreground">Verificando acesso...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <motion.aside
          className={`${sidebarOpen ? "w-64" : "w-16"} min-h-[calc(100vh-4rem)] bg-card border-r border-border transition-all duration-300 shrink-0`}
          initial={false}
        >
          <div className="p-4">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-2 rounded-lg hover:bg-muted transition-colors w-full flex items-center justify-center"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
          <nav className="px-2 space-y-1">
            {[...items, ...(isSuperAdmin ? [{ to: "/admin/questoes", label: "Questões", icon: ListChecks }, { to: "/admin/livros", label: "Livros", icon: BookOpen }] : [])].map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive ? "bg-gradient-hero text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`
                }
              >
                <t.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{t.label}</span>}
              </NavLink>
            ))}
          </nav>
        </motion.aside>

        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
