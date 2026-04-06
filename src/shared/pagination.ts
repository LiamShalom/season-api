export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next_page: boolean;
  };
}

export function parsePagination(
  query: Record<string, string | undefined>,
  defaults: { page?: number; pageSize?: number } = {}
): PaginationParams {
  const page = Math.max(1, parseInt(query['page'] ?? String(defaults.page ?? 1), 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(query['pageSize'] ?? String(defaults.pageSize ?? 20), 10) || 20)
  );
  return { page, pageSize };
}

export function toOffset(params: PaginationParams): { limit: number; offset: number } {
  return {
    limit: params.pageSize,
    offset: (params.page - 1) * params.pageSize,
  };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.pageSize);
  return {
    data,
    pagination: {
      page: params.page,
      page_size: params.pageSize,
      total,
      total_pages: totalPages,
      has_next_page: params.page < totalPages,
    },
  };
}
