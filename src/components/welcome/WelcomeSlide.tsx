import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface WelcomeSlideProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  isActive: boolean;
}

const WelcomeSlide = ({ icon: Icon, title, description, gradient, isActive }: WelcomeSlideProps) => {
  return (
    <div className={`flex-[0_0_100%] min-w-0 h-full ${gradient}`}>
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: isActive ? 1 : 0.8, opacity: isActive ? 1 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl">
            <Icon className="w-16 h-16 text-white drop-shadow-lg" strokeWidth={1.5} />
          </div>
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
