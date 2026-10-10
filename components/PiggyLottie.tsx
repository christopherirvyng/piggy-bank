'use client';

import { useState, useEffect, useRef } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface PiggyLottieProps {
  src: string;
  lottieRef?: any;
}

export default function PiggyLottie({ src, lottieRef }: PiggyLottieProps) {
  const [isMounted, setIsMounted] = useState(false);
  const dotLottieRef = useRef<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (lottieRef) {
      lottieRef.current = {
        play: () => dotLottieRef.current?.play(),
        pause: () => dotLottieRef.current?.pause(),
        stop: () => dotLottieRef.current?.stop(), // Tambahkan fungsi stop (reset)
      };
    }
  }, [lottieRef]);

  if (!isMounted) return null;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <DotLottieReact
        src={src}
        dotLottieRefCallback={(dotLottie) => {
          dotLottieRef.current = dotLottie;
        }}
        loop
        autoplay={false}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}