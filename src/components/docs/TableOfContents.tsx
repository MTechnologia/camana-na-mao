import { useEffect, useState, useMemo, useCallback } from "react";
import { List, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TOCItem {
  id: string;
  text: string;
  level: number;
  children: TOCItem[];
}

interface TableOfContentsProps {
  content: string;
  className?: string;
  onSectionChange?: (id: string) => void;
}

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\*\*/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const buildTOCTree = (headings: { id: string; text: string; level: number }[]): TOCItem[] => {
  const root: TOCItem[] = [];
  const stack: { item: TOCItem; level: number }[] = [];

  headings.forEach((heading) => {
    const item: TOCItem = { ...heading, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(item);
    } else {
      stack[stack.length - 1].item.children.push(item);
    }

    stack.push({ item, level: heading.level });
  });

  return root;
};

const TOCItemComponent = ({
  item,
  activeId,
  expandedIds,
  toggleExpand,
  depth = 0,
}: {
  item: TOCItem;
  activeId: string;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  depth?: number;
}) => {
  const hasChildren = item.children.length > 0;
  const isExpanded = expandedIds.has(item.id);
  const isActive = activeId === item.id;
  const isChildActive = item.children.some(
    (child) => child.id === activeId || child.children.some((c) => c.id === activeId),
  );

  const handleClick = () => {
    const element = document.getElementById(item.id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <li className="relative">
      <div className="flex items-center gap-1">
        {hasChildren && (
          <button
            onClick={() => toggleExpand(item.id)}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        {!hasChildren && <span className="w-4" />}

        <button
          onClick={handleClick}
          className={cn(
            "text-left flex-1 py-1.5 px-2 rounded-md transition-all text-sm truncate",
            "hover:bg-muted hover:text-foreground",
            isActive && "bg-primary/10 text-primary font-medium border-l-2 border-primary",
            isChildActive && !isActive && "text-primary/80",
            !isActive && !isChildActive && "text-muted-foreground",
            depth === 0 && "font-medium",
            depth === 1 && "text-[13px]",
            depth >= 2 && "text-xs",
          )}
        >
          {item.text}
        </button>
      </div>

      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-4 mt-1 space-y-0.5 overflow-hidden"
          >
            {item.children.map((child) => (
              <TOCItemComponent
                key={child.id}
                item={child}
                activeId={activeId}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
                depth={depth + 1}
              />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
};

export const TableOfContents = ({ content, className, onSectionChange }: TableOfContentsProps) => {
  const [activeId, setActiveId] = useState<string>("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { items, flatItems } = useMemo(() => {
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const headings: { id: string; text: string; level: number }[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, "").trim();
      const id = slugify(text);
      headings.push({ id, text, level });
    }

    return {
      items: buildTOCTree(headings),
      flatItems: headings,
    };
  }, [content]);

  // Auto-expand parents of active item
  useEffect(() => {
    if (activeId) {
      const findParents = (
        items: TOCItem[],
        targetId: string,
        parents: string[] = [],
      ): string[] | null => {
        for (const item of items) {
          if (item.id === targetId) return parents;
          if (item.children.length > 0) {
            const found = findParents(item.children, targetId, [...parents, item.id]);
            if (found) return found;
          }
        }
        return null;
      };

      const parents = findParents(items, activeId);
      if (parents && parents.length > 0) {
        setExpandedIds((prev) => new Set([...prev, ...parents]));
      }
    }
  }, [activeId, items]);

  // Scroll-spy with Intersection Observer
  useEffect(() => {
    const observerOptions = {
      rootMargin: "-80px 0px -70% 0px",
      threshold: [0, 0.5, 1],
    };

    const observer = new IntersectionObserver((entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => {
          const rectA = a.boundingClientRect;
          const rectB = b.boundingClientRect;
          return rectA.top - rectB.top;
        });

      if (visibleEntries.length > 0) {
        const newActiveId = visibleEntries[0].target.id;
        setActiveId(newActiveId);
        onSectionChange?.(newActiveId);
      }
    }, observerOptions);

    // Wait for DOM to be ready
    const timeout = setTimeout(() => {
      flatItems.forEach((item) => {
        const element = document.getElementById(item.id);
        if (element) {
          observer.observe(element);
        }
      });
    }, 100);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [flatItems, onSectionChange]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Expand all H1 items by default
  useEffect(() => {
    const h1Ids = items.map((item) => item.id);
    setExpandedIds(new Set(h1Ids));
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className={cn("print:hidden", className)}>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <List className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Sumário</span>
        <span className="text-xs text-muted-foreground ml-auto">{flatItems.length} seções</span>
      </div>

      <ul className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 scrollbar-hide">
        {items.map((item) => (
          <TOCItemComponent
            key={item.id}
            item={item}
            activeId={activeId}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
          />
        ))}
      </ul>

      {/* Current section indicator */}
      {activeId && (
        <div className="mt-4 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">Lendo agora:</span>
          <p className="text-sm font-medium text-primary truncate mt-1">
            {flatItems.find((i) => i.id === activeId)?.text || ""}
          </p>
        </div>
      )}
    </nav>
  );
};
