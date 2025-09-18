// Utility functions for trading card downloads

export function generateDownloadToken(userEmail: string, productId: string): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET is not configured in environment variables');
    // Return a fallback token for development - should not be used in production
    return Buffer.from(`${userEmail}-${productId}-fallback-secret`).toString('base64');
  }
  return Buffer.from(`${userEmail}-${productId}-${jwtSecret}`).toString('base64');
}

export function generateDownloadUrl(userEmail: string, productId: string): string {
  const token = generateDownloadToken(userEmail, productId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  console.log('Using base URL for download:', baseUrl);
  return `${baseUrl}/api/download/trading-card?token=${encodeURIComponent(token)}&product_id=${encodeURIComponent(productId)}&user_email=${encodeURIComponent(userEmail)}`;
}

export function generateShareableLink(userEmail: string, productId: string, productName: string): string {
  const downloadUrl = generateDownloadUrl(userEmail, productId);
  const message = `Check out my ${productName} trading card! Download it here: ${downloadUrl}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
}

export function generateWhatsAppShare(userEmail: string, productId: string, productName: string): string {
  const downloadUrl = generateDownloadUrl(userEmail, productId);
  const message = `Check out my ${productName} trading card! Download it here: ${downloadUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function generateFacebookShare(userEmail: string, productId: string): string {
  const downloadUrl = generateDownloadUrl(userEmail, productId);
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(downloadUrl)}`;
}