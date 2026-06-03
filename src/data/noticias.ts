import {
  FileText,
  Building,
  Stethoscope,
  GraduationCap,
  Bus,
  TreePine,
  Palette,
  Users,
  LucideIcon,
} from "lucide-react";

// Category types
export type NewsCategory =
  | "legislativo"
  | "saude"
  | "educacao"
  | "mobilidade"
  | "cultura"
  | "ambiente"
  | "audiencia";

// Category configuration for styling and display
export const categoryConfig: Record<
  NewsCategory,
  { label: string; color: string; icon: LucideIcon }
> = {
  legislativo: {
    label: "Legislativo",
    color: "text-primary border-primary/30 bg-primary/5",
    icon: Building,
  },
  saude: {
    label: "Saúde",
    color: "text-red-600 border-red-200 bg-red-50",
    icon: Stethoscope,
  },
  educacao: {
    label: "Educação",
    color: "text-blue-600 border-blue-200 bg-blue-50",
    icon: GraduationCap,
  },
  mobilidade: {
    label: "Mobilidade",
    color: "text-orange-600 border-orange-200 bg-orange-50",
    icon: Bus,
  },
  cultura: {
    label: "Cultura",
    color: "text-purple-600 border-purple-200 bg-purple-50",
    icon: Palette,
  },
  ambiente: {
    label: "Meio Ambiente",
    color: "text-green-600 border-green-200 bg-green-50",
    icon: TreePine,
  },
  audiencia: {
    label: "Audiência Pública",
    color: "text-amber-600 border-amber-200 bg-amber-50",
    icon: Users,
  },
};

// Default icon for unknown categories
export const defaultCategoryIcon = FileText;

// Helper to get category config with fallback
export function getCategoryConfig(category: string): {
  label: string;
  color: string;
  icon: LucideIcon;
} {
  return (
    categoryConfig[category as NewsCategory] || {
      label: category,
      color: "text-muted-foreground border-muted bg-muted/50",
      icon: defaultCategoryIcon,
    }
  );
}
