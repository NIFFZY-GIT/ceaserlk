import React from 'react';
import { Lock, Eye, Share2, Cookie, ShieldCheck, UserCheck, Baby, RefreshCw, Mail, Database } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-black min-h-screen text-gray-200">
      {/* Header Section */}
      <div className="relative bg-zinc-900 text-white border-b-4 border-b-green-600">
            <div className="absolute top-0 left-0 w-full h-1.5 flex">
                    <div className="w-1/3 bg-[#009246]"></div> {/* Green */}
                    <div className="w-1/3 bg-white"></div>     {/* White */}
                    <div className="w-1/3 bg-[#CE2B37]"></div> {/* Red */}
                </div>
        <div className="container mx-auto px-4 py-16 sm:py-24 text-center max-w-4xl">
          <h1 className="text-3xl font-extrabold uppercase tracking-[0.2em] text-white sm:text-5xl mb-6">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            At <strong className="text-white">Caesar Clothing</strong>, your privacy is important to us. 
            This policy explains how we collect, use, and protect your personal information.
          </p>
          <p className="text-sm text-gray-600 mt-4">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        
        {/* Overview Card */}
        <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 mb-12">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center">
                    <Lock size={20} />
                </div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Overview</h2>
            </div>
            <p className="text-gray-400 leading-relaxed">
                By using our website, you agree to the terms of this Privacy Policy. We are committed to protecting the personal information you provide when you use our website and services.
            </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8">
            
            {/* Data Collection & Usage */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-zinc-900 p-6 rounded-xl border border-green-900/30 hover:border-[#009246] transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <Database className="text-[#009246]" size={24} />
                        <h3 className="font-bold text-white uppercase">1. Information We Collect</h3>
                    </div>
                    <ul className="space-y-3 text-gray-400 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-[#009246] rounded-full mt-2 flex-shrink-0" />
                            <span><strong className="text-white">Personal:</strong> Name, email, phone, shipping/billing address.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-[#009246] rounded-full mt-2 flex-shrink-0" />
                            <span><strong className="text-white">Order:</strong> Items purchased, dates, transaction details.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-[#009246] rounded-full mt-2 flex-shrink-0" />
                            <span><strong className="text-white">Technical:</strong> IP address, browser type, device info.</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-zinc-900 p-6 rounded-xl border border-green-900/30 hover:border-[#009246] transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <Eye className="text-[#009246]" size={24} />
                        <h3 className="font-bold text-white uppercase">2. How We Use It</h3>
                    </div>
                    <ul className="space-y-3 text-gray-400 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-[#009246] rounded-full mt-2 flex-shrink-0" />
                            <span>Process and fulfill your orders.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-[#009246] rounded-full mt-2 flex-shrink-0" />
                            <span>Communicate updates and promotions (if opted-in).</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-[#009246] rounded-full mt-2 flex-shrink-0" />
                            <span>Improve services and prevent fraud.</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Sharing & Cookies */}
            <div className="space-y-8">
                <Section title="3. Sharing Your Information" icon={<Share2 size={20} />}>
                    <ul className="list-disc pl-5 space-y-2 text-gray-400">
                        <li>We do not sell, rent, or trade your personal information to third parties.</li>
                        <li>We share data with trusted service providers (payments, delivery) who are required to keep it confidential.</li>
                        <li>We may disclose info if required by law or to protect our rights.</li>
                    </ul>
                </Section>

                <Section title="4. Cookies and Tracking" icon={<Cookie size={20} />}>
                    <p className="text-gray-400">
                        We use cookies to enhance your experience, analyze traffic, and personalize content. You can disable cookies in your browser, though some features may not work properly.
                    </p>
                </Section>
            </div>

            {/* Security Highlight */}
            <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#009246]/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-[#009246] text-white rounded-full flex items-center justify-center">
                            <ShieldCheck size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-wide">5. Data Security</h2>
                    </div>
                    <p className="text-gray-400 leading-relaxed">
                        We take appropriate measures to protect your personal information from unauthorized access. 
                        Payment information is encrypted and processed securely via our payment gateway.
                    </p>
                </div>
            </div>

            {/* Rights & Children */}
            <div className="grid md:grid-cols-2 gap-8">
                <Section title="6. Your Rights" icon={<UserCheck size={20} />}>
                    <p className="text-gray-400 mb-2">You can access, update, or delete your personal information by contacting us.</p>
                    <p className="text-gray-400">You may opt-out of marketing communications at any time.</p>
                </Section>

                <Section title="7. Children’s Privacy" icon={<Baby size={20} />}>
                    <p className="text-gray-400">
                        Our website is not intended for children under 13. We do not knowingly collect personal information from children.
                    </p>
                </Section>
            </div>

            {/* Updates */}
            <div className="border-t border-zinc-800 pt-8">
                <div className="flex items-start gap-4">
                    <div className="mt-1 text-gray-500">
                        <RefreshCw size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-2 uppercase">8. Changes to This Policy</h3>
                        <p className="text-gray-400 text-sm">
                            We may update this Privacy Policy from time to time. Any changes will be posted on this page. 
                            Your continued use of our website constitutes acceptance of these changes.
                        </p>
                    </div>
                </div>
            </div>

            {/* Contact Section */}
            <div className="flex flex-col items-center justify-center p-8 mt-4 text-center bg-zinc-900 rounded-2xl border border-zinc-800">
                <h3 className="text-xl font-bold text-white mb-4 uppercase">9. Contact Us</h3>
                <p className="text-gray-400 mb-6">For questions or concerns regarding your privacy.</p>
                <a 
                  href="mailto:info@caesarclothing.lk" 
                  className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors"
                >
                  <Mail size={18} />
                  info@caesarclothing.lk
                </a>
            </div>

        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-3 mb-3">
                <span className="text-gray-400">{icon}</span>
                <h3 className="text-lg font-bold text-white uppercase">{title}</h3>
            </div>
            <div className="pl-8 border-l-2 border-zinc-800 ml-2.5">
                {children}
            </div>
        </div>
    );
}
