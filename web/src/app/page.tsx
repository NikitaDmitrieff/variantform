import { Navigation } from "@/components/navigation";
import { Hero } from "@/components/sections/hero";
import { Problem } from "@/components/sections/problem";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Commands } from "@/components/sections/commands";
import { Comparison } from "@/components/sections/comparison";
import { GetStarted } from "@/components/sections/get-started";
import { FooterSection } from "@/components/sections/footer-section";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black">
      <Navigation />
      <Hero />
      <Problem />
      <HowItWorks />
      <Commands />
      <Comparison />
      <GetStarted />
      <FooterSection />
    </main>
  );
}
