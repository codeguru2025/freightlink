import { useState, useEffect } from "react";
import logoPath from "@assets/ChatGPT_Image_Feb_1,_2026,_09_08_34_AM_1769930479384.png";

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 2000 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [onComplete, minDuration]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      data-testid="splash-screen"
    >
      <div className="flex flex-col items-center gap-6 px-8">
        <div className="w-48 h-48 md:w-64 md:h-64 flex items-center justify-center animate-pulse">
          <img
            src={logoPath}
            alt="FreightLink ZW"
            className="w-full h-full object-contain drop-shadow-2xl"
          />
        </div>
        <div className="text-center">
          <p className="text-primary-foreground text-lg md:text-xl font-medium tracking-wide">
            Connecting Shippers & Transporters
          </p>
          <p className="text-primary-foreground/80 text-sm md:text-base mt-2">
            Across Zimbabwe
          </p>
        </div>
        <div className="mt-8 flex gap-1">
          <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
