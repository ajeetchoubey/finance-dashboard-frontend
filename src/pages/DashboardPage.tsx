import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { Header } from '../components/layout/Header';
import { Badge } from '../components/ui/Badge';
import type { CategoryTotal, TrendPeriod } from '../types';

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value}`;
}

function formatTrendLabel(t: TrendPeriod, period: 'daily' | 'weekly' | 'monthly') {
  const d = new Date(t.startDate);
  if (period === 'daily') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (period === 'monthly') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  color: string;
  name: string;
  value: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 shadow-xl text-sm min-w-[160px]">
      <p className="mb-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-6 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-gray-500">{entry.name}</span>
          </div>
          <span className="font-semibold text-gray-800">{formatCurrency(entry.value)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-gray-400 text-xs">Net</span>
          <span className={`text-xs font-semibold ${payload[0].value - payload[1].value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatCurrency(payload[0].value - payload[1].value)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  subLabel,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'green' | 'red' | 'blue';
  subLabel?: string;
}) {
  const colors = {
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-500', val: 'text-gray-900' },
    red:   { bg: 'bg-red-50',     icon: 'text-red-500',     val: 'text-gray-900' },
    blue:  { bg: 'bg-blue-50',    icon: 'text-blue-500',    val: value >= 0 ? 'text-gray-900' : 'text-red-600' },
  };
  const c = colors[color];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.bg}`}>
          <Icon size={15} className={c.icon} />
        </div>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${c.val}`}>
        {value < 0 ? '-' : ''}{formatCurrency(Math.abs(value))}
      </p>
      {subLabel && <p className="mt-1 text-xs text-gray-400">{subLabel}</p>}
    </div>
  );
}

// ─── Category breakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({ categories }: { categories: CategoryTotal[] }) {
  const maxVal = Math.max(...categories.map((c) => Math.max(c.totalIncome, c.totalExpense)), 1);

  if (categories.length === 0) {
    return <div className="flex h-52 items-center justify-center text-sm text-gray-400">No data</div>;
  }

  return (
    <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[230px] pr-1">
      {categories.map((cat) => (
        <div key={cat.categoryId} className="flex items-start gap-3">
          <span className="w-20 pt-0.5 text-xs text-gray-500 text-right leading-tight flex-shrink-0 truncate">
            {cat.category}
          </span>
          <div className="flex flex-1 flex-col gap-1">
            {cat.totalIncome > 0 && (
              <div className="flex items-center gap-2 group">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{ width: `${(cat.totalIncome / maxVal) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-emerald-600 font-medium w-14 text-right flex-shrink-0">
                  {formatCompact(cat.totalIncome)}
                </span>
              </div>
            )}
            {cat.totalExpense > 0 && (
              <div className="flex items-center gap-2 group">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400 rounded-full transition-all"
                    style={{ width: `${(cat.totalExpense / maxVal) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-red-500 font-medium w-14 text-right flex-shrink-0">
                  {formatCompact(cat.totalExpense)}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-1 border-t border-gray-100 mt-1">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-gray-400">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="text-xs text-gray-400">Expenses</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [trendPeriod, setTrendPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const { data: summaryRes, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary(),
  });

  const { data: trendsRes, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard', 'trends', trendPeriod],
    queryFn: () => dashboardApi.getTrends({ period: trendPeriod }),
  });

  const { data: categoryRes } = useQuery({
    queryKey: ['dashboard', 'category-totals'],
    queryFn: () => dashboardApi.getCategoryTotals(),
  });

  const { data: activityRes } = useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: () => dashboardApi.getRecentActivity({ limit: 8 }),
  });

  const summary = summaryRes?.data;
  const trends = trendsRes?.data ?? [];
  const categories = categoryRes?.data ?? [];
  const activity = activityRes?.data ?? [];

  const trendChartData = trends.map((t) => ({
    name: formatTrendLabel(t, trendPeriod),
    Income: t.totalIncome,
    Expenses: t.totalExpense,
  }));

  return (
    <div className="flex flex-col gap-7">
      <Header title="Dashboard" description="Financial overview and key metrics" />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {summaryLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-gray-200 bg-white animate-pulse" />
          ))
        ) : (
          <>
            <SummaryCard
              label="Total Income"
              value={summary?.totalIncome ?? 0}
              icon={TrendingUp}
              color="green"
              subLabel="All time"
            />
            <SummaryCard
              label="Total Expenses"
              value={summary?.totalExpense ?? 0}
              icon={TrendingDown}
              color="red"
              subLabel="All time"
            />
            <SummaryCard
              label="Net Balance"
              value={summary?.netBalance ?? 0}
              icon={Wallet}
              color="blue"
              subLabel={summary && summary.netBalance >= 0 ? 'You are in surplus' : 'You are in deficit'}
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Trends — AreaChart */}
        <div className="col-span-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Income vs Expenses</p>
              <p className="text-xs text-gray-400 mt-0.5">Trend over time</p>
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setTrendPeriod(p)}
                  className={`cursor-pointer px-3 py-1.5 transition-colors capitalize ${
                    trendPeriod === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {trendsLoading ? (
            <div className="h-52 animate-pulse rounded-lg bg-gray-100" />
          ) : trendChartData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-gray-400">No trend data</div>
          ) : (
            <ResponsiveContainer width="100%" height={215}>
              <AreaChart data={trendChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  dy={6}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCompact}
                  width={48}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="Income"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#incomeGrad)"
                  dot={{ fill: '#10b981', r: 3.5, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="Expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#expenseGrad)"
                  dot={{ fill: '#ef4444', r: 3.5, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category breakdown */}
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-800">By Category</p>
            <p className="text-xs text-gray-400 mt-0.5">Income and expense per category</p>
          </div>
          <CategoryBreakdown categories={categories.slice(0, 8)} />
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Recent Activity</p>
            <p className="text-xs text-gray-400 mt-0.5">Latest transactions</p>
          </div>
        </div>
        {activity.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-gray-400">No recent activity</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {activity.map((record) => (
              <li key={record.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${record.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {record.type === 'income' ? (
                      <ArrowUpRight size={14} className="text-emerald-500" />
                    ) : (
                      <ArrowDownRight size={14} className="text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{record.category}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(record.transactionDate).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                      {record.note && <span className="ml-1.5 text-gray-300">· {record.note}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`text-sm font-semibold tabular-nums ${record.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {record.type === 'income' ? '+' : '-'}{formatCurrency(record.amount)}
                  </p>
                  <Badge variant={record.type === 'income' ? 'success' : 'danger'}>
                    {record.type}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
