// src/app/components/landing/BrandMission.tsx
import Image from 'next/image';
import Link from 'next/link';

const BrandMission = () => {
  return (
    <section className="bg-primary text-brand-white">
      <div className="container mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        {/* Image Column */}
        <div className="w-full h-80 md:h-96 relative rounded-md overflow-hidden">
          <Image
            src="/mission-image.jpg" // A lifestyle image of people wearing the shirts
            alt="Ceaser community"
            fill
            style={{objectFit: 'cover'}}
          />
        </div>

        {/* Text Column */}
        <div className="text-center md:text-left">
          <h2 className="text-4xl font-bold">A SYMBOL OF YOUR DRIVE</h2>
          <p className="mt-4 text-lg text-gray-200 leading-relaxed">
            We are not just selling shirts. We are building a community of leaders, creators, and conquerors. Each Ceaser design is a badge of honor—a daily reminder that your potential is limitless and your goals are within reach.
          </p>
          <Link 
            href="/about" 
            className="mt-8 inline-block border-2 border-white text-white font-bold px-10 py-3 rounded-md uppercase tracking-wider hover:bg-white hover:text-primary transition-all duration-300"
          >
            Our Story
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BrandMission;