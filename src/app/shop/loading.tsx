export default function ShopLoading() {
  return (
    <div className="py-12 bg-white">
      <div className="container px-6 mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>

        {/* Filter Sidebar Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Filter sections */}
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border-b border-gray-200 pb-4">
                  <div className="h-5 bg-gray-200 rounded w-24 mb-3 animate-pulse"></div>
                  <div className="space-y-2">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Products Grid Skeleton */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border animate-pulse">
                  {/* Product Image Skeleton */}
                  <div className="aspect-square bg-gray-200 rounded-t-lg"></div>
                  
                  {/* Product Info Skeleton */}
                  <div className="p-4">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                    <div className="flex justify-between items-center">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
