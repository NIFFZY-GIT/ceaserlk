// src/app/page.tsx

import Hero from "@/app/components/landing/Hero";
import FeaturedProducts from "@/app/components/landing/FeaturedProducts";
import Interstitial from "@/app/components/landing/Interstitial"; // 1. Import the buffer
import BrandEthos from "@/app/components/landing/BrandEthos";


export default function HomePage() {
  return (
    <main>
      <Hero />
      <FeaturedProducts />
        {/* 2. Place it between the two sliders */}
      <BrandEthos />

    </main>
  );
}