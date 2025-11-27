import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarWithProgressProps {
  avatarUrl: string | null;
  userName: string;
  percentage: number;
  onClick?: () => void;
  className?: string;
}

export const AvatarWithProgress = ({
  avatarUrl,
  userName,
  percentage,
  onClick,
  className,
}: AvatarWithProgressProps) => {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const isComplete = percentage === 100;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = (percentage / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className={cn("relative w-12 h-12", className)} onClick={onClick}>
      {!isComplete && (
        <svg 
          className="absolute inset-0 -rotate-90 w-full h-full"
          viewBox="0 0 48 48"
        >
          {/* Background circle */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-muted/20"
          />
          {/* Progress circle */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="text-pink-500 transition-all duration-500"
          />
        </svg>
      )}
      
      {isComplete && (
        <svg 
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 48 48"
        >
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-green-500"
          />
        </svg>
      )}

      <Avatar className="absolute inset-[6px] cursor-pointer border-2 border-background">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={userName} />
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getInitials(userName || "U")}
          </AvatarFallback>
        )}
      </Avatar>

      {/* Badge de Check quando completo */}
      {isComplete && (
        <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full p-0.5 border-2 border-background shadow-sm z-10">
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </div>
      )}
    </div>
  );
};
