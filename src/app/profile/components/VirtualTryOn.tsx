"use client";

import { useState, useRef } from 'react';
import { Loader2, UploadCloud, Download, Share2, Wand2 } from 'lucide-react';
import Image from 'next/image';

interface VirtualTryOnProps {
  productName: string;
  productImageUrl: string;
}

export default function VirtualTryOn({ productName, productImageUrl }: VirtualTryOnProps) {
  const [userImageFile, setUserImageFile] = useState<File | null>(null);
  const [userImagePreview, setUserImagePreview] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (PNG, JPG, JPEG, etc.)');
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size too large. Please select an image under 10MB.');
        return;
      }

      setUserImageFile(file);
      setUserImagePreview(URL.createObjectURL(file));
      setGeneratedImage(null);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!userImageFile) return;
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const fullProductImageUrl = `${window.location.origin}${productImageUrl}`;

      // Create FormData for the AI API
      const aiFormData = new FormData();
      aiFormData.append('userImage', userImageFile);
      aiFormData.append('productImageUrl', fullProductImageUrl);
      aiFormData.append('productName', productName || '');

      const aiResponse = await fetch('/api/ai/virtual-try-on', {
        method: 'POST',
        body: aiFormData, // Send FormData, no Content-Type header needed
      });
      if (!aiResponse.ok) { const err = await aiResponse.json(); throw new Error(err.error || 'AI generation failed.'); }

      const data = await aiResponse.json();
      setGeneratedImage(data.generatedImageUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-6 mt-6 border border-gray-700 shadow-xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/20">
          <Wand2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h4 className="text-xl font-bold text-white">AI Style Preview</h4>
          <p className="text-sm text-gray-400">See style inspiration for {productName}!</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 mb-6 border rounded-lg bg-primary/10 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
            i
          </div>
          <div>
            <h5 className="mb-1 font-semibold text-green-200">How it works:</h5>
            <ul className="space-y-1 text-sm text-green-100">
              <li>• Upload your photo to help us understand your style preferences</li>
              <li>• Our AI will generate style inspiration showing how this item looks</li>
              <li>• Get a preview of the clothing style and fit</li>
              <li>• Note: This shows style inspiration, not your exact appearance</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 mb-4 border rounded-lg bg-red-500/20 border-red-500/30">
          <p className="flex items-center gap-2 text-sm text-red-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.694-.833-2.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2">
        {/* Upload Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Your Photo
          </label>
          <div 
            onClick={() => fileInputRef.current?.click()} 
            className="relative flex flex-col items-center justify-center p-6 text-center transition-all duration-300 bg-gray-800 border-2 border-gray-600 border-dashed cursor-pointer group rounded-xl hover:border-primary hover:bg-gray-800/80 aspect-square"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
            {userImagePreview ? (
              <>
                <Image 
                  src={userImagePreview} 
                  alt="Your photo" 
                  fill 
                  className="object-cover rounded-lg" 
                />
                <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 rounded-lg opacity-0 bg-black/50 group-hover:opacity-100">
                  <p className="font-medium text-white">Click to change photo</p>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center w-16 h-16 transition-colors bg-gray-700 rounded-full group-hover:bg-primary/20">
                  <UploadCloud className="w-8 h-8 text-gray-400 transition-colors group-hover:text-primary" />
                </div>
                <div>
                  <p className="mb-1 font-semibold text-white">Upload your photo</p>
                  <p className="text-xs text-gray-400">PNG, JPG up to 10MB</p>
                  <p className="mt-1 text-xs text-gray-500">Best results with clear, front-facing photos</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Result Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            AI Generated Result
          </label>
          <div className="relative flex items-center justify-center p-6 bg-gray-800 border border-gray-700 rounded-xl aspect-square">
            {isLoading && (
              <div className="space-y-4 text-center">
                <div className="relative">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                  <div className="absolute inset-0 animate-ping">
                    <div className="w-12 h-12 rounded-full bg-primary/20"></div>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-white">Creating your virtual try-on...</p>
                  <p className="text-sm text-gray-400">This may take up to 60 seconds</p>
                </div>
              </div>
            )}
            
            {generatedImage && (
              <div className="relative w-full h-full group">
                <Image 
                  src={generatedImage} 
                  alt="AI generated try-on" 
                  fill 
                  className="object-contain rounded-lg" 
                />
                <div className="absolute transition-opacity opacity-0 top-3 right-3 group-hover:opacity-100">
                  <div className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-full">
                    ✨ AI Generated
                  </div>
                </div>
              </div>
            )}
            
            {!isLoading && !generatedImage && !error && (
              <div className="space-y-3 text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full">
                  <Wand2 className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Your AI result will appear here</p>
                  <p className="text-sm text-gray-400">Upload a photo to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button 
          onClick={handleGenerate} 
          disabled={isLoading || !userImageFile} 
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary to-green-600 text-white font-bold rounded-xl disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed hover:from-green-600 hover:to-primary transition-all duration-300 transform hover:scale-[1.02] shadow-lg disabled:shadow-none"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Generate Virtual Try-On
            </>
          )}
        </button>
        
        {generatedImage && (
          <div className="flex gap-2">
            <a 
              href={generatedImage} 
              download={`ceaserlk-${productName}-try-on.png`}
              className="flex items-center justify-center gap-2 px-4 py-3 font-semibold text-white transition-colors duration-200 bg-gray-700 rounded-xl hover:bg-gray-600"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
            <button 
              onClick={() => {
                if (navigator.share && generatedImage) {
                  navigator.share({
                    title: `Check out how I look in this ${productName}!`,
                    text: 'AI Virtual Try-On from Ceaserlk',
                    url: window.location.href
                  });
                } else {
                  // Fallback: copy to clipboard
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 font-semibold text-white transition-colors duration-200 bg-gray-600 rounded-xl hover:bg-gray-700"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        )}
      </div>

      {/* Success Message */}
      {generatedImage && (
        <div className="p-4 mt-4 border rounded-lg bg-green-500/20 border-green-500/30">
          <p className="flex items-center gap-2 text-sm text-green-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Virtual try-on generated successfully! Download or share your result above.
          </p>
        </div>
      )}
    </div>
  );
}