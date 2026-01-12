// src/app/page.tsx

import FeaturedProducts from "@/app/components/landing/FeaturedProducts";
import VideoShowcase from "@/app/components/landing/VideoShowcase"; // 1. Import the new component
import BrandEthos from "@/app/components/landing/BrandEthos";
import FreeDeliveryPopup from "@/app/components/FreeDeliveryPopup";


export default function HomePage() {
  return (
    <main>
            <VideoShowcase /> 

      <FeaturedProducts />
  {/* 2. Add it right after featured products */}
      <BrandEthos />
      <FreeDeliveryPopup />
    </main>
  );
}