import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ModulesPreview from "@/components/landing/ModulesPreview";
import PricingSection from "@/components/landing/PricingSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import mascot from "@/assets/mascot-owl.png";
import { useSeo } from "@/lib/useSeo";
import { Link } from "react-router-dom";

const Index = () => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const canonical = origin ? `${origin}/` : "/";
  const logoUrl = origin ? new URL(mascot, origin).toString() : mascot;
  useSeo({
    title: "Plataforma Educacional Infantil | LingoABC",
    description:
      "Educação infantil online para aprender brincando: matemática, português e inglês com lições gamificadas para crianças de 4 a 10+ anos. Reforço escolar infantil com diversão.",
    keywords:
      "educação infantil online, reforço escolar infantil, plataforma educacional infantil, aprender brincando, ensino para crianças, matemática infantil, português infantil, inglês infantil",
    canonical,
    ogImage: mascot,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "LingoABC",
        url: canonical,
        logo: logoUrl,
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "LingoABC",
        url: canonical,
      },
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: "LingoABC",
        description:
          "Plataforma educacional infantil gamificada para crianças: matemática, português e inglês. Aprender brincando com reforço escolar infantil.",
        brand: { "@type": "Brand", name: "LingoABC" },
        image: [logoUrl],
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "BRL",
          lowPrice: 74.9,
          highPrice: 259.9,
          offerCount: 3,
          url: origin ? `${origin}/planos` : "/planos",
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Para qual idade a LingoABC é indicada?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "A LingoABC é ideal para crianças de 4 a 10+ anos, com módulos por faixa etária e atividades progressivas.",
            },
          },
          {
            "@type": "Question",
            name: "Quais matérias a plataforma oferece?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Matemática, Português e Inglês, com lições gamificadas, conquistas e vídeos educativos.",
            },
          },
          {
            "@type": "Question",
            name: "Existe teste grátis?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Sim. Você pode criar uma conta e começar grátis para conhecer a plataforma.",
            },
          },
        ],
      },
    ],
  });
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ModulesPreview />
      <PricingSection />
      <CTASection />
      <section className="px-4 pb-12">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-card rounded-3xl shadow-card p-8">
            <h2 className="text-2xl font-display font-extrabold mb-3">Educação infantil online que faz a criança aprender brincando</h2>
            <p className="text-muted-foreground font-bold">
              A LingoABC é uma plataforma educacional infantil com reforço escolar gamificado para ajudar crianças a evoluírem em matemática, português e inglês com motivação, progresso e diversão.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/modulos" className="inline-flex items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold px-6 py-4">
                Ver módulos
              </Link>
              <Link to="/planos" className="inline-flex items-center justify-center rounded-xl border border-border bg-background font-bold px-6 py-4">
                Ver planos
              </Link>
              <Link to="/blog" className="inline-flex items-center justify-center rounded-xl border border-border bg-background font-bold px-6 py-4">
                Acessar blog
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Index;
