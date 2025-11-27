import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface WordData {
  text: string;
  count: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

interface WordCloudProps {
  words: WordData[];
  onWordClick?: (word: string) => void;
}

export const WordCloud = ({ words, onWordClick }: WordCloudProps) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-chart-1';
      case 'negative':
        return 'text-chart-5';
      default:
        return 'text-chart-3';
    }
  };

  const getFontSize = (count: number, maxCount: number) => {
    const minSize = 12;
    const maxSize = 48;
    const ratio = count / maxCount;
    return minSize + (maxSize - minSize) * ratio;
  };

  const maxCount = Math.max(...words.map(w => w.count));

  return (
    <div className="w-full h-full flex flex-wrap items-center justify-center gap-3 p-4">
      {words.map((word, index) => (
        <motion.button
          key={`${word.text}-${index}`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => onWordClick?.(word.text)}
          className={cn(
            'font-bold hover:opacity-70 transition-all cursor-pointer',
            getSentimentColor(word.sentiment)
          )}
          style={{
            fontSize: `${getFontSize(word.count, maxCount)}px`,
          }}
        >
          {word.text}
        </motion.button>
      ))}
    </div>
  );
};
