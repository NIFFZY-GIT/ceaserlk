export default function ShopLoading() {
  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Header Skeleton */}
      <div className="bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          {/* Breadcrumb skeleton */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-4 w-12 bg-white/20 rounded animate-pulse" />
            <div className="h-4 w-4 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-16 bg-white/20 rounded animate-pulse" />
          </div>
          
          {/* Title skeleton */}
          <div className="h-10 w-64 bg-white/20 rounded animate-pulse mb-4" />
          <div className="h-5 w-80 bg-white/10 rounded animate-pulse" />
          
          {/* Signature stripe */}
          <div className="flex h-1.5 w-32 mt-6">
            <div className="flex-1 bg-[#006633]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#cc0000]" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="flex gap-8 lg:gap-12">
          {/* Filter Sidebar Skeleton - Desktop only */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white border border-[#e5e5e5] p-6 sticky top-24">
              <div className="h-6 w-20 bg-[#e5e5e5] rounded animate-pulse mb-6" />
              
              {/* Filter sections */}
              {[1, 2, 3].map((section) => (
                <div key={section} className="mb-6 pb-6 border-b border-[#e5e5e5] last:border-0">
                  <div className="h-4 w-24 bg-[#e5e5e5] rounded animate-pulse mb-4" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="h-4 w-4 bg-[#f0f0f0] rounded animate-pulse" />
                        <div className="h-3 w-16 bg-[#f0f0f0] rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="h-10 w-full bg-[#f0f0f0] rounded animate-pulse mt-4" />
            </div>
          </aside>

          {/* Product Grid Skeleton */}
          <section className="flex-1">
            {/* Toolbar skeleton */}
            <div className="flex items-center justify-between pb-6 border-b border-[#e5e5e5] mb-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-24 bg-[#e5e5e5] rounded animate-pulse lg:hidden" />
                <div className="hidden lg:block h-10 w-24 bg-[#e5e5e5] rounded animate-pulse" />
              </div>
              <div className="h-4 w-32 bg-[#e5e5e5] rounded animate-pulse" />
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {Array.from({ length: 9 }).map((_, index) => (
                <div
                  key={index}
                  className="group bg-white border border-[#e5e5e5] overflow-hidden"
                >
                  {/* Image skeleton with pulse */}
                  <div className="aspect-[3/4] bg-[#f0f0f0] animate-pulse" />
                  
                  {/* Content skeleton */}
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-3/4 bg-[#e5e5e5] rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-[#f0f0f0] rounded animate-pulse" />
                    <div className="flex items-center justify-between pt-2">
                      <div className="h-5 w-20 bg-[#e5e5e5] rounded animate-pulse" />
                      <div className="flex gap-1">
                        {[1, 2, 3].map((dot) => (
                          <div key={dot} className="h-4 w-4 bg-[#f0f0f0] rounded-full animate-pulse" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
