import { motion } from "framer-motion";

const AIAvatar = () => {
  return (
    <motion.div
      className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center border-4 border-white shadow-lg mx-auto"
      animate={{
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    </motion.div>
  );
};

export default AIAvatar;
