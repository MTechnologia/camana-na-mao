import { motion } from "framer-motion";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionResumeProps {
  lastTopic: string;
  timeAgo: string;
  onContinue: () => void;
  onNewChat: () => void;
}

const SessionResume = ({ lastTopic, timeAgo, onContinue, onNewChat }: SessionResumeProps) => {
  return (
    <motion.div
      className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-6 mb-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">
            Continuar de onde parou?
          </h3>
          <p className="text-sm text-muted-foreground mb-1">
            "{lastTopic}"
          </p>
          <p className="text-xs text-muted-foreground">
            {timeAgo}
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <Button
          onClick={onContinue}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          Continuar
        </Button>
        <Button
          onClick={onNewChat}
          variant="outline"
          className="flex-1"
        >
          <X className="w-4 h-4 mr-2" />
          Nova conversa
        </Button>
      </div>
    </motion.div>
  );
};

export default SessionResume;
