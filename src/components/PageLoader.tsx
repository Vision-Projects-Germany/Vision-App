import { memo, useEffect, useState } from "react";

export const PageLoader = memo(function PageLoader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simuliere Fortschritt während des Ladens
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Spinner Animation */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-surface-2"></div>
          <div 
            className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin"
            style={{ animationDuration: '0.8s' }}
          ></div>
        </div>

        {/* Progress Bar */}
        <div className="w-48 space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-xs text-muted">
            Lädt Inhalte... {Math.round(progress)}%
          </p>
        </div>
      </div>
    </div>
  );
});
