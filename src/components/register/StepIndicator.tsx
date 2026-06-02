import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const StepIndicator = ({ currentStep, totalSteps }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            step === currentStep
              ? "w-8 bg-primary"
              : step < currentStep
                ? "w-2 bg-primary/60"
                : "w-2 bg-muted",
          )}
        />
      ))}
    </div>
  );
};

export default StepIndicator;
