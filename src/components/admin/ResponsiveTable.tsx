import { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  mobileLabel?: string;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  renderMobileCard?: (row: T, index: number) => ReactNode;
  keyExtractor: (row: T, index: number) => string;
}

export function ResponsiveTable<T>({ data, columns, renderMobileCard, keyExtractor }: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (isMobile && renderMobileCard) {
    return (
      <div className="space-y-4">
        {data.map((row, index) => (
          <Card key={keyExtractor(row, index)} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              {renderMobileCard(row, index)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getCellValue = (row: T, column: Column<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor] as ReactNode;
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => {
              const hideClass = isMobile && column.hideOnMobile ? 'hidden' : '';
              return (
                <TableHead key={index} className={hideClass}>
                  {column.header}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                Nenhum registro encontrado
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow key={keyExtractor(row, rowIndex)} className="hover:bg-muted/50">
                {columns.map((column, colIndex) => {
                  const hideClass = isMobile && column.hideOnMobile ? 'hidden' : '';
                  return (
                    <TableCell key={colIndex} className={hideClass}>
                      {getCellValue(row, column)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
