'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  const searchParams = useSearchParams();

  const buildUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Página {currentPage} de {totalPages}
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          asChild={currentPage > 1}
          disabled={currentPage <= 1}
        >
          {currentPage > 1 ? (
            <Link href={buildUrl(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Link>
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </>
          )}
        </Button>

        <div className="flex items-center space-x-1">
          {visiblePages.map((page, index) => (
            <div key={index}>
              {page === '...' ? (
                <Button variant="ghost" size="sm" disabled>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant={currentPage === page ? 'default' : 'ghost'}
                  size="sm"
                  asChild={currentPage !== page}
                  disabled={currentPage === page}
                  className={cn(
                    currentPage === page && 'bg-primary text-primary-foreground'
                  )}
                >
                  {currentPage !== page ? (
                    <Link href={buildUrl(page as number)}>{page}</Link>
                  ) : (
                    <span>{page}</span>
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          asChild={currentPage < totalPages}
          disabled={currentPage >= totalPages}
        >
          {currentPage < totalPages ? (
            <Link href={buildUrl(currentPage + 1)}>
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}