import { motion } from "framer-motion";
import { transportProblems } from "@/data/transportProblems";
import { cn } from "@/lib/utils";

interface ProblemTypeSelectorProps {
  selectedType: string | null;
  onSelect: (type: string) => void;
}

export const ProblemTypeSelector = ({ selectedType, onSelect }: ProblemTypeSelectorProps) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {transportProblems.map((problem, index) => {
        const Icon = problem.icon;
        const isSelected = selectedType === problem.id;

        return (
          <motion.button
            key={problem.id}
            onClick={() => onSelect(problem.id)}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left",
              isSelected
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/50",
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center mb-2",
                problem.bgColor,
              )}
            >
              <Icon className={cn("w-5 h-5", problem.color)} />
            </div>
            <h3 className="font-semibold text-sm mb-1">{problem.label}</h3>
            <p className="text-xs text-muted-foreground">{problem.description}</p>
          </motion.button>
        );
      })}
    </div>
  );
};
