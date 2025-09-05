// src/app/components/MarqueeBar.tsx

// A single, powerful motivational sentence.
const motivationalSentence = "THE ONLY THING STANDING BETWEEN YOU AND YOUR GOAL IS THE STORY YOU KEEP TELLING YOURSELF THAT YOU CAN'T ACHIEVE IT • ";

const MarqueeBar = () => {
  return (
    // The main container acts as a "window" that hides the overflowing text.
    // `group` is used to pause the animation on hover.
    <div className="relative flex overflow-hidden bg-primary text-white py-2.5 group">
      
      {/* 
        This is the single, moving "snake".
        - `absolute` allows it to be positioned off-screen to start.
        - `whitespace-nowrap` is crucial to keep the sentence on one line.
        - `animate-marquee-rtl` applies our new right-to-left animation.
        - `group-hover:paused` stops the animation when the user hovers over the bar.
      */}
      <div className="absolute whitespace-nowrap animate-marquee-rtl group-hover:paused">
        <p className="font-bold uppercase tracking-wider text-sm">
          {/* We repeat the sentence to ensure a seamless loop for all screen sizes */}
          {motivationalSentence.repeat(5)}
        </p>
      </div>

    </div>
  );
};

export default MarqueeBar;