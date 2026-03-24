import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import mascot from "@/assets/mascot-owl.png";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          className="bg-gradient-hero rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <motion.img
            src={mascot}
            alt="Mascote"
            className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20 md:opacity-40"
            loading="lazy"
            width={512}
            height={512}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          />

          <h2 className="text-3xl md:text-4xl font-display font-extrabold text-primary-foreground mb-4">
            Pronto para começar? 🎉
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
            Cadastre-se gratuitamente e descubra como aprender pode ser divertido!
          </p>
          <Button
            size="lg"
            className="bg-card text-foreground font-bold text-lg px-10 py-6 rounded-2xl hover:scale-105 transition-transform"
            onClick={() => navigate("/cadastro")}
          >
            Criar Conta Grátis 🚀
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
