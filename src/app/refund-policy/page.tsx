import React from 'react';
import { ShieldCheck, AlertCircle, RefreshCw, Truck, Mail, MessageCircle } from 'lucide-react';

export default function RefundPolicyPage() {
  return (
    <div className="bg-black min-h-screen text-gray-200">
      {/* Header Section */}
      <div className="relative bg-zinc-900 text-white border-b-4 border-b-green-600">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#009246] via-white to-[#CE2B37]"></div>
        <div className="container mx-auto px-4 py-16 sm:py-24 text-center max-w-4xl">
          <h1 className="text-3xl font-extrabold uppercase tracking-[0.2em] text-white sm:text-5xl mb-6">
            Refund Policy
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            At <strong className="text-white">Caesar</strong>, we honor our heritage with quality and integrity. 
            We ensure a transparent and fair process for all our customers.
          </p>
          <p className="text-sm text-gray-600 mt-4">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-5xl">
        
        {/* Eligibility & Non-Refundable Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Eligibility - Green Theme */}
          <div className="bg-zinc-900 p-8 rounded-2xl border-2 border-green-900/30 hover:border-[#009246] transition-colors shadow-sm group">
            <div className="w-12 h-12 bg-[#009246] text-white rounded-full flex items-center justify-center mb-6 shadow-green-900/50 shadow-lg group-hover:scale-110 transition-transform">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wide border-b-2 border-[#009246] inline-block pb-1">Eligibility</h2>
            <ul className="space-y-4 text-gray-400">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-[#009246] rounded-full mt-2.5 flex-shrink-0" />
                <span>Refunds are applicable only for <span className="font-bold text-white">defective, damaged, or incorrect items</span>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-[#009246] rounded-full mt-2.5 flex-shrink-0" />
                <span>Issues must be reported within <span className="font-bold text-white">7 days of delivery</span>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-[#009246] rounded-full mt-2.5 flex-shrink-0" />
                <span>Clear photos of the issue are required for verification.</span>
              </li>
            </ul>
          </div>

          {/* Non-Refundable - Red Theme */}
          <div className="bg-zinc-900 p-8 rounded-2xl border-2 border-red-900/30 hover:border-[#CE2B37] transition-colors shadow-sm group">
            <div className="w-12 h-12 bg-[#CE2B37] text-white rounded-full flex items-center justify-center mb-6 shadow-red-900/50 shadow-lg group-hover:scale-110 transition-transform">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wide border-b-2 border-[#CE2B37] inline-block pb-1">Non-Refundable</h2>
            <ul className="space-y-4 text-gray-400">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-[#CE2B37] rounded-full mt-2.5 flex-shrink-0" />
                <span>Change of mind, size, or color preference.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-[#CE2B37] rounded-full mt-2.5 flex-shrink-0" />
                <span>Personalized or custom-made items (unless defective).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-[#CE2B37] rounded-full mt-2.5 flex-shrink-0" />
                <span>Items without original packaging or tags.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Process Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-12 text-center uppercase tracking-wide">
            <span className="border-b-4 border-white pb-2">How It Works</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 bg-zinc-900 rounded-xl border border-zinc-800 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-[#009246] text-white rounded-full flex items-center justify-center mb-4 text-2xl font-bold shadow-lg">
                1
              </div>
              <h3 className="font-bold text-lg mb-2 text-[#009246]">Report Issue</h3>
              <p className="text-gray-400 text-sm">Contact support with your order details and clear photos of the defect.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-zinc-900 rounded-xl border border-zinc-800 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-black border-4 border-white text-white rounded-full flex items-center justify-center mb-4 text-2xl font-bold shadow-lg">
                2
              </div>
              <h3 className="font-bold text-lg mb-2 text-white">Verification</h3>
              <p className="text-gray-400 text-sm">Our team will review your request and verify the defect within 24-48 hours.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-zinc-900 rounded-xl border border-zinc-800 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-[#CE2B37] text-white rounded-full flex items-center justify-center mb-4 text-2xl font-bold shadow-lg">
                3
              </div>
              <h3 className="font-bold text-lg mb-2 text-[#CE2B37]">Refund</h3>
              <p className="text-gray-400 text-sm">Once approved, receive a full refund to your original payment method in 7-10 days.</p>
            </div>
          </div>
        </div>

        {/* Additional Info Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
           <div className="border-l-4 border-white pl-6 py-2">
              <div className="flex items-center gap-3 mb-3">
                <RefreshCw className="text-[#009246]" size={24} />
                <h3 className="font-bold text-lg uppercase tracking-wide text-white">Exchanges</h3>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Currently, we do not offer direct product exchanges. If you wish to select a different item, please place a new order.
              </p>
           </div>
           <div className="border-l-4 border-[#CE2B37] pl-6 py-2">
              <div className="flex items-center gap-3 mb-3">
                <Truck className="text-[#CE2B37]" size={24} />
                <h3 className="font-bold text-lg uppercase tracking-wide text-white">Shipping Costs</h3>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Original shipping fees are non-refundable. However, return shipping costs for verified defective items will be covered by Caesar Clothing.
              </p>
           </div>
        </div>

        {/* Contact Banner */}
        <div className="relative overflow-hidden bg-zinc-900 text-white rounded-2xl p-8 md:p-12 text-center shadow-2xl border border-zinc-800">
          {/* Italian Flag Accent Background */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#009246] via-white to-[#CE2B37]"></div>
          
          <h2 className="text-2xl font-bold mb-4 uppercase tracking-wide mt-4">Need Assistance?</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            We are committed to providing a smooth experience. If you have any questions, our support team is ready to help.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="mailto:support@inceasar.com" 
              className="flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors border-2 border-white"
            >
              <Mail size={20} />
              Email Support
            </a>
            <a 
              href="https://wa.me/yournumber" 
              className="flex items-center gap-2 px-8 py-4 bg-transparent border-2 border-[#009246] text-[#009246] rounded-full font-bold hover:bg-[#009246] hover:text-white transition-all"
            >
              <MessageCircle size={20} />
              WhatsApp Us
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
