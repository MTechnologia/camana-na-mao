import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidRenderer } from "./MermaidRenderer";
import { TableOfContents } from "./TableOfContents";
import { ReadingProgress } from "./ReadingProgress";
import { SectionNavigation } from "./SectionNavigation";
import { Button } from "@/components/ui/button";
import { Printer, ArrowUp, Link2 } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import brasaoImage from "@/assets/brasao-sp.png";

interface DocumentViewerProps {
  content: string;
  title?: string;
  /** Em admin: sem barra de progresso no topo e sem borda no H1 do markdown (evita “linha” extra). */
  variant?: "default" | "admin";
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

export const DocumentViewer = ({ content, title, variant = "default" }: DocumentViewerProps) => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState("");

  // Extract H2 sections for navigation
  const h2Sections = useMemo(() => {
    const regex = /^##\s+(.+)$/gm;
    const sections: { id: string; text: string }[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      const text = match[1].replace(/\*\*/g, "").trim();
      sections.push({ id: slugify(text), text });
    }
    return sections;
  }, [content]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSectionChange = useCallback((id: string) => {
    setCurrentSectionId(id);
  }, []);

  const copyLinkToSection = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  // Heading component with copy link button
  const HeadingWithLink = ({
    level,
    children,
    id,
  }: {
    level: 1 | 2 | 3;
    children: React.ReactNode;
    id: string;
  }) => {
    const Tag = `h${level}` as const;
    const baseClasses = "group flex items-center gap-2 scroll-mt-24";
    const levelClasses = {
      1:
        variant === "admin"
          ? "text-3xl font-bold pb-2 mb-6"
          : "text-3xl font-bold border-b border-border pb-4 mb-6",
      2: "text-2xl font-semibold mt-12 mb-4 text-primary print:break-before-page first:print:break-before-auto",
      3: "text-xl font-medium mt-8 mb-3",
    };

    return (
      <Tag id={id} className={`${baseClasses} ${levelClasses[level]}`}>
        {children}
        <button
          onClick={() => copyLinkToSection(id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted print:hidden"
          title="Copiar link"
        >
          <Link2 className="h-4 w-4 text-muted-foreground" />
        </button>
      </Tag>
    );
  };

  return (
    <>
      {variant !== "admin" && <ReadingProgress />}

      <div className="flex gap-8 pt-6">
        {/* Table of Contents - Sticky Sidebar */}
        <aside className="hidden xl:block w-72 flex-shrink-0">
          <div className="sticky top-24 bg-card/50 backdrop-blur-sm rounded-lg border border-border p-4">
            <TableOfContents content={content} onSectionChange={handleSectionChange} />
          </div>
        </aside>

        {/* Main Content */}
        <article className="flex-1 min-w-0 max-w-4xl">
          {/* Print Header - Only visible when printing */}
          <div className="hidden print:block mb-8 pb-4 border-b-2 border-primary">
            <div className="flex items-center gap-4">
              <img src={brasaoImage} alt="Brasão SP" className="h-16 w-auto" />
              <div>
                <h1 className="text-xl font-bold text-primary">CÂMARA MUNICIPAL DE SÃO PAULO</h1>
                <p className="text-sm text-muted-foreground">
                  Documentação Técnica - Câmara na Mão
                </p>
              </div>
            </div>
          </div>

          {/* Markdown Content */}
          <div
            className="prose prose-slate dark:prose-invert max-w-none 
            prose-headings:scroll-mt-24 prose-headings:font-semibold
            prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-4
            prose-li:text-foreground prose-li:leading-relaxed
            prose-strong:text-foreground prose-strong:font-semibold
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium
            prose-ul:my-4 prose-ol:my-4
            prose-li:my-1
          "
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => {
                  const text = String(children);
                  const id = slugify(text);
                  return (
                    <HeadingWithLink level={1} id={id}>
                      {children}
                    </HeadingWithLink>
                  );
                },
                h2: ({ children }) => {
                  const text = String(children);
                  const id = slugify(text);
                  return (
                    <HeadingWithLink level={2} id={id}>
                      {children}
                    </HeadingWithLink>
                  );
                },
                h3: ({ children }) => {
                  const text = String(children);
                  const id = slugify(text);
                  return (
                    <HeadingWithLink level={3} id={id}>
                      {children}
                    </HeadingWithLink>
                  );
                },
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || "");
                  const language = match ? match[1] : "";

                  if (language === "mermaid") {
                    return (
                      <div className="my-8 p-6 bg-card rounded-xl border border-border shadow-sm">
                        <MermaidRenderer chart={String(children)} />
                      </div>
                    );
                  }

                  // Check if it's a code block (has className or is multi-line)
                  const isCodeBlock = className || String(children).includes("\n");

                  if (!isCodeBlock) {
                    return (
                      <code
                        className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }

                  // Styled code block
                  return (
                    <div className="my-6 rounded-lg overflow-hidden border border-border bg-muted/50">
                      {language && (
                        <div className="px-4 py-2 bg-muted border-b border-border text-xs font-medium text-muted-foreground uppercase">
                          {language}
                        </div>
                      )}
                      <pre className="p-4 overflow-x-auto">
                        <code className={`${className} text-sm`} {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                },
                pre: ({ children }) => <>{children}</>,
                table: ({ children }) => (
                  <div className="my-8 overflow-x-auto rounded-lg border border-border print:break-inside-avoid">
                    <table className="w-full border-collapse bg-card">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted/70 border-b border-border">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-3 text-left font-semibold text-sm text-foreground">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 text-sm border-t border-border">{children}</td>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-6 border-l-4 border-primary bg-primary/5 rounded-r-lg py-4 px-6 italic">
                    {children}
                  </blockquote>
                ),
                img: ({ src, alt }) => (
                  <figure className="my-8 print:break-inside-avoid">
                    <img
                      src={src}
                      alt={alt || ""}
                      className="rounded-lg border border-border mx-auto shadow-sm"
                    />
                    {alt && (
                      <figcaption className="text-center text-sm text-muted-foreground mt-3 italic">
                        {alt}
                      </figcaption>
                    )}
                  </figure>
                ),
                hr: () => <hr className="my-12 border-t-2 border-border" />,
                ul: ({ children }) => (
                  <ul className="my-4 space-y-2 list-disc list-outside ml-6">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-4 space-y-2 list-decimal list-outside ml-6">{children}</ol>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {/* Section Navigation */}
          <SectionNavigation sections={h2Sections} currentSectionId={currentSectionId} />

          {/* Print Footer */}
          <div className="hidden print:block mt-12 pt-4 border-t text-center text-xs text-muted-foreground">
            <p>Câmara na Mão - Documento gerado em {new Date().toLocaleDateString("pt-BR")}</p>
            <p>Câmara Municipal de São Paulo © {new Date().getFullYear()}</p>
          </div>
        </article>

        {/* Right spacer for balance */}
        <div className="hidden xl:block w-16 flex-shrink-0" />
      </div>

      {/* Floating Actions */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 print:hidden z-50">
        {showScrollTop && (
          <Button
            variant="outline"
            size="icon"
            onClick={scrollToTop}
            className="rounded-full shadow-lg bg-background border-border hover:bg-muted"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
        <Button onClick={handlePrint} className="rounded-full shadow-lg gap-2">
          <Printer className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar PDF</span>
        </Button>
      </div>
    </>
  );
};
