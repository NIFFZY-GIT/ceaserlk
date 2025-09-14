'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Mail, Phone, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

export default function ContactPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero title animation with staggered words
      gsap.from(".hero-title-word > span", {
        y: "100%",
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.15,
        delay: 0.3,
      });

      // Subtitle animation
      gsap.from(subtitleRef.current, {
        y: 20,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        delay: 0.8,
      });

      // Generic fade-in animation for all gsap-fade-in elements
      const fadeElements = gsap.utils.toArray('.gsap-fade-in');
      fadeElements.forEach((el) => {
        const element = el as Element;
        gsap.from(element, {
          opacity: 0,
          y: 50,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: 'Thank you! Your message has been sent successfully. We will get back to you soon.'
        });
        setFormData({ name: '', email: '', subject: '', message: '' });
        
        // Success animation
        if (formRef.current) {
          gsap.fromTo(formRef.current,
            { scale: 1 },
            { scale: 1.02, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.inOut" }
          );
        }
      } else {
        setSubmitStatus({
          type: 'error',
          message: data.error || 'Something went wrong. Please try again.'
        });
      }
    } catch (error: unknown) {
      console.error('Contact form error:', error);
      setSubmitStatus({
        type: 'error',
        message: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email Us",
      content: "niffzy@gmail.com",
      description: "Send us an email anytime",
      href: "mailto:niffzy@gmail.com"
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Call Us",
      content: "+94 77 123 4567",
      description: "Mon-Fri 9am-6pm",
      href: "tel:+94771234567"
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Visit Us",
      content: "Colombo, Sri Lanka",
      description: "Our main location"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Business Hours",
      content: "Mon-Sat: 9am-6pm",
      description: "Sunday: Closed"
    }
  ];

  return (
    <main ref={containerRef} className="overflow-x-hidden text-white bg-brand-black">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <Image
          src="/images/image.jpg"
          alt="Contact us background"
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="relative z-10">
          <h1 className="mb-8 text-5xl font-extrabold tracking-tighter uppercase md:text-8xl">
            <div className="pb-2 overflow-hidden hero-title-word">
              <span className="inline-block">Get</span>
            </div>
            <div className="pb-2 overflow-hidden hero-title-word">
              <span className="inline-block">In</span>
            </div>
            <div className="overflow-hidden hero-title-word">
              <span className="inline-block text-primary">Touch</span>
            </div>
          </h1>
          
          <p 
            ref={subtitleRef}
            className="max-w-2xl mx-auto text-lg text-gray-300 md:text-xl"
          >
            Have a question, suggestion, or just want to say hello? We would love to hear from you. 
            Send us a message and we will respond as quickly as possible.
          </p>
        </div>
        <div className="absolute text-sm text-gray-400 -translate-x-1/2 bottom-10 left-1/2 animate-bounce">
          Scroll Down
        </div>
      </section>
    {/* Contact Form Section */}
      <section className="py-24 bg-gray-900/30 md:py-32">
        <div className="container px-6 mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12 text-center gsap-fade-in">
              <h2 className="mb-4 text-4xl font-bold md:text-5xl text-primary">Send us a Message</h2>
              <p className="max-w-2xl mx-auto text-gray-400">
                Fill out the form below and we will get back to you as soon as possible.
              </p>
            </div>

            <div className="overflow-hidden border border-gray-800 rounded-lg bg-gray-900/80 gsap-fade-in">
              <form ref={formRef} onSubmit={handleSubmit} className="p-8">
                {submitStatus.type && (
                  <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
                    submitStatus.type === 'success' 
                      ? 'bg-primary/20 border border-primary/40 text-primary' 
                      : 'bg-red-900/20 border border-red-500/40 text-red-400'
                  }`}>
                    {submitStatus.type === 'success' ? (
                      <CheckCircle className="flex-shrink-0 w-5 h-5" />
                    ) : (
                      <AlertCircle className="flex-shrink-0 w-5 h-5" />
                    )}
                    <span>{submitStatus.message}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block mb-2 text-sm font-semibold text-gray-300">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 text-white placeholder-gray-400 transition-all duration-200 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block mb-2 text-sm font-semibold text-gray-300">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 text-white placeholder-gray-400 transition-all duration-200 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="subject" className="block mb-2 text-sm font-semibold text-gray-300">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 text-white placeholder-gray-400 transition-all duration-200 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="What is this about?"
                  />
                </div>

                <div className="mb-8">
                  <label htmlFor="message" className="block mb-2 text-sm font-semibold text-gray-300">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 text-white placeholder-gray-400 transition-all duration-200 bg-gray-800 border border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-8 py-4 font-bold tracking-wider uppercase transition-all duration-300 transform rounded-lg bg-primary text-brand-black hover:bg-opacity-90 focus:ring-4 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-5 h-5 border-2 rounded-full border-brand-black animate-spin border-t-transparent"></div>
                      <span>Sending Message...</span>
                    </div>
                  ) : (
                    'Send Message'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
      
      {/* Contact Info Cards */}
      <section className="container px-6 py-24 mx-auto md:py-32">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 gsap-fade-in">
          {contactInfo.map((info, index) => (
            <div 
              key={index}
              className="p-8 transition-all duration-300 border border-gray-800 rounded-lg cursor-pointer bg-gray-900/50 hover:border-primary/50 group"
              onClick={() => info.href && window.open(info.href, '_self')}
            >
              <div className="flex items-center justify-center w-12 h-12 mb-6 transition-transform duration-300 rounded-lg bg-primary text-brand-black group-hover:scale-110">
                {info.icon}
              </div>
              <h3 className="mb-2 text-xl font-bold text-white transition-colors group-hover:text-primary">
                {info.title}
              </h3>
              <p className="mb-2 font-medium text-gray-300">{info.content}</p>
              <p className="text-sm text-gray-400">{info.description}</p>
            </div>
          ))}
        </div>
      </section>

  

      {/* Final Call to Action */}
      <section className="py-24 md:py-32 bg-primary">
        <div className="container px-6 mx-auto text-center">
          <h2 className="mb-4 text-4xl font-bold md:text-5xl text-brand-black gsap-fade-in">
            Ready to Connect?
          </h2>
          <p className="max-w-xl mx-auto mb-8 text-gray-800 gsap-fade-in">
            Need immediate assistance? Call us directly for quick support.
          </p>
          <a 
            href="tel:+94771234567" 
            className="inline-block px-10 py-4 font-bold tracking-wider text-white uppercase transition-transform duration-300 rounded-md gsap-fade-in bg-brand-black hover:scale-105 hover:bg-gray-800"
          >
            Call Now: +94 77 123 4567
          </a>
        </div>
      </section>
    </main>
  );
}
