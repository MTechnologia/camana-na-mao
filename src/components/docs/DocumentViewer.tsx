import ReactMarkdown from 'react-markdown';
import { MermaidRenderer } from './MermaidRenderer';
import { TableOfContents } from './TableOfContents';
import { Button } from '@/components/ui/button';
import { Printer, ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import brasaoImage from '@/assets/brasao-sp.png';

interface DocumentViewerProps {
  content: string;
  title?: string;
}

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export const DocumentViewer = ({ content, title }: DocumentViewerProps) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex gap-8">
      {/* Table of Contents - Sticky Sidebar */}
      <aside className="hidden xl:block w-64 flex-shrink-0">
        <div className="sticky top-24">
          <TableOfContents content={content} />
        </div>
      </aside>

      {/* Main Content */}
      <article className="flex-1 min-w-0">
        {/* Print Header - Only visible when printing */}
        <div className="hidden print:block mb-8 pb-4 border-b-2 border-primary">
          <div className="flex items-center gap-4">
            <img src={brasaoImage} alt="Brasão SP" className="h-16 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-primary">CÂMARA MUNICIPAL DE SÃO PAULO</h1>
              <p className="text-sm text-muted-foreground">Documentação Técnica - CMSP Connect</p>
            </div>
          </div>
        </div>

        {/* Markdown Content */}
        <div className="prose prose-slate max-w-none 
          prose-headings:scroll-mt-24 prose-headings:font-semibold
          prose-h1:text-3xl prose-h1:border-b prose-h1:pb-4 prose-h1:mb-6
          prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-primary
          prose-h3:text-xl prose-h3:mt-8
          prose-p:text-foreground prose-p:leading-relaxed
          prose-li:text-foreground
          prose-strong:text-foreground
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-table:border prose-table:border-border
          prose-th:bg-muted prose-th:p-3 prose-th:text-left prose-th:font-semibold
          prose-td:p-3 prose-td:border-t prose-td:border-border
          prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
          prose-pre:bg-muted prose-pre:border prose-pre:border-border
          prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2
        ">
          <ReactMarkdown
            components={{
              h1: ({ children }) => {
                const text = String(children);
                const id = slugify(text);
                return <h1 id={id}>{children}</h1>;
              },
              h2: ({ children }) => {
                const text = String(children);
                const id = slugify(text);
                return <h2 id={id} className="print:break-before-page first:print:break-before-auto">{children}</h2>;
              },
              h3: ({ children }) => {
                const text = String(children);
                const id = slugify(text);
                return <h3 id={id}>{children}</h3>;
              },
              code: ({ className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';

                if (language === 'mermaid') {
                  return <MermaidRenderer chart={String(children)} />;
                }

                // Inline code vs code block
                const isInline = !className;
                if (isInline) {
                  return <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>{children}</code>;
                }

                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              table: ({ children }) => (
                <div className="overflow-x-auto my-6 print:break-inside-avoid">
                  <table className="w-full border-collapse">{children}</table>
                </div>
              ),
              img: ({ src, alt }) => (
                <figure className="my-6 print:break-inside-avoid">
                  <img src={src} alt={alt || ''} className="rounded-lg border border-border mx-auto" />
                  {alt && <figcaption className="text-center text-sm text-muted-foreground mt-2">{alt}</figcaption>}
                </figure>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* Print Footer */}
        <div className="hidden print:block mt-12 pt-4 border-t text-center text-xs text-muted-foreground">
          <p>CMSP Connect - Documento gerado em {new Date().toLocaleDateString('pt-BR')}</p>
          <p>Câmara Municipal de São Paulo © {new Date().getFullYear()}</p>
        </div>
      </article>

      {/* Floating Actions */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 print:hidden z-50">
        {showScrollTop && (
          <Button
            variant="outline"
            size="icon"
            onClick={scrollToTop}
            className="rounded-full shadow-lg bg-background"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
        <Button
          onClick={handlePrint}
          className="rounded-full shadow-lg gap-2"
        >
          <Printer className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar PDF</span>
        </Button>
      </div>
    </div>
  );
};
