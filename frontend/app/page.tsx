import Navbar from "@/components/shared/Navbar";
import HeroSection from "@/components/landingPage/HeroSection";
import AboutSection from "@/components/landingPage/AboutSection";
import Footer from "@/components/landingPage/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="snx-page" style={{ background: "#000000", minHeight: "100vh" }}>
        <div style={{ paddingTop: "64px" }}>
          <HeroSection />
          <AboutSection />
          <Footer />
        </div>
      </main>
    </>
  );
}