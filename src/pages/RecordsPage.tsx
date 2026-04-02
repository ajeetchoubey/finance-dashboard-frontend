import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { recordsApi, type RecordsParams } from '../api/records';
import { useAuthStore } from '../store/auth.store';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import type { FinancialRecord } from '../types';
import { FetchError } from '../lib/fetch';

const schema = z.object({
  amount: z.coerce.number().positive('Must be positive'),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'Category is required').max(80),
  transactionDate: z.string().min(1, 'Date is required'),
  note: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_FILTERS: RecordsParams = {
  page: 1,
  limit: 10,
  sortBy: 'transactionDate',
  sortOrder: 'desc',
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function RecordForm({
  defaultValues,
  onSubmit,
  loading,
  error,
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit: (v: FormValues) => void;
  loading: boolean;
  error: string;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Amount" type="number" step="0.01" placeholder="0.00" error={errors.amount?.message} {...register('amount')} />
        <Select label="Type" error={errors.type?.message} {...register('type')}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </Select>
      </div>
      <Input label="Category" placeholder="e.g. Salary, Rent, Groceries" error={errors.category?.message} {...register('category')} />
      <Input label="Date" type="date" error={errors.transactionDate?.message} {...register('transactionDate')} />
      <Input label="Note (optional)" placeholder="Add a note..." error={errors.note?.message} {...register('note')} />
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <Button type="submit" loading={loading} className="w-full justify-center mt-1">Save Record</Button>
    </form>
  );
}

export function RecordsPage() {
  const can = useAuthStore((s) => s.can);
  const qc = useQueryClient();

  // pending = what's in the inputs; active = what's sent to the API
  const [pending, setPending] = useState<RecordsParams>({ ...DEFAULT_FILTERS });
  const [active, setActive] = useState<RecordsParams>({ ...DEFAULT_FILTERS });

  const [modal, setModal] = useState<{ open: boolean; record?: FinancialRecord }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['records', active],
    queryFn: () => recordsApi.list(active),
  });

  const records = data?.data.items ?? [];
  const pagination = data?.data.pagination;

  const createMutation = useMutation({
    mutationFn: recordsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['records'] }); setModal({ open: false }); setFormError(''); },
    onError: (err) => setFormError(err instanceof FetchError ? err.message : 'Failed to save'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<FormValues> }) => recordsApi.update(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['records'] }); setModal({ open: false }); setFormError(''); },
    onError: (err) => setFormError(err instanceof FetchError ? err.message : 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: recordsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['records'] }); setDeleteConfirm(null); },
  });

  const handleApply = () => setActive({ ...pending, page: 1 });

  const handleReset = () => {
    setPending({ ...DEFAULT_FILTERS });
    setActive({ ...DEFAULT_FILTERS });
  };

  const handleSubmit = (values: FormValues) => {
    if (modal.record) {
      updateMutation.mutate({ id: modal.record.id, payload: values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <Header
        title="Financial Records"
        description="View and manage financial transactions"
        actions={
          can('records.write') && (
            <Button onClick={() => { setFormError(''); setModal({ open: true }); }} size="sm">
              <Plus size={14} /> Add Record
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="From"
            type="date"
            className="w-36"
            value={pending.from ?? ''}
            onChange={(e) => setPending((f) => ({ ...f, from: e.target.value || undefined }))}
          />
          <Input
            label="To"
            type="date"
            className="w-36"
            value={pending.to ?? ''}
            onChange={(e) => setPending((f) => ({ ...f, to: e.target.value || undefined }))}
          />
          <Select
            label="Type"
            className="w-32"
            value={pending.type ?? ''}
            onChange={(e) => setPending((f) => ({ ...f, type: (e.target.value as 'income' | 'expense') || undefined }))}
          >
            <option value="">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>
          <Input
            label="Category"
            placeholder="Filter..."
            className="w-36"
            value={pending.category ?? ''}
            onChange={(e) => setPending((f) => ({ ...f, category: e.target.value || undefined }))}
          />
          <Select
            label="Sort"
            className="w-40"
            value={`${pending.sortBy}-${pending.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-') as [RecordsParams['sortBy'], RecordsParams['sortOrder']];
              setPending((f) => ({ ...f, sortBy, sortOrder }));
            }}
          >
            <option value="transactionDate-desc">Date (newest)</option>
            <option value="transactionDate-asc">Date (oldest)</option>
            <option value="amount-desc">Amount (high)</option>
            <option value="amount-asc">Amount (low)</option>
          </Select>
          <div className="flex flex-col gap-1">
            <span className="h-5 block" />
            <div className="flex gap-2">
              <Button onClick={handleApply} size="sm">Apply</Button>
              <Button onClick={handleReset} variant="secondary" size="sm">Reset</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Category</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Note</th>
              {can('records.write') && (
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: can('records.write') ? 6 : 5 }).map((_, j) => (
                    <td key={j} className="px-5 py-3.5">
                      <div className="h-4 animate-pulse rounded bg-gray-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={can('records.write') ? 6 : 5} className="px-5 py-12 text-center text-sm text-gray-400">
                  No records found
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-gray-600">
                    {new Date(record.transactionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-800">{record.category}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={record.type === 'income' ? 'success' : 'danger'}>{record.type}</Badge>
                  </td>
                  <td className={`px-5 py-3.5 text-right font-semibold ${record.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {record.type === 'income' ? '+' : '-'}{formatCurrency(record.amount)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 max-w-xs truncate">{record.note ?? '—'}</td>
                  {can('records.write') && (
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setFormError(''); setModal({ open: true, record }); }}>
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteConfirm(record.id)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-400">
              {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setActive((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="px-2 text-xs text-gray-500">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setActive((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.record ? 'Edit Record' : 'New Record'}
      >
        <RecordForm
          defaultValues={
            modal.record
              ? {
                  amount: modal.record.amount,
                  type: modal.record.type,
                  category: modal.record.category,
                  transactionDate: modal.record.transactionDate,
                  note: modal.record.note ?? undefined,
                }
              : { type: 'expense' }
          }
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
          error={formError}
        />
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Record"
        width="sm"
      >
        <p className="text-sm text-gray-600 mb-5">
          This record will be soft-deleted and hidden from all views. This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            variant="danger"
            size="sm"
            loading={deleteMutation.isPending}
            onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
