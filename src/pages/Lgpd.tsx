import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import mascot from "@/assets/mascot-owl.png";
import { useSeo } from "@/lib/useSeo";

const LgpdPage = () => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const canonical = origin ? `${origin}/lgpd` : "/lgpd";
  useSeo({
    title: "LGPD | LingoABC",
    description: "Informações sobre privacidade e proteção de dados (LGPD) na plataforma LingoABC.",
    canonical,
    ogImage: mascot,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "PrivacyPolicy",
      name: "LGPD e Privacidade — LingoABC",
      url: canonical,
    },
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="bg-card rounded-3xl shadow-card p-8 md:p-10">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold mb-3">LGPD e Privacidade</h1>
          <p className="text-muted-foreground font-bold mb-8">
            Esta página explica como a LingoABC trata dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">1) Quem somos</h2>
          <p className="text-muted-foreground font-bold">
            A LingoABC é uma plataforma educacional infantil. Para fins de LGPD, atuamos como Controladora dos dados pessoais tratados no contexto do uso do site e do aplicativo.
          </p>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">2) Quais dados coletamos</h2>
          <div className="space-y-3 text-muted-foreground font-bold">
            <p>
              <span className="font-extrabold text-foreground">Dados de cadastro:</span> nome, e-mail e CPF, além de informações necessárias para acesso à conta.
            </p>
            <p>
              <span className="font-extrabold text-foreground">Dados de uso:</span> progresso nas lições, pontuações e interações com a plataforma.
            </p>
            <p>
              <span className="font-extrabold text-foreground">Dados técnicos:</span> registros de acesso, identificadores de sessão, páginas visitadas e informações de dispositivo/navegador quando aplicável.
            </p>
            <p>
              <span className="font-extrabold text-foreground">Dados de pagamento:</span> informações relacionadas à assinatura podem ser processadas por provedores de pagamento; não armazenamos senhas e não solicitamos dados completos de cartão por formulários próprios.
            </p>
          </div>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">3) Para que usamos os dados</h2>
          <div className="space-y-2 text-muted-foreground font-bold">
            <p>Operar a plataforma, criar e manter contas, autenticar acesso e prevenir fraudes.</p>
            <p>Entregar conteúdo educacional, registrar progresso e exibir métricas (ex.: pontos e lições concluídas).</p>
            <p>Administrar assinaturas, cobranças e suporte ao cliente.</p>
            <p>Melhorar a experiência e a segurança do serviço por meio de análises de uso e monitoramento.</p>
          </div>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">4) Bases legais</h2>
          <div className="space-y-2 text-muted-foreground font-bold">
            <p>Execução de contrato e procedimentos preliminares (para disponibilizar a plataforma e seus recursos).</p>
            <p>Cumprimento de obrigação legal/regulatória (quando aplicável).</p>
            <p>Legítimo interesse (segurança, prevenção a fraudes e melhoria do serviço), com avaliação e medidas de mitigação.</p>
            <p>Consentimento (quando necessário, por exemplo para comunicações específicas ou funcionalidades opcionais).</p>
          </div>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">5) Compartilhamento de dados</h2>
          <div className="space-y-2 text-muted-foreground font-bold">
            <p>Podemos compartilhar dados com provedores que suportam a operação do serviço (ex.: hospedagem, banco de dados, e-mail transacional e pagamentos), sempre com medidas de segurança e finalidade compatível.</p>
            <p>Não vendemos dados pessoais.</p>
          </div>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">6) Armazenamento e segurança</h2>
          <div className="space-y-2 text-muted-foreground font-bold">
            <p>Adotamos controles técnicos e organizacionais para proteger dados pessoais contra acesso não autorizado, perda, alteração e divulgação indevida.</p>
            <p>Senhas são protegidas por mecanismos de autenticação e não são exibidas em texto puro.</p>
          </div>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">7) Retenção</h2>
          <p className="text-muted-foreground font-bold">
            Mantemos dados pessoais pelo tempo necessário para cumprir as finalidades do tratamento, obrigações legais e para resguardar direitos, quando aplicável.
          </p>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">8) Direitos do titular</h2>
          <div className="space-y-2 text-muted-foreground font-bold">
            <p>Você pode solicitar: confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento e revogação de consentimento (quando aplicável).</p>
            <p>Para solicitações, entre em contato pelo e-mail abaixo com as informações necessárias para confirmação de identidade.</p>
          </div>

          <h2 className="text-xl md:text-2xl font-display font-extrabold mt-8 mb-3">9) Contato</h2>
          <p className="text-muted-foreground font-bold">
            E-mail: <span className="text-foreground font-extrabold">contato@lingoabc.com</span>
          </p>

          <div className="mt-10 pt-6 border-t border-border text-sm text-muted-foreground font-bold">
            Última atualização: 29/03/2026
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LgpdPage;

