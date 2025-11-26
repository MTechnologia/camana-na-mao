import { motion } from "framer-motion";

interface AIWelcomeProps {
  userName?: string;
}

const AIWelcome = ({ userName = "Cidadão" }: AIWelcomeProps) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <motion.div
      className="text-center mb-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-2xl font-bold text-foreground mb-2">
        {getGreeting()}, {userName}!
      </h1>
      <p className="text-muted-foreground">
        Como posso ajudar você hoje?
      </p>
    </motion.div>
  );
};

export default AIWelcome;
