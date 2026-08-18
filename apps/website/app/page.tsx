import { FAQ } from "@/components/sections/FAQ";
import { Features } from "@/components/sections/Features";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { LogoMarquee } from "@/components/sections/LogoMarquee";
import { MeetingGallery } from "@/components/sections/MeetingGallery";
import { MeetingTimeline } from "@/components/sections/MeetingTimeline";
import { Navbar } from "@/components/sections/Navbar";
import { Privacy } from "@/components/sections/Privacy";
import { StatsBar } from "@/components/sections/StatsBar";
import { Testimonials } from "@/components/sections/Testimonials";
import { TransformationPipeline } from "@/components/sections/TransformationPipeline";
import { VisualStory } from "@/components/sections/VisualStory";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <StatsBar />
        <LogoMarquee />
        <TransformationPipeline />
        <MeetingTimeline />
        <Features />
        <VisualStory />
        <MeetingGallery />
        <Testimonials />
        <Privacy />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
