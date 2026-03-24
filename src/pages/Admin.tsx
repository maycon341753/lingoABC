import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen, Users, CreditCard, Film, BarChart3, Plus, Pencil, Trash2, Search, ChevronDown,
  LayoutDashboard, GraduationCap, Settings,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";

type Tab = "dashboard" | "modules" | "lessons" | "users" | "subscriptions" | "videos" | "reports";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "modules", label: "Módulos", icon: GraduationCap },
  { id: "lessons", label: "Lições", icon: BookOpen },
  { id: "users", label: "Usuários", icon: Users },
  { id: "subscriptions", label: "Assinaturas", icon: CreditCard },
  { id: "videos", label: "Vídeos", icon: Film },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
];

// Mock data
const mockModules = [
  { id: 1, name: "Descoberta", age: "4–5 anos", lessons: 40, active: true },
  { id: 2, name: "Construção", age: "6–7 anos", lessons: 40, active: true },
  { id: 3, name: "Desenvolvimento", age: "8–9 anos", lessons: 35, active: true },
  { id: 4, name: "Domínio", age: "10+ anos", lessons: 28, active: false },
];

const mockLessons = [
  { id: 1, title: "Somas até 5", module: "Descoberta", subject: "Matemática", type: "multiple_choice", active: true },
  { id: 2, title: "Vogais", module: "Descoberta", subject: "Português", type: "complete_word", active: true },
  { id: 3, title: "Colors", module: "Construção", subject: "Inglês", type: "image_match", active: true },
  { id: 4, title: "Ordem numérica", module: "Descoberta", subject: "Matemática", type: "drag_order", active: true },
  { id: 5, title: "Subtração", module: "Construção", subject: "Matemática", type: "multiple_choice", active: false },
];

const mockUsers = [
  { id: 1, name: "Maria Silva", email: "maria@email.com", plan: "Mensal", active: true, joined: "15/01/2026" },
  { id: 2, name: "João Pereira", email: "joao@email.com", plan: "Trimestral", active: true, joined: "20/02/2026" },
  { id: 3, name: "Ana Lima", email: "ana@email.com", plan: "—", active: false, joined: "01/03/2026" },
  { id: 4, name: "Pedro Santos", email: "pedro@email.com", plan: "Semestral", active: true, joined: "10/03/2026" },
];

const mockSubscriptions = [
  { id: 1, user: "Maria Silva", plan: "Mensal", value: 74.90, status: "ativa", expires: "15/04/2026" },
  { id: 2, user: "João Pereira", plan: "Trimestral", value: 179.00, status: "ativa", expires: "20/05/2026" },
  { id: 3, user: "Pedro Santos", plan: "Semestral", value: 259.90, status: "ativa", expires: "10/09/2026" },
  { id: 4, user: "Carla Rocha", plan: "Mensal", value: 74.90, status: "expirada", expires: "01/03/2026" },
];

const mockVideos = [
  { id: 1, title: "Introdução às Somas", module: "Descoberta", duration: "5:30", views: 245 },
  { id: 2, title: "Aprendendo Vogais", module: "Descoberta", duration: "4:15", views: 189 },
  { id: 3, title: "First Words in English", module: "Construção", duration: "6:00", views: 312 },
];

const AdminDashboard = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    {[
      { label: "Usuários", value: "1.247", change: "+12%", color: "text-primary" },
      { label: "Assinantes", value: "843", change: "+8%", color: "text-accent" },
      { label: "Receita Mensal", value: "R$ 63.180", change: "+15%", color: "text-sun" },
      { label: "Lições Completadas", value: "12.450", change: "+22%", color: "text-coral" },
    ].map((s, i) => (
      <motion.div key={s.label} className="bg-card rounded-2xl shadow-card p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
        <p className="text-xs text-muted-foreground font-bold mb-1">{s.label}</p>
        <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
        <p className="text-xs text-primary font-bold">{s.change} este mês</p>
      </motion.div>
    ))}
  </div>
);

const CrudTable = ({ columns, data, renderRow }: { columns: string[]; data: any[]; renderRow: (item: any, i: number) => React.ReactNode }) => (
  <div className="bg-card rounded-2xl shadow-card overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {columns.map((c) => (
              <th key={c} className="text-left p-4 font-bold text-muted-foreground">{c}</th>
            ))}
            <th className="text-right p-4 font-bold text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody>{data.map((item, i) => renderRow(item, i))}</tbody>
      </table>
    </div>
  </div>
);

const ActionButtons = () => (
  <td className="p-4 text-right">
    <div className="flex justify-end gap-2">
      <button className="p-2 rounded-lg hover:bg-muted transition-colors text-accent"><Pencil className="w-4 h-4" /></button>
      <button className="p-2 rounded-lg hover:bg-muted transition-colors text-destructive"><Trash2 className="w-4 h-4" /></button>
    </div>
  </td>
);

const StatusBadge = ({ active, activeLabel = "Ativo", inactiveLabel = "Inativo" }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-bold ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
    {active ? activeLabel : inactiveLabel}
  </span>
);

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        {/* Sidebar */}
        <motion.aside
          className={`${sidebarOpen ? "w-64" : "w-16"} min-h-[calc(100vh-4rem)] bg-card border-r border-border transition-all duration-300 shrink-0`}
          initial={false}
        >
          <div className="p-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-muted transition-colors w-full flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </button>
          </div>
          <nav className="px-2 space-y-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === t.id ? "bg-gradient-hero text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setActiveTab(t.id)}
              >
                <t.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{t.label}</span>}
              </button>
            ))}
          </nav>
        </motion.aside>

        {/* Main */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-2xl font-display font-extrabold">
              {tabs.find((t) => t.id === activeTab)?.label} ⚙️
            </h1>
            <div className="flex gap-3 w-full sm:w-auto">
              {activeTab !== "dashboard" && activeTab !== "reports" && (
                <>
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." className="pl-9 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <Button className="bg-gradient-hero rounded-xl font-bold shrink-0">
                    <Plus className="w-4 h-4 mr-1" /> Novo
                  </Button>
                </>
              )}
            </div>
          </div>

          {activeTab === "dashboard" && <AdminDashboard />}

          {activeTab === "modules" && (
            <CrudTable
              columns={["Nome", "Faixa Etária", "Lições", "Status"]}
              data={mockModules}
              renderRow={(m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-bold">{m.name}</td>
                  <td className="p-4">{m.age}</td>
                  <td className="p-4">{m.lessons}</td>
                  <td className="p-4"><StatusBadge active={m.active} /></td>
                  <ActionButtons />
                </tr>
              )}
            />
          )}

          {activeTab === "lessons" && (
            <CrudTable
              columns={["Título", "Módulo", "Matéria", "Tipo", "Status"]}
              data={mockLessons}
              renderRow={(l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-bold">{l.title}</td>
                  <td className="p-4">{l.module}</td>
                  <td className="p-4">{l.subject}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-accent/10 text-accent">
                      {l.type === "multiple_choice" && "Múltipla Escolha"}
                      {l.type === "complete_word" && "Completar"}
                      {l.type === "image_match" && "Associação"}
                      {l.type === "drag_order" && "Ordenar"}
                    </span>
                  </td>
                  <td className="p-4"><StatusBadge active={l.active} /></td>
                  <ActionButtons />
                </tr>
              )}
            />
          )}

          {activeTab === "users" && (
            <CrudTable
              columns={["Nome", "Email", "Plano", "Status", "Cadastro"]}
              data={mockUsers}
              renderRow={(u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-bold">{u.name}</td>
                  <td className="p-4">{u.email}</td>
                  <td className="p-4">{u.plan}</td>
                  <td className="p-4"><StatusBadge active={u.active} /></td>
                  <td className="p-4">{u.joined}</td>
                  <ActionButtons />
                </tr>
              )}
            />
          )}

          {activeTab === "subscriptions" && (
            <CrudTable
              columns={["Usuário", "Plano", "Valor", "Status", "Vencimento"]}
              data={mockSubscriptions}
              renderRow={(s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-bold">{s.user}</td>
                  <td className="p-4">{s.plan}</td>
                  <td className="p-4">R$ {s.value.toFixed(2)}</td>
                  <td className="p-4"><StatusBadge active={s.status === "ativa"} activeLabel="Ativa" inactiveLabel="Expirada" /></td>
                  <td className="p-4">{s.expires}</td>
                  <ActionButtons />
                </tr>
              )}
            />
          )}

          {activeTab === "videos" && (
            <CrudTable
              columns={["Título", "Módulo", "Duração", "Visualizações"]}
              data={mockVideos}
              renderRow={(v) => (
                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-bold">{v.title}</td>
                  <td className="p-4">{v.module}</td>
                  <td className="p-4">{v.duration}</td>
                  <td className="p-4">{v.views}</td>
                  <ActionButtons />
                </tr>
              )}
            />
          )}

          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card rounded-2xl shadow-card p-6">
                  <h3 className="font-display font-bold text-lg mb-4">📊 Receita por Plano</h3>
                  <div className="space-y-4">
                    {[
                      { plan: "Mensal (R$ 74,90)", pct: 45, color: "bg-primary" },
                      { plan: "Trimestral (R$ 179,00)", pct: 35, color: "bg-accent" },
                      { plan: "Semestral (R$ 259,90)", pct: 20, color: "bg-sun" },
                    ].map((p) => (
                      <div key={p.plan}>
                        <div className="flex justify-between text-sm font-bold mb-1">
                          <span>{p.plan}</span>
                          <span>{p.pct}%</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <motion.div className={`h-full ${p.color} rounded-full`} initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: 0.8 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card rounded-2xl shadow-card p-6">
                  <h3 className="font-display font-bold text-lg mb-4">👥 Crescimento de Usuários</h3>
                  <div className="space-y-3">
                    {[
                      { month: "Janeiro", users: 280 },
                      { month: "Fevereiro", users: 450 },
                      { month: "Março", users: 517 },
                    ].map((m) => (
                      <div key={m.month} className="flex items-center gap-4">
                        <span className="text-sm font-bold w-24">{m.month}</span>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <motion.div className="h-full bg-gradient-hero rounded-full" initial={{ width: 0 }} animate={{ width: `${(m.users / 600) * 100}%` }} transition={{ duration: 0.8 }} />
                        </div>
                        <span className="text-sm font-bold w-12 text-right">{m.users}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-2xl shadow-card p-6">
                <h3 className="font-display font-bold text-lg mb-4">💰 Resumo Financeiro</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Receita Total", value: "R$ 189.540" },
                    { label: "Comissões Pagas", value: "R$ 12.360" },
                    { label: "Taxa de Conversão", value: "31.6%" },
                    { label: "Ticket Médio", value: "R$ 142,50" },
                  ].map((f) => (
                    <div key={f.label} className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-2xl font-extrabold">{f.value}</p>
                      <p className="text-xs text-muted-foreground font-bold">{f.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
