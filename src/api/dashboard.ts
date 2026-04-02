import { api } from '../lib/fetch';
import type { ApiResponse, DashboardSummary, CategoryTotal, TrendPeriod, FinancialRecord } from '../types';

function buildQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][];
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries).toString();
}

export const dashboardApi = {
  getSummary: (params?: { from?: string; to?: string }) =>
    api.get<ApiResponse<DashboardSummary>>(`/dashboard/summary${buildQuery(params)}`),

  getCategoryTotals: (params?: { from?: string; to?: string }) =>
    api.get<ApiResponse<CategoryTotal[]>>(`/dashboard/category-totals${buildQuery(params)}`),

  getTrends: (params?: { period?: 'weekly' | 'monthly'; from?: string; to?: string }) =>
    api.get<ApiResponse<TrendPeriod[]>>(`/dashboard/trends${buildQuery(params)}`),

  getRecentActivity: (params?: { limit?: number }) =>
    api.get<ApiResponse<FinancialRecord[]>>(`/dashboard/recent-activity${buildQuery(params)}`),
};
