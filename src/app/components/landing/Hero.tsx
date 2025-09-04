// src/app/components/landing/Hero.tsx
import Link from 'next/link';
import Image from 'next/image';

const Hero = () => {
  return (
    <section className="relative h-[85vh] w-full flex items-center justify-center text-white">
      {/* Background Image */}
      <Image
        src="/images/image.jpg" // A motivational image (e.g., person achieving a goal)
        alt="Motivational background"
        fill
        style={{objectFit: 'cover'}}
        className="brightness-[0.4]"
        priority
      />
      
      {/* Content */}
      <div className="relative z-10 text-center p-6">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight uppercase">
          Wear Your <span className="text-[#EF3D4C]">Ambition</span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-gray-200">
          Ceaser is more than a brand. It&apos;s a statement. Premium shirts crafted to fuel your journey to greatness.
        </p>
        <Link 
          href="/shop" 
          className="mt-8 inline-block bg-accent text-white font-bold text-lg px-12 py-4 rounded-md uppercase tracking-wider hover:scale-105 hover:bg-red-500 transition-all duration-300"
        >
          Shop The Collection
        </Link>
      </div>
    </section>
  );
};

export default Hero;