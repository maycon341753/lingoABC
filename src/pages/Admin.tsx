import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BookOpen, Users, CreditCard, Film, BarChart3, Plus, Pencil, Trash2, Search, ChevronDown,
  LayoutDashboard, GraduationCap, Settings,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

type Tab = "dashboard" | "modules" | "lessons" | "users" | "subscriptions" | "videos" | "reports";

type LessonType = "multiple_choice" | "complete_word" | "image_match" | "drag_order";

type LessonRow = {
  id: number;
  title: string;
  module: string;
  subject: "Matemática" | "Português" | "Inglês";
  type: LessonType;
  active: boolean;
};

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

const mockLessons: LessonRow[] = [
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

const CrudTable = <T,>({ columns, data, renderRow }: { columns: string[]; data: T[]; renderRow: (item: T, i: number) => React.ReactNode }) => (
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

const ActionButtons = ({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) => (
  <td className="p-4 text-right">
    <div className="flex justify-end gap-2">
      <button
        type="button"
        className="p-2 rounded-lg hover:bg-muted transition-colors text-accent"
        onClick={onEdit}
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        className="p-2 rounded-lg hover:bg-muted transition-colors text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="w-4 h-4" />
      </button>
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
  const [checking, setChecking] = useState(true);
  const [lessonsData, setLessonsData] = useState<LessonRow[]>(mockLessons);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonModule, setLessonModule] = useState(mockModules[0]?.name ?? "Descoberta");
  const [lessonSubject, setLessonSubject] = useState<LessonRow["subject"]>("Matemática");
  const [lessonType, setLessonType] = useState<LessonType>("multiple_choice");
  const [lessonActive, setLessonActive] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      setChecking(true);
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) {
        setChecking(false);
        navigate("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!mounted) return;
      if (profile?.role !== "admin" && profile?.role !== "super_admin") {
        setChecking(false);
        navigate("/dashboard");
        return;
      }

      setChecking(false);
    };

    check();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => check());

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {checking ? (
        <div className="container mx-auto max-w-6xl px-4 py-10">
          <div className="bg-card rounded-3xl shadow-card p-8">
            <p className="text-muted-foreground">Verificando acesso...</p>
          </div>
        </div>
      ) : (
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
          <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Editar lição</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lessonTitle">Título</Label>
                  <Input id="lessonTitle" className="rounded-xl" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="lessonModule">Módulo</Label>
                    <select
                      id="lessonModule"
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      value={lessonModule}
                      onChange={(e) => setLessonModule(e.target.value)}
                    >
                      {mockModules.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lessonSubject">Matéria</Label>
                    <select
                      id="lessonSubject"
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      value={lessonSubject}
                      onChange={(e) => setLessonSubject(e.target.value as LessonRow["subject"])}
                    >
                      <option value="Matemática">Matemática</option>
                      <option value="Português">Português</option>
                      <option value="Inglês">Inglês</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="lessonType">Tipo</Label>
                    <select
                      id="lessonType"
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      value={lessonType}
                      onChange={(e) => setLessonType(e.target.value as LessonType)}
                    >
                      <option value="multiple_choice">Múltipla escolha</option>
                      <option value="complete_word">Completar palavra</option>
                      <option value="image_match">Associação</option>
                      <option value="drag_order">Ordenar</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <label className="flex items-center gap-3 rounded-xl border border-input bg-background px-3 py-2 h-10">
                      <input
                        type="checkbox"
                        checked={lessonActive}
                        onChange={(e) => setLessonActive(e.target.checked)}
                      />
                      <span className="text-sm font-bold">{lessonActive ? "Ativo" : "Inativo"}</span>
                    </label>
                  </div>
                </div>
              </div>

              <DialogFooter className="sm:justify-end">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  type="button"
                  onClick={() => setLessonDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-gradient-hero rounded-xl font-bold"
                  type="button"
                  onClick={() => {
                    if (editingLessonId === null) {
                      setLessonDialogOpen(false);
                      return;
                    }
                    setLessonsData((prev) =>
                      prev.map((l) =>
                        l.id === editingLessonId
                          ? {
                              ...l,
                              title: lessonTitle,
                              module: lessonModule,
                              subject: lessonSubject,
                              type: lessonType,
                              active: lessonActive,
                            }
                          : l,
                      ),
                    );
                    setLessonDialogOpen(false);
                  }}
                >
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
              data={lessonsData}
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
                  <ActionButtons
                    onEdit={() => {
                      setEditingLessonId(l.id);
                      setLessonTitle(l.title);
                      setLessonModule(l.module);
                      setLessonSubject(l.subject);
                      setLessonType(l.type);
                      setLessonActive(l.active);
                      setLessonDialogOpen(true);
                    }}
                    onDelete={() => setLessonsData((prev) => prev.filter((x) => x.id !== l.id))}
                  />
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
      )}
    </div>
  );
};

export default AdminPage;
