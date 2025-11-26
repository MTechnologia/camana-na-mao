import { MessageCircle, Calendar, Search, Star, Bus } from "lucide-react";
import { motion } from "framer-motion";

interface InteractionButtonsProps {
  onSelect: (action: string) => void;
}

const InteractionButtons = ({ onSelect }: InteractionButtonsProps) => {
  const buttons = [
    {
      id: "share",
      icon: MessageCircle,
      label: "Quero contar uma coisa",
      color: "from-pink-500 to-rose-500",
      hoverColor: "hover:shadow-pink-500/50",
    },
    {
      id: "plan",
      icon: Calendar,
      label: "Ajude-me a me planejar",
      color: "from-purple-500 to-indigo-500",
      hoverColor: "hover:shadow-purple-500/50",
    },
    {
      id: "services",
      icon: Search,
      label: "Conhecer serviços disponíveis",
      color: "from-blue-500 to-cyan-500",
      hoverColor: "hover:shadow-blue-500/50",
    },
    {
      id: "evaluate",
      icon: Star,
      label: "Avaliar um serviço",
      color: "from-amber-500 to-orange-500",
      hoverColor: "hover:shadow-amber-500/50",
    },
    {
      id: "transport",
      icon: Bus,
      label: "Relatar problema no transporte",
      color: "from-green-500 to-emerald-500",
      hoverColor: "hover:shadow-green-500/50",
    },
  ];

  return (
    <div className="space-y-3 mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        O que você gostaria?
      </h3>
      
      {buttons.map((button, index) => {
        const IconComponent = button.icon;
        return (
          <motion.button
            key={button.id}
            onClick={() => onSelect(button.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${button.color} text-white hover:scale-[1.02] transition-all duration-200 shadow-lg ${button.hoverColor} group`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <IconComponent className="w-6 h-6" />
            </div>
            <span className="font-semibold text-left">{button.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default InteractionButtons;
