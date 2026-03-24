import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import mascot from "@/assets/mascot-owl.png";

const AboutPage = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <img src={mascot} alt="Mascote" className="w-24 h-24 mx-auto mb-6" loading="lazy" width={512} height={512} />
          <h1 className="text-4xl font-display font-extrabold mb-4">
            Sobre o <span className="text-gradient-hero">LingoABC</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            O LingoABC nasceu com a missão de transformar o aprendizado infantil em uma
            experiência divertida, interativa e acessível para todas as crianças brasileiras.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {[
            { title: "Nossa Missão 🎯", text: "Democratizar o acesso à educação de qualidade através de tecnologia e gamificação, tornando o reforço escolar uma atividade prazerosa." },
            { title: "Como Funciona 🎮", text: "Lições interativas divididas por faixa etária e matéria, com sistema de pontos, medalhas e progressão que mantém as crianças motivadas." },
            { title: "Para os Pais 👨‍👩‍👧‍👦", text: "Acompanhe o progresso do seu filho em tempo real, com relatórios detalhados e a certeza de um ambiente seguro e educativo." },
            { title: "Segurança 🔐", text: "Plataforma em conformidade com a LGPD e o ECA Digital, garantindo a proteção dos dados e a segurança das crianças." },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              className="bg-card rounded-3xl shadow-card p-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <h3 className="font-display font-bold text-xl mb-3">{item.title}</h3>
              <p className="text-muted-foreground">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AboutPage;
