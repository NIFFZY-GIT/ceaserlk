// src/app/components/MarqueeBar.tsx
// This version uses a pure CSS animation for a smooth, continuous scroll.

const motivationalQuotes = [
  "Believe you can and you're halfway there.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "The only way to do great work is to love what you do.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Strive for progress, not perfection."
];

const MarqueeBar = () => {
  return (
    // The outer container hides the overflow
    <div className="relative flex overflow-x-hidden text-white bg-red-600 h-9">
      {/* The inner container holds the duplicated content and has the animation */}
      <div className="flex animate-marquee whitespace-nowrap">
        {/* Render the first set of quotes */}
        {motivationalQuotes.map((quote, index) => (
          <div
            key={index}
            className="flex items-center justify-center flex-shrink-0 px-8"
          >
            <p className="text-base font-semibold text-center md:text-lg">
              {quote}
            </p>
          </div>
        ))}

        {/* Render the second, identical set of quotes for the seamless loop */}
        {motivationalQuotes.map((quote, index) => (
          <div
            key={`duplicate-${index}`}
            className="flex items-center justify-center flex-shrink-0 px-8"
            aria-hidden="true" // Hide the duplicated content from screen readers
          >
            <p className="text-base font-semibold text-center md:text-lg">
              {quote}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarqueeBar;