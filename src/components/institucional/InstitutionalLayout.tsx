import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

interface InstitutionalLayoutProps {
  title: string;
  children: ReactNode;
  category?: string;
  showSearch?: boolean;
  showOfflineIndicator?: boolean;
  backTo?: string;
}

const InstitutionalLayout = ({
  title,
  children,
  category,
  showSearch = true,
  showOfflineIndicator = false,
  backTo = "/",
}: InstitutionalLayoutProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={title} backTo={backTo} />

      {/* Toolbar - Simplified */}
      <div className="fixed top-[60px] left-0 right-0 z-30 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {category && (
              <Badge variant="secondary" className="text-xs">
                {category}
              </Badge>
            )}
            {showOfflineIndicator && (
              <Badge variant="destructive" className="text-xs">
                Offline
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {showSearch && (
              <button
                onClick={() => navigate("/busca")}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Buscar"
              >
                <Search className="h-5 w-5 text-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-[120px] pb-24">
        <div className="max-w-3xl mx-auto px-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default InstitutionalLayout;
