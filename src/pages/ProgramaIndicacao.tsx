import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Coins, GraduationCap, HeartHandshake, Info, Sparkles, Star, Users } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";
import { useSeo } from "@/lib/useSeo";
import mascot from "@/assets/mascot-owl.png";
 
const ProgramaIndicacaoPage = () => {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
 
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const canonical = origin ? `${origin}/programaindicacao` : "/programaindicacao";
 
  useSeo({
    title: "Programa de Indicação | LingoABC",
    description: "Ganhe até 40% de comissão por cada assinatura paga feita pelo seu link de indicação.",
    canonical,
    ogImage: mascot,
    keywords: "programa de indicação, afiliados, influenciadores, parceria, comissão, educação infantil",
  });
 
  const isLogged = !loading && !!user;
 
  const handleJoin = () => {
    if (!isLogged) {
      navigate(`/login?next=${encodeURIComponent("/programaindicacao")}`);
      return;
    }
    navigate("/indicacao");
  };
 
  const commissionRule = useMemo(
    () => "Comissão de 40% válida apenas quando o indicado se cadastra e assina um plano pago. Cadastro gratuito não gera comissão.",
    [],
  );
 
  const container = "container mx-auto max-w-6xl px-4";
 
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
 
      <main className="pt-10 pb-16">
        <section className={`${container}`}>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-card">
            <div className="absolute inset-0 opacity-30 bg-gradient-hero" />
            <div className="relative p-6 sm:p-10 lg:p-12">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-extrabold">
                  <Sparkles className="w-4 h-4 text-sun" />
                  Programa de Indicação LingoABC
                </div>
                <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold leading-tight">
                  Ganhe dinheiro indicando a LingoABC <span className="text-gradient-hero">🚀</span>
                </h1>
                <p className="mt-3 text-base sm:text-lg text-muted-foreground font-bold max-w-2xl">
                  Receba até <span className="text-foreground font-extrabold">40% de comissão</span> por cada assinatura realizada através do seu link.
                </p>
 
                <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
                  <Button className="bg-gradient-hero rounded-xl font-extrabold h-12 px-6 text-base" onClick={handleJoin} type="button">
                    Quero participar agora <ArrowRight className="w-4 h-4" />
                  </Button>
                  <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
                    <Info className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <p className="font-bold text-destructive leading-snug">{commissionRule}</p>
                  </div>
                </div>
              </motion.div>
 
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-extrabold">Comissão alta</p>
                      <p className="text-sm text-muted-foreground font-bold">Até 40% por assinatura paga</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-sun">
                      <BadgeCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-extrabold">Tracking completo</p>
                      <p className="text-sm text-muted-foreground font-bold">Cliques, cadastros e conversões</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lavender">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-extrabold">Público gigante</p>
                      <p className="text-sm text-muted-foreground font-bold">Pais, professores e escolas</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
 
        <section className={`${container} mt-10`}>
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold">Como funciona</h2>
              <p className="text-muted-foreground font-bold mt-2">Simples, rápido e transparente.</p>
            </div>
 
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { n: "1", t: "Cadastre-se gratuitamente", d: "Crie sua conta para entrar no programa." },
                { n: "2", t: "Receba seu link exclusivo", d: "Seu link é gerado automaticamente na plataforma." },
                { n: "3", t: "Indique a LingoABC", d: "Compartilhe com seu público, alunos ou parceiros." },
                { n: "4", t: "Ganhe 40% quando assinar", d: "Você ganha apenas quando o indicado assina um plano pago." },
              ].map((s) => (
                <div key={s.n} className="bg-card rounded-3xl shadow-card border border-border p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-hero text-primary-foreground flex items-center justify-center font-extrabold">
                      {s.n}
                    </div>
                    <p className="font-extrabold">{s.t}</p>
                  </div>
                  <p className="text-sm text-muted-foreground font-bold">{s.d}</p>
                </div>
              ))}
            </div>
 
            <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-destructive">Regra principal</p>
                <p className="text-sm font-bold text-destructive/90">{commissionRule}</p>
              </div>
            </div>
          </motion.div>
        </section>
 
        <section className={`${container} mt-12`}>
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="bg-card rounded-3xl shadow-card border border-border p-6 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold">Quanto você ganha 💰</h2>
                <p className="text-muted-foreground font-bold mt-2">
                  Destaque total: <span className="text-foreground font-extrabold">Ganhe 40% por cada assinatura confirmada</span>.
                </p>
 
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground font-bold">Exemplo real</p>
                    <p className="mt-2 text-xl font-extrabold">10 assinaturas</p>
                    <p className="text-sm text-muted-foreground font-bold mt-1">= comissão paga 1 vez por assinatura confirmada</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground font-bold">Fácil de acompanhar</p>
                    <p className="mt-2 text-xl font-extrabold">Cliques → Cadastros → Conversões</p>
                    <p className="text-sm text-muted-foreground font-bold mt-1">tudo no painel</p>
                  </div>
                </div>
 
                <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-destructive">Atenção</p>
                    <p className="text-sm font-bold text-destructive/90">{commissionRule}</p>
                  </div>
                </div>
 
                <div className="mt-6">
                  <Button className="bg-gradient-hero rounded-xl font-extrabold h-12 px-6 w-full sm:w-auto" onClick={handleJoin} type="button">
                    Entrar no programa <ArrowRight className="w-4 h-4" />
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground font-bold">{commissionRule}</p>
                </div>
              </div>
 
              <div className="space-y-4">
                <div className="bg-card rounded-3xl shadow-card border border-border p-6 sm:p-8">
                  <h3 className="text-xl font-display font-extrabold">Diferenciais que convertem</h3>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { i: GraduationCap, t: "Educativa", d: "Conteúdo infantil alinhado com alfabetização." },
                      { i: Star, t: "Gamificada", d: "Pontos, progresso e recompensas." },
                      { i: HeartHandshake, t: "Inclusiva", d: "Atividades curtas e previsíveis (TEA/autismo)." },
                      { i: Sparkles, t: "Visual", d: "Interface colorida e fácil de usar." },
                    ].map((x) => (
                      <div key={x.t} className="rounded-2xl border border-border bg-muted/30 p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
                            <x.i className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-extrabold">{x.t}</p>
                            <p className="text-sm text-muted-foreground font-bold">{x.d}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
 
                <div className="bg-card rounded-3xl shadow-card border border-border p-6 sm:p-8">
                  <h3 className="text-xl font-display font-extrabold">Bônus e ranking</h3>
                  <p className="text-muted-foreground font-bold mt-2">
                    Comissão padrão: <span className="text-foreground font-extrabold">40%</span>.
                  </p>
                  <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground font-bold">Em breve</p>
                    <p className="font-extrabold mt-1">Ranking e desafios para afiliados</p>
                    <p className="text-sm text-muted-foreground font-bold mt-1">Meta: incentivar conversões reais (assinaturas).</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
 
        <section className={`${container} mt-12`}>
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold">Provas sociais</h2>
              <p className="text-muted-foreground font-bold mt-2">Mensagens reais no estilo WhatsApp (exemplos).</p>
            </div>
 
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                { name: "Amanda, pedagoga", msg: "As crianças amaram. Consegui indicar para várias famílias e ficou fácil explicar como funciona." },
                { name: "Rafael, criador de conteúdo", msg: "O painel de acompanhamento é bem claro. Dá pra ver cliques, cadastros e conversões." },
                { name: "Juliana, mãe", msg: "Conteúdo curto, visual e organizado. Ótimo para rotina e para crianças com TEA." },
              ].map((t) => (
                <div key={t.name} className="bg-card rounded-3xl shadow-card border border-border p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center font-extrabold">
                      {t.name
                        .split(",")[0]
                        .trim()
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold">{t.name}</p>
                      <div className="mt-2 rounded-2xl bg-muted/30 border border-border p-4">
                        <p className="text-sm text-muted-foreground font-bold">{t.msg}</p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground font-bold">Agora</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
 
        <section className={`${container} mt-12`}>
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="bg-card rounded-3xl shadow-card border border-border p-6 sm:p-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-display font-extrabold">Para quem é</h2>
                  <p className="text-muted-foreground font-bold mt-2">Se você fala com pais e educadores, você tem público.</p>
                </div>
                <Button className="bg-gradient-hero rounded-xl font-extrabold h-12 px-6 w-full sm:w-auto" onClick={handleJoin} type="button">
                  Quero participar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
 
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {["Influenciadores", "Criadores", "Professores", "Pais", "Pedagogas"].map((x) => (
                  <div key={x} className="rounded-2xl border border-border bg-muted/30 p-4 text-center">
                    <p className="font-extrabold">{x}</p>
                  </div>
                ))}
              </div>
 
              <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-destructive/90">{commissionRule}</p>
              </div>
            </div>
          </motion.div>
        </section>
 
        <section className={`${container} mt-12`}>
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="bg-card rounded-3xl shadow-card border border-border p-6 sm:p-10">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold">Comece agora e ganhe dinheiro indicando educação</h2>
                <p className="text-muted-foreground font-bold mt-2 max-w-2xl mx-auto">
                  Transparência total: você ganha quando a indicação vira assinatura paga. Sem promessas confusas.
                </p>
              </div>
 
              <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                <Button className="bg-gradient-hero rounded-xl font-extrabold h-12 px-6" onClick={handleJoin} type="button">
                  Entrar no programa <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="rounded-xl font-extrabold h-12 px-6" type="button" onClick={() => navigate("/planos")}>
                  Ver planos
                </Button>
              </div>
 
              <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-destructive/90">{commissionRule}</p>
              </div>
            </div>
          </motion.div>
        </section>
 
        <section className={`${container} mt-12`}>
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="bg-card rounded-3xl shadow-card border border-border p-6 sm:p-10">
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-center">FAQ</h2>
              <p className="text-muted-foreground font-bold mt-2 text-center">{commissionRule}</p>
 
              <div className="mt-6 max-w-3xl mx-auto">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="a">
                    <AccordionTrigger>Preciso pagar para participar?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground font-bold">Não. Participar é gratuito.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="b">
                    <AccordionTrigger>Quando eu ganho comissão?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground font-bold">{commissionRule}</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="c">
                    <AccordionTrigger>Cadastro gera comissão?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground font-bold">
                        Não. Apenas assinatura ativa (plano pago) gera comissão. Cadastros gratuitos não geram comissão.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="d">
                    <AccordionTrigger>Como recebo?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground font-bold">Após atingir o valor mínimo de saque, você solicita o pagamento no painel do programa.</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
 
      <Footer />
    </div>
  );
};
 
export default ProgramaIndicacaoPage;
