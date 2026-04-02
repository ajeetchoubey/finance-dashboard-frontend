export type Role = 'viewer' | 'analyst' | 'admin';
export type UserStatus = 'active' | 'inactive';
export type TransactionType = 'income' | 'expense';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialRecord {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  categoryId: string;
  note: string | null;
  transactionDate: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string; email: string } | null;
  updatedBy: { id: string; name: string; email: string } | null;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

export interface CategoryTotal {
  categoryId: string;
  category: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  recordCount: number;
}

export interface TrendPeriod {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  recordCount: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
