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

export const ProductCard = ({ product, featured = false }: { product: Product; featured?: boolean }) => {
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
          className={`relative block w-full overflow-hidden bg-[#f0f1ef] ${featured ? 'aspect-[3/4]' : 'aspect-[5/7]'}`}
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
          {hasFreeDelivery && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-white/95 px-2.5 py-1.5 text-[10px] font-semibold text-[#006633] shadow-sm">
              <Truck size={13} aria-hidden="true" />
              Free delivery
            </span>
          )}
        </Link>

        <div className={`grid flex-1 px-1 pb-1 ${featured ? 'pt-2' : 'pt-3'} grid-rows-[42px_34px_30px_58px_48px] gap-y-1`}>
          <div className="flex min-w-0 items-start justify-between gap-2 overflow-hidden">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-[#1a1a1a]">{product.name}</h3>
              <p className="mt-0.5 truncate text-xs text-[#777]">{activeVariant.colorName}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end leading-tight">
              <span className="text-sm font-bold text-[#1a1a1a]">
                LKR {price.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {isOnSale ? (
                <span className="text-[11px] text-[#888] line-through">
                  LKR {compareAtPrice!.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              ) : <span aria-hidden="true" className="text-[11px]">&nbsp;</span>}
            </div>
          </div>

          <div className="flex h-[34px] min-w-0 items-center justify-between gap-1 overflow-hidden">
            {bnplProviders.length > 0 ? (
              <>
                <p className="truncate text-[11px] leading-snug text-[#666]">
                  3 payments of LKR {installment.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="flex h-4 shrink-0 items-center gap-1.5" aria-label={`Available installment providers: ${bnplProviders.join(' and ')}`}>
                  {bnplProviders.includes('Koko') && (
                    <Image src="/assets/Koko Merchant Toolkit V4.0/Koko Assets/Koko logo/MAINLogo-HD_H.png" alt="Koko" width={featured ? 38 : 46} height={16} className={`h-4 object-contain object-left ${featured ? 'w-[38px]' : 'w-[46px]'}`} />
                  )}
                  {bnplProviders.length > 1 && <span className="h-3 border-l border-[#d5d5d5]" aria-hidden="true" />}
                  {bnplProviders.includes('MintPay') && (
                    <Image src="/assets/mintpay/mintpaylogo.png" alt="MintPay" width={featured ? 36 : 42} height={16} className={`h-4 object-contain object-left ${featured ? 'w-[36px]' : 'w-[42px]'}`} />
                  )}
                </div>
              </>
            ) : <span aria-hidden="true" />}
          </div>

          <div className="flex h-[30px] items-center gap-2 border-t border-[#ededed] pt-1">
            {product.variants.length > 1 ? product.variants.map((variant, index) => (
              <button
                key={variant.variantId}
                type="button"
                onMouseEnter={() => setActiveVariantIndex(index)}
                onClick={(event) => { event.preventDefault(); setActiveVariantIndex(index); }}
                aria-label={`Select color ${variant.colorName}`}
                aria-pressed={activeVariantIndex === index}
                className={`h-5 w-5 shrink-0 rounded-full border border-white outline outline-1 outline-offset-1 transition-colors ${
                  activeVariantIndex === index ? 'outline-[#1a1a1a]' : 'outline-[#d5d5d5] hover:outline-[#777]'
                }`}
                style={{ backgroundColor: variant.colorHex }}
              />
            )) : <span aria-hidden="true" />}
          </div>

          <div className="h-[58px] min-w-0 overflow-hidden">
            <div className="mb-1 flex items-center justify-between gap-1 text-[11px] font-semibold uppercase text-[#555]">
              <span>Choose size</span>
              <span className="truncate text-[#1a1a1a]">{totalStock === 0 ? 'Out of stock' : selectedSize ? `Selected: ${selectedSize}` : 'Select one'}</span>
            </div>
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sortStockItems(activeVariant.stock).map((stockItem) => (
                <button
                  key={stockItem.id}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    if (stockItem.stock > 0) setSelectedSize(stockItem.size);
                  }}
                  disabled={stockItem.stock <= 0}
                  aria-pressed={selectedSize === stockItem.size}
                  className={`relative flex h-9 min-w-9 shrink-0 items-center justify-center border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                    stockItem.stock <= 0
                      ? 'border-[#e5e5e5] bg-[#f5f5f5] text-[#aaa]'
                      : selectedSize === stockItem.size
                        ? 'border-2 border-[#1a1a1a] bg-[#1a1a1a] font-bold text-white'
                        : 'border-[#dedede] bg-white text-[#333] hover:border-[#1a1a1a]'
                  }`}
                >
                  {stockItem.size}
                  {stockItem.stock <= 0 && <OutOfStockLine />}
                </button>
              ))}
            </div>
          </div>

          {featured ? (
            <Link href={`/product/${product.id}?variant=${activeVariant.variantId}`} className="mt-auto inline-flex h-12 w-full items-center justify-center gap-2 bg-[#1a1a1a] text-xs font-semibold text-white transition-colors hover:bg-[#333]">
              Choose options <ShoppingBag className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!selectedSize || totalStock === 0 || isAdding || showAdded}
              className={`mt-auto inline-flex h-12 w-full items-center justify-center gap-2 text-xs font-semibold transition-all duration-300 disabled:cursor-not-allowed ${
                showAdded
                  ? 'scale-[1.02] bg-[#e9f2ec] text-[#17643a]'
                  : 'bg-[#1a1a1a] text-white hover:bg-[#333] disabled:bg-[#d4d4d4]'
              }`}
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : showAdded ? <><Check className="h-4 w-4 animate-bounce-in" /> Added to bag</> : <><ShoppingBag className="h-4 w-4" /> Add to bag</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};