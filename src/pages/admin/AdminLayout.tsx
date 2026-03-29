import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BadgePercent, BarChart3, Bell, BookOpen, ChevronLeft, CreditCard, Film, GraduationCap, LayoutDashboard, ListChecks, Menu, NotebookPen, Search, Users, X } from "lucide-react";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { loading, user, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = useMemo(
    () => [...items, ...(isSuperAdmin ? [{ to: "/admin/questoes", label: "Questões", icon: ListChecks }, { to: "/admin/livros", label: "Livros", icon: BookOpen }] : [])],
    [isSuperAdmin],
  );

  const pageTitle = useMemo(() => {
    const p = location.pathname;
    const hit = navItems.find((x) => p === x.to || p.startsWith(`${x.to}/`));
    return hit?.label ?? "Admin";
  }, [location.pathname, navItems]);

  const initials = useMemo(() => {
    const raw = String(user?.user_metadata?.name ?? user?.email ?? "A");
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    const a = (parts[0]?.[0] ?? "A").toUpperCase();
    const b = (parts.length > 1 ? parts[parts.length - 1]?.[0] : "")?.toUpperCase() ?? "";
    return `${a}${b}`.slice(0, 2);
  }, [user?.email, user?.user_metadata?.name]);

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
        <div className="container mx-auto max-w-6xl px-4 py-10">
          <div className="bg-card rounded-3xl shadow-card p-6 sm:p-8">
            <p className="text-muted-foreground">Verificando acesso...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="h-14 px-4 md:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="md:hidden h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="hidden md:inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted transition-colors"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label="Recolher menu"
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-bold leading-none">Painel administrativo</p>
              <p className="text-sm sm:text-base font-extrabold truncate">{pageTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className="h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-muted transition-colors" aria-label="Notificações">
              <Bell className="w-5 h-5" />
            </button>
            <div className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center font-extrabold">
              {initials}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <motion.aside
          className={`hidden md:block ${sidebarCollapsed ? "w-16" : "w-64"} h-[calc(100vh-3.5rem)] sticky top-14 bg-card border-r border-border transition-all duration-300 shrink-0`}
          initial={false}
        >
          <nav className="px-2 py-3 space-y-1">
            {navItems.map((t) => (
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
                {!sidebarCollapsed && <span>{t.label}</span>}
              </NavLink>
            ))}
          </nav>
        </motion.aside>

        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} aria-label="Fechar menu" />
            <motion.aside
              className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-card border-r border-border"
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="h-14 px-4 flex items-center justify-between border-b border-border">
                <p className="font-extrabold">Admin</p>
                <button type="button" className="h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-muted transition-colors" onClick={() => setDrawerOpen(false)} aria-label="Fechar menu">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="px-2 py-3 space-y-1">
                {navItems.map((t) => (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) =>
                      `w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${
                        isActive ? "bg-gradient-hero text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      }`
                    }
                  >
                    <t.icon className="w-5 h-5 shrink-0" />
                    <span>{t.label}</span>
                  </NavLink>
                ))}
              </nav>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLayout;
