// src/app/components/landing/BrandMission.tsx
import Image from 'next/image';
import Link from 'next/link';

const BrandMission = () => {
  return (
    <section className="bg-black text-brand-white">
      <div className="container grid items-center gap-12 px-6 py-20 mx-auto md:grid-cols-2">
        {/* Image Column */}
        <div className="relative w-full overflow-hidden rounded-md h-80 md:h-96">
          <Image
            src="/images/image.jpg" // A lifestyle image of people wearing the shirts
            alt="Ceaser community"
            fill
            style={{objectFit: 'cover'}}
          />
        </div>

        {/* Text Column */}
        <div className="text-center md:text-left">
          <h2 className="text-4xl font-bold">A SYMBOL OF YOUR DRIVE</h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-200">
            We are not just selling shirts. We are building a community of leaders, creators, and conquerors. Each Ceaser design is a badge of honor—a daily reminder that your potential is limitless and your goals are within reach.
          </p>
          <Link 
            href="/about" 
            className="inline-block px-10 py-3 mt-8 font-bold tracking-wider text-white uppercase transition-all duration-300 border-2 border-white rounded-md hover:bg-white hover:text-primary"
          >
            Our Story
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BrandMission;