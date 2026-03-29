import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import mascot from "@/assets/mascot-owl.png";
import { useSeo } from "@/lib/useSeo";

const EcaPage = () => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const canonical = origin ? `${origin}/eca` : "/eca";
  useSeo({
    title: "ECA Digital | LingoABC",
    description: "Informações sobre proteção de crianças e adolescentes no ambiente digital (ECA Digital) na plataforma LingoABC.",
    canonical,
    ogImage: mascot,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "ECA Digital — LingoABC",
      url: canonical,
    },
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="bg-card rounded-3xl shadow-card p-8 md:p-10">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold mb-3">ECA Digital</h1>
          <p className="text-muted-foreground font-bold mb-8">
            Esta página apresenta compromissos e boas práticas da LingoABC para um ambiente digital seguro para crianças e adolescentes, em alinhamento com o
            Estatuto da Criança e do Adolescente (ECA) e princípios de proteção online.
          </p>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">Base legal (leis e artigos)</h2>
          <div className="space-y-3 text-muted-foreground font-bold">
            <p>
              <span className="font-extrabold text-foreground">ECA Digital — Lei nº 15.211/2025:</span> Art. 1º (campo de aplicação) e parágrafo único
              (critérios de “acesso provável”).
            </p>
            <p>
              <span className="font-extrabold text-foreground">ECA — Lei nº 8.069/1990:</span> Art. 17 (direito ao respeito), Art. 18 (dever de todos de
              velar pela dignidade), Art. 70 (dever de prevenir ameaça/violação de direitos).
            </p>
            <p>
              <span className="font-extrabold text-foreground">LGPD — Lei nº 13.709/2018:</span> Art. 14 (tratamento de dados de crianças e adolescentes),
              Art. 18 (direitos do titular).
            </p>
            <p>
              <span className="font-extrabold text-foreground">Marco Civil da Internet — Lei nº 12.965/2014:</span> Art. 7º (direitos dos usuários), Art. 10
              (proteção e guarda de registros e dados).
            </p>
            <p className="text-sm">
              As referências acima são informativas e podem ser atualizadas conforme evolução legislativa e orientações da ANPD e demais órgãos competentes.
            </p>
          </div>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">1) Proteção e segurança</h2>
          <div className="space-y-2 text-muted-foreground font-bold">
            <p>Priorizamos a segurança no acesso e no armazenamento de dados, com controles técnicos e monitoramento para reduzir riscos.</p>
            <p>Conteúdos e funcionalidades são planejados para o público infantil, com foco educacional e linguagem apropriada.</p>
          </div>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">2) Privacidade por padrão</h2>
          <div className="space-y-2 text-muted-foreground font-bold">
            <p>Adotamos práticas de minimização de dados: coletamos apenas o necessário para operar a plataforma e registrar o progresso.</p>
            <p>Dados pessoais são tratados em conformidade com a LGPD. Para mais detalhes, consulte a página de LGPD.</p>
          </div>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">3) Conteúdo e interações</h2>
          <div className="space-y-2 text-muted-foreground font-bold">
            <p>A plataforma tem finalidade educacional e não incentiva compartilhamento público de informações pessoais.</p>
            <p>Não exibimos dados pessoais de crianças de forma pública na plataforma.</p>
          </div>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">4) Controles e responsabilidade</h2>
          <div className="space-y-2 text-muted-foreground font-bold">
            <p>O acesso é autenticado e o uso da plataforma pode exigir conta responsável, conforme regras do produto.</p>
            <p>Em caso de suspeita de uso indevido, podemos aplicar medidas de proteção, como bloqueios e revisão de conta.</p>
          </div>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">5) Canal de contato</h2>
          <p className="text-muted-foreground font-bold">
            Para denúncias, dúvidas ou solicitações relacionadas à segurança e privacidade, entre em contato pelo e-mail{" "}
            <span className="text-foreground font-extrabold">contato@lingoabc.com</span>.
          </p>

          <div className="mt-10 pt-6 border-t border-border text-sm text-muted-foreground font-bold">Última atualização: 29/03/2026</div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EcaPage;
