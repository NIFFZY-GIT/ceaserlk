'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Mail, Phone, MapPin, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// --- Reusable Sub-components ---

// FormField Component for cleaner form structure
interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}

const FormField = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  required,
  placeholder,
  rows,
}: FormFieldProps) => (
  <div>
    <label htmlFor={id} className="block mb-2 text-sm font-semibold text-gray-300">
      {label} {required && '*'}
    </label>
    {type === 'textarea' ? (
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        required={required}
        rows={rows || 4}
        className="w-full px-4 py-3 text-white transition-all duration-300 border rounded-lg bg-white/5 border-white/10 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-500"
        placeholder={placeholder}
      />
    ) : (
      <input
        type={type}
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-3 text-white transition-all duration-300 border rounded-lg bg-white/5 border-white/10 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-500"
        placeholder={placeholder}
      />
    )}
  </div>
);

// FAQ Item Component
const FaqItem = ({ q, a, isOpen, onClick }: { q: string; a: string; isOpen: boolean; onClick: () => void }) => (
  <div className="py-6 border-b border-white/10">
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full text-left"
    >
      <h3 className="text-lg font-medium text-white">{q}</h3>
      <ChevronDown
        className={`w-6 h-6 text-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
    <div
      className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 pt-4' : 'grid-rows-[0fr] opacity-0'}`}
    >
      <div className="overflow-hidden">
        <p className="text-gray-400">{a}</p>
      </div>
    </div>
  </div>
);


// --- Main Contact Page Component ---

export default function ContactPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const heroGridRef = useRef<HTMLDivElement>(null);
 
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
      // Hero title animation
      gsap.from(".hero-title-word > span", { y: "100%", opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.15, delay: 0.3 });
     
      // Subtitle animation
      gsap.from(subtitleRef.current, { y: 20, opacity: 0, duration: 1, ease: "power3.out", delay: 0.8 });

      // Hero background grid parallax
      gsap.to(heroGridRef.current, {
        y: -100,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        }
      });
     
      // Generic fade-in-up animation for sections/elements
      const fadeElements = gsap.utils.toArray('.gsap-fade-up');
      fadeElements.forEach((el) => {
        const element = el as Element;
        gsap.from(element, {
          opacity: 0,
          y: 60,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      });
     
      // Staggered list item animations
      gsap.from('.gsap-stagger-item', {
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.15,
        scrollTrigger: {
          trigger: '.gsap-stagger-container',
          start: 'top 80%',
        }
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: 'Thank you! Your message has been sent successfully.'
        });
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setSubmitStatus({
          type: 'error',
          message: data.error || 'Something went wrong. Please try again.'
        });
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    { icon: <Mail className="w-5 h-5" />, title: "Email", content: "info@inceasar.com", href: "mailto:info@inceasar.com" },
    { icon: <Phone className="w-5 h-5" />, title: "Phone", content: "+94 12 345 6789", href: "tel:+94123456789" },
    { icon: <MapPin className="w-5 h-5" />, title: "Location", content: "Colombo, Sri Lanka" },
    { icon: <Clock className="w-5 h-5" />, title: "Hours", content: "Mon-Sat: 9am-6pm" }
  ];

  const faqs = [
    { q: 'What is the typical response time?', a: 'We strive to respond to all inquiries within 24-48 business hours. For urgent matters, please mention it in the subject line.' },
    { q: 'Do you offer custom solutions?', a: 'Absolutely! We specialize in tailoring our services to meet your unique needs. Please provide as much detail as possible in your message so we can better assist you.' },
    { q: 'Can we schedule a discovery call?', a: 'Yes, we would be happy to. Please suggest a few time slots that work for you in your message, and we will coordinate a call with our team.' },
  ];

  return (
    <main ref={containerRef} className="overflow-x-hidden text-white bg-brand-black">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-screen p-6 text-center">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-40"></div>
          <Image src="/images/image.jpg" alt="Abstract background" fill className="object-cover opacity-10" priority />
          <div ref={heroGridRef} className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
          {/* CORRECTED GRADIENT GLOW */}
          <div className="absolute inset-x-0 top-[-10%] h-[100vh] bg-[radial-gradient(circle_farthest-side,rgba(255,0,182,0.15),transparent)]"></div>
        </div>

        <div className="relative z-10">
          <h1 className="mb-8 text-5xl font-extrabold tracking-tighter uppercase md:text-8xl">
            <div className="pb-2 overflow-hidden hero-title-word"><span className="inline-block">Get</span></div>
            <div className="pb-2 overflow-hidden hero-title-word"><span className="inline-block">In</span></div>
            <div className="overflow-hidden hero-title-word"><span className="inline-block text-primary">Touch</span></div>
          </h1>
          <p ref={subtitleRef} className="max-w-2xl mx-auto text-lg text-gray-300 md:text-xl">
            We&apos;re here to help and answer any question you might have. We look forward to hearing from you.
          </p>
        </div>
        <div className="absolute -translate-x-1/2 bottom-10 left-1/2">
          <div className="w-6 h-10 border-2 border-gray-400 rounded-full">
            <div className="w-1 h-2 mx-auto mt-2 bg-gray-400 rounded-full animate-[scroll-down_1.5s_ease-in-out_infinite]"></div>
          </div>
        </div>
      </section>

      {/* Main Content: Form & Info */}
      <section className="py-24 md:py-32">
        <div className="container px-6 mx-auto">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left Side: Info */}
            <div className="gsap-fade-up">
              <h2 className="mb-4 text-4xl font-bold md:text-5xl text-primary">Let&apos;s Connect</h2>
              <p className="mb-10 text-lg text-gray-400">
                Have a project in mind, a question about our services, or just want to chat? Fill out the form or use our contact details below.
              </p>
              <div className="space-y-6 gsap-stagger-container">
                {contactInfo.map((info) => (
                  <div key={info.title} className="flex items-center gap-5 gsap-stagger-item">
                    <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 text-primary">
                      {info.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{info.title}</h3>
                      {info.href ? (
                        <a href={info.href} className="text-gray-300 transition-colors hover:text-primary">{info.content}</a>
                      ) : (
                        <p className="text-gray-300">{info.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Form */}
            <div className="p-8 border rounded-xl bg-white/5 backdrop-blur-lg border-white/10 gsap-fade-up">
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                {submitStatus.type && (
                  <div className={`p-4 rounded-lg flex items-center space-x-3 ${
                    submitStatus.type === 'success'
                      ? 'bg-primary/20 border border-primary/40 text-primary'
                      : 'bg-red-900/20 border border-red-500/40 text-red-400'
                  }`}>
                    {submitStatus.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span>{submitStatus.message}</span>
                  </div>
                )}
               
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <FormField id="name" label="Full Name" value={formData.name} onChange={handleInputChange} required placeholder="John Doe" />
                  <FormField id="email" label="Email Address" type="email" value={formData.email} onChange={handleInputChange} required placeholder="you@example.com" />
                </div>
               
                <FormField id="subject" label="Subject" value={formData.subject} onChange={handleInputChange} required placeholder="Inquiry about..." />
                <FormField id="message" label="Message" type="textarea" value={formData.message} onChange={handleInputChange} required placeholder="Tell us more..." rows={5} />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-8 py-4 font-bold tracking-wider uppercase transition-all duration-300 transform rounded-lg bg-primary text-brand-black hover:bg-opacity-90 focus:outline-none focus:ring-4 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-100"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 rounded-full border-brand-black animate-spin border-t-transparent"></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">Send Message <ChevronRight className="w-5 h-5" /></span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-white/5 md:py-32">
        <div className="container px-6 mx-auto">
            <div className="max-w-3xl mx-auto text-center gsap-fade-up">
                <h2 className="mb-4 text-4xl font-bold md:text-5xl text-primary">Frequently Asked Questions</h2>
                <p className="max-w-2xl mx-auto mb-12 text-gray-400">
                    Find quick answers to common questions about our services and processes.
                </p>
            </div>
            <div className="max-w-3xl mx-auto gsap-stagger-container">
                {faqs.map((faq, index) => (
                    <FaqItem
                        key={index}
                        q={faq.q}
                        a={faq.a}
                        isOpen={openFaq === index}
                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    />
                ))}
            </div>
        </div>
      </section>
    </main>
  );
}
