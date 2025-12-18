import { useEffect, useState } from 'react';
import { List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
}

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export const TableOfContents = ({ content, className }: TableOfContentsProps) => {
  const [items, setItems] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Extract headings from markdown
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const headings: TOCItem[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, '').trim();
      const id = slugify(text);
      headings.push({ id, text, level });
    }

    setItems(headings);
  }, [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -66%' }
    );

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [items]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (items.length === 0) return null;

  return (
    <nav className={cn('print:hidden', className)}>
      <div className="flex items-center gap-2 mb-4 text-muted-foreground">
        <List className="h-4 w-4" />
        <span className="text-sm font-medium">Sumário</span>
      </div>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li
            key={item.id}
            style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
          >
            <button
              onClick={() => handleClick(item.id)}
              className={cn(
                'text-left w-full py-1.5 px-2 rounded-md transition-colors hover:bg-muted truncate',
                activeId === item.id
                  ? 'text-primary font-medium bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
