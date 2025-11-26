import { motion } from "framer-motion";

const AIAvatar = () => {
  return (
    <motion.div
      className="relative w-24 h-24 mx-auto"
      animate={{
        scale: [1, 1.02, 1],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-secondary to-accent opacity-30 blur-xl" />
      
      {/* Main container */}
      <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary via-secondary to-accent p-1 shadow-2xl">
        <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
          {/* Neural Brain SVG */}
          <svg
            className="w-16 h-16"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Neural connections (lines) */}
            <motion.line
              x1="30" y1="30" x2="50" y2="50"
              stroke="url(#gradient1)"
              strokeWidth="2"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            />
            <motion.line
              x1="70" y1="30" x2="50" y2="50"
              stroke="url(#gradient1)"
              strokeWidth="2"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            />
            <motion.line
              x1="30" y1="70" x2="50" y2="50"
              stroke="url(#gradient1)"
              strokeWidth="2"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
            />
            <motion.line
              x1="70" y1="70" x2="50" y2="50"
              stroke="url(#gradient1)"
              strokeWidth="2"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.9 }}
            />
            
            {/* Central brain shape */}
            <motion.path
              d="M50 35 Q 40 40, 40 50 Q 40 60, 50 65 Q 60 60, 60 50 Q 60 40, 50 35 Z"
              fill="url(#gradient2)"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            {/* Neural nodes */}
            <motion.circle
              cx="30" cy="30" r="4"
              fill="hsl(var(--primary))"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            />
            <motion.circle
              cx="70" cy="30" r="4"
              fill="hsl(var(--primary))"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            />
            <motion.circle
              cx="30" cy="70" r="4"
              fill="hsl(var(--primary))"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
            />
            <motion.circle
              cx="70" cy="70" r="4"
              fill="hsl(var(--primary))"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.9 }}
            />
            <motion.circle
              cx="50" cy="50" r="6"
              fill="hsl(var(--accent))"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            {/* Gradients */}
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

export default AIAvatar;
