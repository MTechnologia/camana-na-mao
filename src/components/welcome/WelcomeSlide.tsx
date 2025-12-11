import { motion } from "framer-motion";
import Lottie from "lottie-react";

interface WelcomeSlideProps {
  animationData: object;
  title: string;
  description: string;
  gradient: string;
  isActive: boolean;
}

const WelcomeSlide = ({ animationData, title, description, gradient, isActive }: WelcomeSlideProps) => {
  return (
    <div className={`flex-[0_0_100%] min-w-0 h-full ${gradient}`}>
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: isActive ? 1 : 0.8, opacity: isActive ? 1 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-6 w-48 h-48 md:w-56 md:h-56"
        >
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={isActive}
            className="w-full h-full drop-shadow-2xl"
          />
        </motion.div>

        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: isActive ? 0 : 20, opacity: isActive ? 1 : 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg leading-tight"
        >
          {title}
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: isActive ? 0 : 20, opacity: isActive ? 1 : 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-white/90 max-w-sm leading-relaxed"
        >
          {description}
        </motion.p>
      </div>
    </div>
  );
};

export default WelcomeSlide;
