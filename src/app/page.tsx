// src/app/page.tsx

import Hero from "@/app/components/landing/Hero";
import FeaturedProducts from "@/app/components/landing/FeaturedProducts";
import BrandMission from "@/app/components/landing/BrandMission";

export default function HomePage() {
  return (
    // The main tag is already in your layout.tsx, so we can use a fragment <>
    <>
      <Hero />
      <FeaturedProducts />
      <BrandMission />
    </>
  );
}