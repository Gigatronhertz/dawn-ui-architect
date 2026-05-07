import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { PoweredByGemini } from "@/components/PoweredByGemini";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { BotPreview } from "@/components/BotPreview";
import { Pricing } from "@/components/Pricing";
import { CTA, Footer } from "@/components/CTA";
import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    document.title = "MySquadGo — Group trips, planned in minutes";
    const meta = document.querySelector('meta[name="description"]') ||
      Object.assign(document.createElement("meta"), { name: "description" });
    (meta as HTMLMetaElement).content =
      "MySquadGo plans your West African group trip end-to-end — itinerary, hotels, WhatsApp updates, and contributions across Nigeria, Ghana, Senegal & Côte d'Ivoire. No app download. No spreadsheet.";
    if (!meta.parentNode) document.head.appendChild(meta);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <PoweredByGemini />
      <Features />
      <HowItWorks />
      <BotPreview />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
};

export default Index;
