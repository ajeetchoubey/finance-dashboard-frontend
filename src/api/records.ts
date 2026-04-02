import { api } from '../lib/fetch';
import type { ApiResponse, FinancialRecord, PaginatedResponse, TransactionType } from '../types';

export interface RecordsParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  type?: TransactionType;
  category?: string;
  search?: string;
  sortBy?: 'transactionDate' | 'amount' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface RecordPayload {
  amount: number;
  type: TransactionType;
  category: string;
  transactionDate: string;
  note?: string | null;
}

function buildQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][];
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries).toString();
}

export const recordsApi = {
  list: (params?: RecordsParams) =>
    api.get<ApiResponse<PaginatedResponse<FinancialRecord>>>(`/records${buildQuery(params as Record<string, string | number | undefined>)}`),

  get: (id: string) =>
    api.get<ApiResponse<FinancialRecord>>(`/records/${id}`),

  create: (payload: RecordPayload) =>
    api.post<ApiResponse<FinancialRecord>>('/records', payload),

  update: (id: string, payload: Partial<RecordPayload>) =>
    api.patch<ApiResponse<FinancialRecord>>(`/records/${id}`, payload),

  delete: (id: string) =>
    api.delete<ApiResponse<FinancialRecord>>(`/records/${id}`),
};
