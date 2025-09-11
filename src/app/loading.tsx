export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {/* Animated Loading Spinner */}
        <div className="relative mb-8">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto"></div>
          <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-accent rounded-full animate-ping mx-auto"></div>
        </div>
        
        {/* Loading Text */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Loading...
        </h2>
        <p className="text-gray-600">
          Getting things ready for you
        </p>
        
        {/* Animated Dots */}
        <div className="flex justify-center items-center mt-4 space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
}
