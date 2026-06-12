import { ChevronLeft } from "lucide-react";
import { useSmartBack } from "@/hooks/useSmartBack";

interface PageHeaderProps {
  title?: string;
  onBack?: () => void;
  backTo?: string;
  rightElement?: React.ReactNode;
}

const PageHeader = ({ title, onBack, backTo, rightElement }: PageHeaderProps) => {
  // Back determinístico: honra backTo; senão usa histórico in-app; senão cai no
  // pai lógico da rota (NREF054).
  const smartBack = useSmartBack(backTo);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      smartBack();
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[100] bg-white dark:bg-background shadow-sm"
      style={{ height: "60px" }}
    >
      <div className="flex items-center justify-between px-4 h-full">
        <button
          onClick={handleBack}
          className="text-foreground hover:text-primary transition-colors"
          aria-label="Voltar"
        >
          <ChevronLeft size={24} strokeWidth={2} />
        </button>

        {title && <h1 className="text-sm font-medium text-foreground">{title}</h1>}

        <div className="w-6">{rightElement}</div>
      </div>
    </header>
  );
};

export default PageHeader;
