import React from 'react';
import { ScrollText, ShieldAlert, Scale, Mail } from 'lucide-react';

export default function TermsConditionsPage() {
  return (
    <div className="bg-black min-h-screen text-gray-200">
      {/* Header Section */}
      <div className="relative bg-zinc-900 text-white border-b-4 border-b-green-600">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#009246] via-white to-[#CE2B37]"></div>
        <div className="container mx-auto px-4 py-16 sm:py-24 text-center max-w-4xl">
          <h1 className="text-3xl font-extrabold uppercase tracking-[0.2em] text-white sm:text-5xl mb-6">
            Terms & Conditions
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Please read these Terms carefully. By using our website, you agree to be bound by these rules and regulations.
          </p>
          <p className="text-sm text-gray-600 mt-4">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        
        {/* Overview Card */}
        <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 mb-12">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center">
                    <ScrollText size={20} />
                </div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Overview</h2>
            </div>
            <div className="space-y-4 text-gray-400 leading-relaxed">
                <p>
                    This website is operated by <strong className="text-white">Caesar Clothing</strong>. Throughout this site, the terms “we”, “us”, and “our” refer to Caesar Clothing. 
                    By accessing our website or purchasing products from us, you agree to comply with and be bound by these Terms of Service. 
                    These Terms apply to all users of the site, including browsers, customers, and contributors of content.
                </p>
                <p>
                    If you do not agree to all the terms, you may not use our website or services. By using our website, you accept these Terms in full.
                </p>
            </div>
        </div>

        {/* Sections Grid */}
        <div className="grid gap-8">
            
            {/* Section 1-3 Group */}
            <div className="space-y-8">
                <Section title="Section 1 – Online Store Terms">
                    <ul className="list-disc pl-5 space-y-2 text-gray-400">
                        <li>By using our site, you confirm that you are at least the age of majority in your jurisdiction or have the consent of a guardian.</li>
                        <li>You may not use our products or services for any illegal purpose.</li>
                        <li>Unauthorized use, transmission of viruses, or any activity that could harm the website or users is prohibited.</li>
                    </ul>
                </Section>

                <Section title="Section 2 – General Conditions">
                    <ul className="list-disc pl-5 space-y-2 text-gray-400">
                        <li>We reserve the right to refuse service to anyone at any time.</li>
                        <li>You agree not to copy, reproduce, or exploit any portion of the website or services without permission.</li>
                        <li>Headings are for convenience only and do not affect the interpretation of the Terms.</li>
                    </ul>
                </Section>

                <Section title="Section 3 – Accuracy of Information">
                    <ul className="list-disc pl-5 space-y-2 text-gray-400">
                        <li>We aim to provide accurate product information, but we do not guarantee completeness or timeliness.</li>
                        <li>Images on the website may not exactly match product colors due to monitor differences.</li>
                        <li>It is your responsibility to verify details before purchasing.</li>
                    </ul>
                </Section>
            </div>

            {/* Divider */}
            <div className="h-px bg-zinc-800 my-4"></div>

            {/* Section 4-6 Group */}
            <div className="space-y-8">
                <Section title="Section 4 – Modifications to Products and Prices">
                    <p className="text-gray-400">Prices and availability are subject to change without notice. We may discontinue products or services at any time without liability.</p>
                </Section>

                <Section title="Section 5 – Online Purchases">
                    <ul className="list-disc pl-5 space-y-2 text-gray-400">
                        <li>All products are sold exclusively online.</li>
                        <li>Orders are subject to availability. We reserve the right to limit quantities or cancel orders.</li>
                        <li>Products are for personal use only. Reselling without permission is prohibited.</li>
                    </ul>
                </Section>

                <Section title="Section 6 – Account Information">
                    <p className="text-gray-400">You agree to provide accurate, complete, and current account and payment information. You are responsible for maintaining your account details and updating any changes.</p>
                </Section>
            </div>

             {/* Divider */}
             <div className="h-px bg-zinc-800 my-4"></div>

            {/* Section 7-9 Group */}
            <div className="space-y-8">
                <Section title="Section 7 – Third-Party Tools and Links">
                    <p className="text-gray-400">Our site may contain links or access to third-party tools. We are not responsible for their content, policies, or reliability. Use of third-party tools is at your own risk.</p>
                </Section>

                <Section title="Section 8 – User Content and Comments">
                    <ul className="list-disc pl-5 space-y-2 text-gray-400">
                        <li>Any content you submit must not violate the rights of third parties or be unlawful, harmful, or offensive.</li>
                        <li>We may review, remove, or edit content at our discretion.</li>
                        <li>You are solely responsible for any content you submit.</li>
                    </ul>
                </Section>

                <Section title="Section 9 – Personal Information">
                    <p className="text-gray-400">Personal information collected is governed by our Privacy Policy.</p>
                </Section>
            </div>

            {/* Highlighted Sections */}
            <div className="grid md:grid-cols-2 gap-6 mt-4">
                <div className="bg-zinc-900 p-6 rounded-xl border border-red-900/30 hover:border-[#CE2B37] transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <ShieldAlert className="text-[#CE2B37]" size={24} />
                        <h3 className="font-bold text-white uppercase">Section 10 – Refunds</h3>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Our Refund Policy applies to defective, damaged, or incorrect items only. Change of mind is not eligible for refunds.
                    </p>
                </div>

                <div className="bg-zinc-900 p-6 rounded-xl border border-red-900/30 hover:border-[#CE2B37] transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <ShieldAlert className="text-[#CE2B37]" size={24} />
                        <h3 className="font-bold text-white uppercase">Section 11 – Prohibited Uses</h3>
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-gray-400 text-sm">
                        <li>Illegal purposes or harming others.</li>
                        <li>Uploading viruses or malicious software.</li>
                        <li>Collecting personal info without consent.</li>
                        <li>Interfering with website security.</li>
                    </ul>
                </div>
            </div>

            {/* Legal Sections */}
            <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 mt-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 bg-[#009246] text-white rounded-full flex items-center justify-center">
                        <Scale size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Legal Disclaimers</h2>
                </div>
                
                <div className="space-y-8">
                    <Section title="Section 12 – Disclaimer of Warranties; Limitation of Liability">
                        <p className="text-gray-400">All products and services are provided “as is” without warranty of any kind. We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the website or products.</p>
                    </Section>

                    <Section title="Section 13 – Indemnification">
                        <p className="text-gray-400">You agree to indemnify and hold Caesar Clothing harmless from any claims, damages, or expenses arising from your violation of these Terms.</p>
                    </Section>

                    <Section title="Section 14 – Termination">
                        <p className="text-gray-400">We may terminate your access to the website if you violate these Terms. Obligations incurred prior to termination will survive.</p>
                    </Section>

                    <Section title="Section 15 – Governing Law">
                        <p className="text-gray-400">These Terms are governed by the laws of Sri Lanka.</p>
                    </Section>

                    <Section title="Section 16 – Changes to Terms">
                        <p className="text-gray-400">We reserve the right to update or modify these Terms at any time. Continued use of the website constitutes acceptance of these changes.</p>
                    </Section>
                </div>
            </div>

            {/* Contact Section */}
            <div className="flex flex-col items-center justify-center p-8 mt-8 text-center border-t border-zinc-800">
                <h3 className="text-xl font-bold text-white mb-4 uppercase">Section 17 – Contact Information</h3>
                <p className="text-gray-400 mb-6">Questions about these Terms should be sent to us.</p>
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

function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-lg font-bold text-white mb-3 border-l-4 border-[#009246] pl-3">{title}</h3>
            <div className="pl-4">
                {children}
            </div>
        </div>
    );
}
