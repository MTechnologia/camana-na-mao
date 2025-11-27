import JourneySelector from "./JourneySelector";

interface ChatEmptyStateProps {
  onSuggestionClick: (message: string) => void;
}

const ChatEmptyState = ({ onSuggestionClick }: ChatEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 pb-8">
      <JourneySelector onSelect={() => {}} />
    </div>
  );
};

export default ChatEmptyState;
