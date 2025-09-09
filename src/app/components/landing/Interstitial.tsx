// src/app/components/landing/Interstitial.tsx

"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
// 1. Import the 'motion' component from Framer Motion
import { motion } from 'framer-motion';

// 2. Define animation variants for the container and its items
// This is a clean way to manage animation properties.

// The parent container's variants control the staggering of its children.
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Each child will animate 0.2s after the previous one
      ease: 'easeOut' as const
    }
  }
};

// The children's variants define how each item will animate.
const itemVariants = {
  hidden: { opacity: 0, y: 50 }, // Start invisible and 50px down
  visible: { 
    opacity: 1, 
    y: 0,       // End fully visible and in its original position
    transition: {
      duration: 0.8,
      ease: 'easeOut' as const
    }
  }
};

const Interstitial = () => {
  // No more need for useRef or useLayoutEffect!
  
  return (
    // 3. Use the 'motion.section' component and link it to our variants.
    <motion.section
      className="py-32 bg-brand-black md:py-40"
      variants={containerVariants}
      initial="hidden" // Start in the 'hidden' state
      whileInView="visible" // Animate to the 'visible' state when it enters the viewport
      viewport={{ once: true, amount: 0.5 }} // Trigger once, when 50% of the section is visible
    >
      <div className="container max-w-3xl px-6 mx-auto text-center">
        {/* 4. Each animated item is now a 'motion' component using the itemVariants */}
        <motion.h2 
          className="text-4xl font-bold tracking-wider text-white uppercase md:text-5xl"
          variants={itemVariants}
        >
          Beyond the Apparel
        </motion.h2>

        <motion.p 
          className="mt-6 text-lg leading-relaxed text-gray-400"
          variants={itemVariants}
        >
          We believe in the power of mindset. Our brand is a tribute to the discipline, resilience, and relentless drive it takes to achieve greatness.
        </motion.p>
        
        <motion.div 
          className="mt-10"
          variants={itemVariants}
        >
          <Link href="/about" className="inline-flex items-center gap-3 px-8 py-4 font-bold text-white transition-transform rounded-md group bg-primary hover:scale-105">
            <span>Discover Our Mission</span>
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default Interstitial;