import { z } from 'zod';

// Pagination request params
export const PaginationParamsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// Paginated response wrapper
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().min(0),
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
    hasMore: z.boolean(),
  });

// Types
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
