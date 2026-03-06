"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import About from "@/components/About";
import WhyNow from "@/components/WhyNow";
import WhyDecentralChain from "@/components/WhyDecentralChain";
import Architecture from "@/components/Architecture";
import Ecosystem from "@/components/Ecosystem";
import EcosystemFlywheel from "@/components/EcosystemFlywheel";
import InvestorThesis from "@/components/InvestorThesis";
import SocialProof from "@/components/SocialProof";
import NetworkValue from "@/components/NetworkValue";
import Roadmap from "@/components/Roadmap";
import Vision from "@/components/Vision";
import CTASection from "@/components/CTASection";
import FAQ from "@/components/FAQ";
import ResourceHub from "@/components/ResourceHub";
import Footer from "@/components/Footer";

const AnimatedBackground = dynamic(
  () => import("@/components/AnimatedBackground"),
  { ssr: false }
);

export default function Home() {
  return (
    <>
      <AnimatedBackground />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <TrustBar />
        <About />
        <WhyNow />
        <WhyDecentralChain />
        <Architecture />
        <Ecosystem />
        <EcosystemFlywheel />
        <InvestorThesis />
        <SocialProof />
        <NetworkValue />
        <Roadmap />
        <Vision />
        <FAQ />
        <ResourceHub />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
