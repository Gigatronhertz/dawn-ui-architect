import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { BotPreview } from "@/components/BotPreview";
import { Pricing } from "@/components/Pricing";
import { CTA, Footer } from "@/components/CTA";
import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    document.title = "SquadGo — Group trips, planned in minutes";
    const meta = document.querySelector('meta[name="description"]') ||
      Object.assign(document.createElement("meta"), { name: "description" });
    (meta as HTMLMetaElement).content =
      "SquadGo plans your Nigerian group trip end-to-end — itinerary, hotels, WhatsApp updates, and contributions. No app download. No spreadsheet.";
    if (!meta.parentNode) document.head.appendChild(meta);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <Nav />
      <Hero />
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
