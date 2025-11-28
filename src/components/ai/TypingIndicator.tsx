import { motion } from "framer-motion";

const TypingIndicator = () => {
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -6 }
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  return (
    <div className="flex items-start gap-3">
      {/* AI Avatar */}
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg 
            className="w-4 h-4 text-primary" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
            <circle cx="7.5" cy="14.5" r="1.5" fill="currentColor" />
            <circle cx="16.5" cy="14.5" r="1.5" fill="currentColor" />
          </svg>
        </motion.div>
      </div>

      {/* Typing Bubble */}
      <motion.div 
        className="bg-muted rounded-2xl rounded-tl-md px-4 py-3"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="flex items-center gap-1.5"
          variants={containerVariants}
          initial="initial"
          animate="animate"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 bg-primary/60 rounded-full"
              variants={dotVariants}
              transition={{
                duration: 0.4,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
                delay: i * 0.15
              }}
            />
          ))}
        </motion.div>
        
        {/* Optional text */}
        <motion.span 
          className="text-xs text-muted-foreground mt-1.5 block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          Pensando...
        </motion.span>
      </motion.div>
    </div>
  );
};

export default TypingIndicator;