import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Section {
  id: string;
  text: string;
}

interface SectionNavigationProps {
  sections: Section[];
  currentSectionId: string;
}

export const SectionNavigation = ({ sections, currentSectionId }: SectionNavigationProps) => {
  const currentIndex = sections.findIndex(s => s.id === currentSectionId);
  const prevSection = currentIndex > 0 ? sections[currentIndex - 1] : null;
  const nextSection = currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;

  const navigateTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!prevSection && !nextSection) return null;

  return (
    <div className="flex items-center justify-between gap-4 mt-12 pt-6 border-t border-border print:hidden">
      {prevSection ? (
        <Button
          variant="ghost"
          onClick={() => navigateTo(prevSection.id)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          <div className="text-left">
            <span className="text-xs block">Anterior</span>
            <span className="text-sm font-medium truncate max-w-[200px] block">
              {prevSection.text}
            </span>
          </div>
        </Button>
      ) : (
        <div />
      )}
      
      {nextSection ? (
        <Button
          variant="ghost"
          onClick={() => navigateTo(nextSection.id)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <div className="text-right">
            <span className="text-xs block">Próxima</span>
            <span className="text-sm font-medium truncate max-w-[200px] block">
              {nextSection.text}
            </span>
          </div>
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : (
        <div />
      )}
    </div>
  );
};
