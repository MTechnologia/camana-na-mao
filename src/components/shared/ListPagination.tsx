import { Button } from "@/components/ui/button";

export const CITIZEN_LIST_PAGE_SIZE = 10;

export function ListPagination({
  page,
  totalPages,
  totalCount,
  pageSize = CITIZEN_LIST_PAGE_SIZE,
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
    <div
      className="flex flex-col gap-3 border-t border-border pt-4 mt-4 sm:flex-row sm:items-center sm:justify-between"
      role="navigation"
      aria-label="Paginação da lista"
    >
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
        <span className="flex items-center px-2 text-xs text-muted-foreground tabular-nums">
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

export function paginateSlice<T>(items: T[], page: number, pageSize = CITIZEN_LIST_PAGE_SIZE): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalListPages(totalCount: number, pageSize = CITIZEN_LIST_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}
