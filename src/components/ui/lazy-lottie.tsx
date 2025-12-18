import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const Lottie = lazy(() => import('lottie-react'));

interface LazyLottieProps {
  animationData: object;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
}

const LottieLoader = ({ className }: { className?: string }) => (
  <Skeleton className={className || "w-48 h-48"} />
);

export const LazyLottie = ({ animationData, loop = true, autoplay = true, className }: LazyLottieProps) => {
  return (
    <Suspense fallback={<LottieLoader className={className} />}>
      <Lottie 
        animationData={animationData} 
        loop={loop} 
        autoplay={autoplay} 
        className={className} 
      />
    </Suspense>
  );
};

export default LazyLottie;
