"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Check, ShoppingBag, Truck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

// Helper function to detect video URLs
const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov|m4v|MOV|MP4)$/i.test(url);

// --- Type Definitions ---
type StockInfo = { id: string; size: string; stock: number };
type ProductVariant = {
  variantId: string;
  price: string;
  compareAtPrice: string | null;
  thumbnailUrl: string;
  colorName: string;
  colorHex: string;
  images: { id: string, url: string }[];
  stock: StockInfo[];
};
type Product = {
  id: string;
  name: string;
  shipping_cost?: string | number | null;
  blockedPaymentMethods?: string[];
  variants: ProductVariant[];
};

const OutOfStockLine = () => (
  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-400 rotate-[-25deg] transform"></div>
);

// Size sorting utility - orders sizes as XS, S, M, L, XL, XXL
const sizeOrder: Record<string, number> = {
  'XS': 0,
  'S': 1,
  'M': 2,
  'L': 3,
  'XL': 4,
  'XXL': 5,
};

const sortStockItems = (items: StockInfo[]): StockInfo[] => {
  const sorted = [...items].sort((a, b) => {
    const orderA = sizeOrder[a.size.toUpperCase()] ?? 999;
    const orderB = sizeOrder[b.size.toUpperCase()] ?? 999;
    return orderA - orderB;
  });
  return sorted;
};

export const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useCart();
  const { user, isGuest } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showAdded, setShowAdded] = useState(false);

  const hasValidData = product?.variants?.length > 0;
  const activeVariant = hasValidData ? product.variants[activeVariantIndex] : null;

  useEffect(() => {
    if (activeVariant) {
      const firstAvailableSize = activeVariant.stock.find(s => s.stock > 0)?.size || null;
      setSelectedSize(firstAvailableSize);
    }
  }, [activeVariant]);

  if (!hasValidData || !activeVariant) {
    return null;
  }

  const price = parseFloat(activeVariant.price);
  const installment = price / 3;
  const hasFreeDelivery = product.shipping_cost !== undefined
    && (product.shipping_cost === null || Number(product.shipping_cost) <= 0);
  const blockedPaymentMethods = new Set((product.blockedPaymentMethods || []).map((method) => method.toUpperCase()));
  const bnplProviders = [
    ...(!blockedPaymentMethods.has('KOKO') ? ['Koko'] : []),
    ...(!blockedPaymentMethods.has('MINTPAY') ? ['MintPay'] : []),
  ];
  const compareAtPrice = activeVariant.compareAtPrice ? parseFloat(activeVariant.compareAtPrice) : null;
  const isOnSale = compareAtPrice && compareAtPrice > price;
  // --- Only use first 2 images, no videos ---
  const imagesOnly = Array.isArray(activeVariant.images) && activeVariant.images.length > 0 
    ? activeVariant.images.filter(img => !isVideoUrl(img.url)).slice(0, 2)
    : [];
  // Also check if thumbnail is a video
  const thumbnailIsImage = activeVariant.thumbnailUrl && !isVideoUrl(activeVariant.thumbnailUrl);
  const mainImage = imagesOnly[0]?.url || (thumbnailIsImage ? activeVariant.thumbnailUrl : null) || '/images/image.jpg';
  const hoverImage = imagesOnly[1]?.url || mainImage;
  const currentImageUrl = isHovered ? hoverImage : mainImage;
  const totalStock = activeVariant.stock.reduce((sum, s) => sum + s.stock, 0);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user && !isGuest) {
      // Store cart intent before redirecting to login
      if (selectedSize) {
        const selectedSku = activeVariant.stock.find(s => s.size === selectedSize);
        if (selectedSku && selectedSku.stock > 0) {
          sessionStorage.setItem('addToCartAfterLogin', JSON.stringify({
            skuId: selectedSku.id,
            quantity: 1,
            timestamp: Date.now()
          }));
        }
      }
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!selectedSize) { alert("Please select a size."); return; }
    const selectedSku = activeVariant.stock.find(s => s.size === selectedSize);
    if (!selectedSku || selectedSku.stock <= 0) { alert("This size is out of stock."); return; }
    setIsAdding(true);
    try {
      await addToCart(selectedSku.id, 1);
      setShowAdded(true);
      setTimeout(() => setShowAdded(false), 2000);
    } catch (error) {
      console.error("Failed to add to cart:", error);
      alert("Could not add item to cart.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      className="group flex h-full flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex h-full flex-col bg-white">
        <Link
          href={`/product/${product.id}?variant=${activeVariant.variantId}`}
          className="relative block aspect-[5/7] w-full overflow-hidden bg-[#f0f1ef]"
        >
          <Image
            key={currentImageUrl}
            src={currentImageUrl}
            alt={`${product.name} - ${activeVariant.colorName}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {isOnSale && (
            <span className="absolute left-3 top-3 bg-[#1a1a1a] px-2.5 py-1 text-[10px] font-semibold uppercase text-white">
              Sale
            </span>
          )}
        </Link>

        <div className="flex flex-1 flex-col px-1 pt-3 pb-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-[#1a1a1a]">{product.name}</h3>
              <p className="mt-0.5 truncate text-xs text-[#777]">{activeVariant.colorName}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <span className="text-sm font-bold text-[#1a1a1a]">
                LKR {price.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {isOnSale && (
                <span className="text-[11px] text-[#888] line-through">
                  LKR {compareAtPrice!.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>

          {bnplProviders.length > 0 && (
            <div className="mt-1">
              <p className="text-[11px] leading-snug text-[#666]">
                3 payments of LKR {installment.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="mt-1 flex h-4 items-center gap-2" aria-label={`Available installment providers: ${bnplProviders.join(' and ')}`}>
                {bnplProviders.includes('Koko') && (
                  <Image
                    src="/assets/Koko Merchant Toolkit V4.0/Koko Assets/Koko logo/MAINLogo-HD_H.png"
                    alt="Koko"
                    width={46}
                    height={16}
                    className="h-4 w-[46px] object-contain object-left"
                  />
                )}
                {bnplProviders.length > 1 && <span className="h-3 border-l border-[#d5d5d5]" aria-hidden="true" />}
                {bnplProviders.includes('MintPay') && (
                  <Image
                    src="/assets/mintpay/mintpaylogo.png"
                    alt="MintPay"
                    width={42}
                    height={16}
                    className="h-4 w-[42px] object-contain object-left"
                  />
                )}
              </div>
            </div>
          )}

          {hasFreeDelivery && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#006633]">
              <Truck size={13} aria-hidden="true" />
              Delivery is free
            </p>
          )}

          {product.variants.length > 1 && (
            <div className="mt-3 flex items-center gap-2 border-t border-[#ededed] pt-3">
              {product.variants.map((variant, index) => (
                <button
                  key={variant.variantId}
                  type="button"
                  onMouseEnter={() => setActiveVariantIndex(index)}
                  onClick={(e) => { e.preventDefault(); setActiveVariantIndex(index); }}
                  aria-label={`Select color ${variant.colorName}`}
                  aria-pressed={activeVariantIndex === index}
                  className={`h-5 w-5 rounded-full border border-white outline outline-1 outline-offset-1 transition-colors ${
                    activeVariantIndex === index ? 'outline-[#1a1a1a]' : 'outline-[#d5d5d5] hover:outline-[#777]'
                  }`}
                  style={{ backgroundColor: variant.colorHex }}
                />
              ))}
            </div>
          )}

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase text-[#777]">
              <span>Size</span>
              <span>{totalStock === 0 ? 'Out of stock' : selectedSize ? `Selected: ${selectedSize}` : 'Choose a size'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sortStockItems(activeVariant.stock).map((stockItem) => (
                <button
                  key={stockItem.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (stockItem.stock > 0) setSelectedSize(stockItem.size);
                  }}
                  disabled={stockItem.stock <= 0}
                  aria-pressed={selectedSize === stockItem.size}
                  className={`relative flex h-8 min-w-8 items-center justify-center border px-2 text-xs transition-colors disabled:cursor-not-allowed ${
                    stockItem.stock <= 0
                      ? 'border-[#e5e5e5] bg-[#f5f5f5] text-[#aaa]'
                      : selectedSize === stockItem.size
                        ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                        : 'border-[#dedede] bg-white text-[#333] hover:border-[#1a1a1a]'
                  }`}
                >
                  {stockItem.size}
                  {stockItem.stock <= 0 && <OutOfStockLine />}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!selectedSize || totalStock === 0 || isAdding || showAdded}
            className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-2 text-xs font-semibold transition-all duration-300 disabled:cursor-not-allowed ${
              showAdded
                ? 'scale-[1.02] bg-[#e9f2ec] text-[#17643a]'
                : 'bg-[#1a1a1a] text-white hover:bg-[#333] disabled:bg-[#d4d4d4]'
            }`}
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : showAdded ? (
              <><Check className="h-4 w-4 animate-bounce-in" /> Added to bag</>
            ) : (
              <><ShoppingBag className="h-4 w-4" /> Add to bag</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};