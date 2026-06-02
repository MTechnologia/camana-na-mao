import { Button } from "@/components/ui/button";

export const REPORTS_LIST_PAGE_SIZE = 25;

export function ReportsListPagination({
  page,
  totalPages,
  totalCount,
  pageSize = REPORTS_LIST_PAGE_SIZE,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground sm:text-sm">
        Exibindo {from.toLocaleString("pt-BR")}–{to.toLocaleString("pt-BR")} de{" "}
        {totalCount.toLocaleString("pt-BR")}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="flex-1 sm:flex-none"
        >
          Anterior
        </Button>
        <span className="flex items-center px-2 text-xs text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="flex-1 sm:flex-none"
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
