// src/app/about/page.tsx
import Image from 'next/image';
import { Zap, Target, ShieldCheck } from 'lucide-react';

const AboutPage = () => {
  return (
    <div className="bg-brand-white text-black">
      {/* Hero Section */}
      <section className="relative h-[50vh] flex items-center justify-center text-center text-white bg-primary">
        <Image src="/mission-image.jpg" alt="Team working" fill style={{objectFit:'cover'}} className="opacity-20" />
        <div className="relative z-10 p-6">
          <h1 className="text-5xl font-extrabold uppercase tracking-wider">Our Mission</h1>
          <p className="mt-4 text-xl max-w-3xl">To ignite the fire of ambition in every individual through apparel that inspires action.</p>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-bold">Forged From Ambition</h2>
        <div className="mt-4 mx-auto w-24 h-1 bg-accent rounded"></div>
        <p className="mt-8 max-w-3xl mx-auto text-lg text-gray-700 leading-relaxed">
          Ceaser was born from a simple belief: what you wear is an extension of who you are. We saw a world full of generic clothing and dreamed of creating something more—a symbol for the hustlers, the dreamers, and the leaders. We're not just a clothing brand; we are a movement dedicated to the relentless pursuit of greatness. Every design is a piece of our philosophy.
        </p>
      </section>

      {/* Our Values Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold">Our Core Values</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10 text-center">
            <div className="p-6">
              <Zap size={48} className="mx-auto text-primary" />
              <h3 className="mt-4 text-2xl font-bold">Energy & Drive</h3>
              <p className="mt-2 text-gray-600">We embody the unstoppable energy required to achieve the impossible.</p>
            </div>
            <div className="p-6">
              <ShieldCheck size={48} className="mx-auto text-primary" />
              <h3 className="mt-4 text-2xl font-bold">Uncompromising Quality</h3>
              <p className="mt-2 text-gray-600">Our apparel is built to last, just like the legacies our customers are building.</p>
            </div>
            <div className="p-6">
              <Target size={48} className="mx-auto text-primary" />
              <h3 className="mt-4 text-2xl font-bold">Purposeful Design</h3>
              <p className="mt-2 text-gray-600">Every shirt has a message, crafted to be a daily source of motivation.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;