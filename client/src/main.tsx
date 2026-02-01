import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import App from "./App";
import { SplashScreen } from "./components/splash-screen";
import "./index.css";

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    });
  }
}

function Root() {
  const [showSplash, setShowSplash] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    registerServiceWorker();
    
    const checkStandalone = () => {
      const isInStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isInStandaloneMode);
      
      if (!isInStandaloneMode) {
        setShowSplash(false);
      }
    };
    
    checkStandalone();
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && isStandalone && (
        <SplashScreen onComplete={handleSplashComplete} minDuration={2500} />
      )}
      <App />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
