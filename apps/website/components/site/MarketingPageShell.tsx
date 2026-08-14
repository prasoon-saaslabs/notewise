import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/sections/Navbar";

export function MarketingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-24 md:pt-28">{children}</main>
      <Footer />
    </>
  );
}
