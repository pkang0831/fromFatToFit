'use client';

import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { WhyReturnSection } from '@/components/landing/WhyReturnSection';
import { TrustSection } from '@/components/landing/TrustSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { FooterSection } from '@/components/landing/FooterSection';

export default function LandingPage() {
  return (
    <main className="overflow-hidden bg-[#0a0a0f] text-white">
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <WhyReturnSection />
      <TrustSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <FooterSection />
    </main>
  );
}
