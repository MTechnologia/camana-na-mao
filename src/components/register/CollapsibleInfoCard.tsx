import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface CollapsibleInfoCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const CollapsibleInfoCard = ({ icon: Icon, title, description }: CollapsibleInfoCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-border bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <span className="font-medium text-foreground text-sm">{title}</span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </Card>
  );
};

export default CollapsibleInfoCard;
