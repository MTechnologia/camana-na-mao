import { ReactNode } from "react";
import { Clock, User, Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ContentArticleProps {
  title?: string;
  author?: string;
  date?: string;
  readTime?: string;
  children: ReactNode;
}

const ContentArticle = ({
  title,
  author,
  date,
  readTime,
  children,
}: ContentArticleProps) => {
  return (
    <article className="space-y-6">
      {title && (
        <header className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground leading-tight">
            {title}
          </h1>

          {(author || date || readTime) && (
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {author && (
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  <span>{author}</span>
                </div>
              )}
              {date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{date}</span>
                </div>
              )}
              {readTime && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{readTime}</span>
                </div>
              )}
            </div>
          )}

          <Separator />
        </header>
      )}

      <div className="prose prose-slate max-w-none">
        <div className="text-foreground leading-relaxed space-y-4">
          {children}
        </div>
      </div>
    </article>
  );
};

export default ContentArticle;
