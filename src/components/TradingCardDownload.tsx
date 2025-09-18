'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, Share2, Copy, Eye } from 'lucide-react';

interface TradingCardDownloadProps {
  userEmail: string;
  productId: string;
  productName: string;
  hasTrading: boolean;
  className?: string;
}

export default function TradingCardDownload({ 
  userEmail, 
  productId, 
  productName, 
  hasTrading,
  className = '' 
}: TradingCardDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);

  // Auto-load preview on component mount
  useEffect(() => {
    if (!hasTrading) return;
    
    const loadPreview = async () => {
      try {
        const urlResponse = await fetch('/api/generate-download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail, productId })
        });

        if (!urlResponse.ok) {
          const errorData = await urlResponse.json();
          throw new Error(errorData.error || 'Failed to generate preview URL');
        }

        const { downloadUrl } = await urlResponse.json();
        setPreviewUrl(downloadUrl);
      } catch (error) {
        console.error('Preview error:', error);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadPreview();
  }, [hasTrading, userEmail, productId]);

  if (!hasTrading) {
    return null;
  }

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      console.log('Generating download URL for:', { userEmail, productId, productName });
      
      // Generate secure download URL server-side
      const urlResponse = await fetch('/api/generate-download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, productId })
      });

      if (!urlResponse.ok) {
        const errorData = await urlResponse.json();
        throw new Error(errorData.error || 'Failed to generate download URL');
      }

      const { downloadUrl } = await urlResponse.json();
      console.log('Generated download URL:', downloadUrl);
      
      const response = await fetch(downloadUrl);
      console.log('Download response status:', response.status);
      console.log('Download response headers:', Object.fromEntries(response.headers));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download failed:', errorText);
        throw new Error(`Download failed: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${productName}-trading-card.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download trading card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      // Generate secure download URL server-side
      const urlResponse = await fetch('/api/generate-download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, productId })
      });

      if (!urlResponse.ok) {
        const errorData = await urlResponse.json();
        throw new Error(errorData.error || 'Failed to generate download URL');
      }

      const { downloadUrl } = await urlResponse.json();
      await navigator.clipboard.writeText(downloadUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const handleShare = async () => {
    try {
      const urlResponse = await fetch('/api/generate-download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, productId })
      });

      if (!urlResponse.ok) {
        throw new Error('Failed to generate share URL');
      }

      const { downloadUrl } = await urlResponse.json();
      const shareData = {
        title: `${productName} Trading Card`,
        text: `Check out my ${productName} trading card!`,
        url: downloadUrl,
      };

      // Use native Web Share API if available
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareData.text} ${downloadUrl}`);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <div className={`trading-card-download ${className}`}>
      <div className="p-4 border border-gray-700 rounded-lg shadow-lg bg-gradient-to-r from-gray-900 to-gray-800">
        <h3 className="flex items-center mb-3 text-lg font-semibold text-gray-100">
          <Download className="w-5 h-5 mr-2 text-primary" />
          Trading Card Available
        </h3>
        
        <p className="mb-4 text-gray-300">
          You have unlocked the exclusive trading card for <strong className="text-primary">{productName}</strong>!
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center px-4 py-2 space-x-2 text-white transition-all duration-200 rounded-lg shadow-md bg-primary hover:bg-primary/90 disabled:bg-primary/50 hover:shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Downloading...' : 'Download Card'}</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center px-4 py-2 space-x-2 text-gray-300 transition-all duration-200 bg-gray-800 border border-gray-600 rounded-lg shadow-md hover:bg-gray-700 hover:text-white hover:shadow-lg"
          >
            <Copy className="w-4 h-4" />
            <span>{copySuccess ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center px-4 py-2 space-x-2 text-gray-300 transition-all duration-200 bg-gray-800 border border-gray-600 rounded-lg shadow-md hover:bg-gray-700 hover:text-white hover:shadow-lg"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>

        {/* Trading Card Preview - Always Visible */}
        {isLoadingPreview ? (
          <div className="p-4 mb-4 border border-gray-600 rounded-lg bg-gray-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 border-2 rounded-full border-primary border-t-transparent animate-spin"></div>
                <span className="text-sm text-gray-300">Loading preview...</span>
              </div>
            </div>
          </div>
        ) : previewUrl ? (
          <div className="p-4 mb-4 border border-gray-600 rounded-lg bg-gray-800/50 backdrop-blur-sm">
            <h4 className="flex items-center mb-3 text-lg font-semibold text-gray-100">
              <Eye className="w-5 h-5 mr-2 text-primary" />
              Trading Card Preview
            </h4>
            <div className="flex justify-center">
              <div className="relative max-w-sm p-2 bg-gray-900 rounded-lg">
                <Image
                  src={previewUrl}
                  alt={`${productName} Trading Card`}
                  width={300}
                  height={400}
                  className="object-contain rounded-lg shadow-2xl"
                  onError={(e) => {
                    console.error('Image load error:', e);
                    setPreviewUrl(null);
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 mb-4 border border-gray-600 rounded-lg bg-gray-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-center h-32">
              <span className="text-sm text-gray-400">Preview not available</span>
            </div>
          </div>
        )}

        <div className="mt-3 text-xs text-gray-400">
          * Trading card downloads are exclusive to purchasers and expire after 30 days
        </div>
      </div>
    </div>
  );
}