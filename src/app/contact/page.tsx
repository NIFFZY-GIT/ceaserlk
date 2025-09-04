// src/app/contact/page.tsx
import { Mail, Phone, MapPin } from 'lucide-react';

const ContactPage = () => {
  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-black">Get In Touch</h1>
          <p className="mt-2 text-gray-600">Have questions? We're here to help.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 bg-white p-8 rounded-lg shadow-md">
          {/* Contact Form */}
          <form className="space-y-6">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</label>
              <input type="text" id="name" className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</label>
              <input type="email" id="email" className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="message" className="text-sm font-medium text-gray-700">Message</label>
              <textarea id="message" rows={5} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
            </div>
            <div>
              <button type="submit" className="w-full py-3 bg-accent text-white font-bold rounded-md hover:bg-red-500 transition-colors">
                Send Message
              </button>
            </div>
          </form>

          {/* Contact Info */}
          <div className="space-y-8">
            <h3 className="text-2xl font-bold text-black">Contact Information</h3>
            <p className="text-gray-600">Feel free to reach out to us through any of the following methods. Our team is available from 9am to 5pm, Monday to Friday.</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Mail className="text-primary" size={24} />
                <a href="mailto:support@ceaser.com" className="text-lg text-gray-800 hover:underline">support@ceaser.com</a>
              </div>
              <div className="flex items-center gap-4">
                <Phone className="text-primary" size={24} />
                <span className="text-lg text-gray-800">(123) 456-7890</span>
              </div>
              <div className="flex items-center gap-4">
                <MapPin className="text-primary" size={24} />
                <span className="text-lg text-gray-800">123 Ambition Ave, Success City</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;