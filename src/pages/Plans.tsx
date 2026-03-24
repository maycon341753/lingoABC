import Navbar from "@/components/landing/Navbar";
import PricingSection from "@/components/landing/PricingSection";
import Footer from "@/components/landing/Footer";

const PlansPage = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-10">
        <PricingSection />
      </div>
      <Footer />
    </div>
  );
};

export default PlansPage;
