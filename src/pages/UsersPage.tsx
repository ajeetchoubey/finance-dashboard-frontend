import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronLeft, ChevronRight, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usersApi, type UsersParams } from '../api/users';
import { useAuthStore } from '../store/auth.store';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import type { User } from '../types';
import { FetchError } from '../lib/fetch';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters').max(128),
  role: z.enum(['viewer', 'analyst', 'admin']),
  status: z.enum(['active', 'inactive']).default('active'),
});

const editSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  role: z.enum(['viewer', 'analyst', 'admin']),
  status: z.enum(['active', 'inactive']),
  newPassword: z.string().min(8, 'Min 8 characters').max(128).or(z.literal('')).optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

const DEFAULT_FILTERS: UsersParams = { page: 1, limit: 10 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleBadge(role: string) {
  const map: Record<string, 'info' | 'warning' | 'danger'> = {
    admin: 'danger',
    analyst: 'warning',
    viewer: 'info',
  };
  return <Badge variant={map[role] ?? 'neutral'}>{role}</Badge>;
}

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateUserForm({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (v: CreateFormValues) => void;
  loading: boolean;
  error: string;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'viewer', status: 'active' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Full name" placeholder="Jane Doe" error={errors.name?.message} {...register('name')} />
      <Input label="Email" type="email" placeholder="jane@example.com" error={errors.email?.message} {...register('email')} />
      <PasswordInput label="Password" placeholder="Min 8 characters" error={errors.password?.message} {...register('password')} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Role" error={errors.role?.message} {...register('role')}>
          <option value="viewer">Viewer</option>
          <option value="analyst">Analyst</option>
          <option value="admin">Admin</option>
        </Select>
        <Select label="Status" error={errors.status?.message} {...register('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <Button type="submit" loading={loading} className="w-full justify-center mt-1">Create User</Button>
    </form>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function EditUserForm({
  user,
  isSelf,
  onSubmit,
  loading,
  error,
}: {
  user: User;
  isSelf: boolean;
  onSubmit: (v: EditFormValues) => void;
  loading: boolean;
  error: string;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: user.name, role: user.role, status: user.status, newPassword: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Full name" error={errors.name?.message} {...register('name')} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Role" error={errors.role?.message} {...register('role')}>
          <option value="viewer">Viewer</option>
          <option value="analyst">Analyst</option>
          <option value="admin">Admin</option>
        </Select>
        <div className="flex flex-col gap-1">
          <Select
            label="Status"
            error={errors.status?.message}
            disabled={isSelf}
            {...register('status')}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          {isSelf && (
            <p className="text-xs text-amber-500">You cannot deactivate your own account.</p>
          )}
        </div>
      </div>
      <div className="border-t border-gray-100 pt-4">
        <PasswordInput
          label="New password"
          placeholder="Leave blank to keep current"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <p className="mt-1 text-xs text-gray-400">Leave blank to keep the existing password unchanged.</p>
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <Button type="submit" loading={loading} className="w-full justify-center mt-1">Save Changes</Button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const [pending, setPending] = useState<UsersParams>({ ...DEFAULT_FILTERS });
  const [active, setActive] = useState<UsersParams>({ ...DEFAULT_FILTERS });

  const [createModal, setCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', active],
    queryFn: () => usersApi.list(active),
  });

  const users = data?.data.items ?? [];
  const pagination = data?.data.pagination;

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setCreateModal(false);
      setFormError('');
      toast.success('User created successfully');
    },
    onError: (err) => {
      const msg = err instanceof FetchError ? err.message : 'Failed to create user';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof usersApi.update>[1] }) =>
      usersApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
      setFormError('');
      toast.success('User updated successfully');
    },
    onError: (err) => {
      const msg = err instanceof FetchError ? err.message : 'Failed to update user';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: User['status'] }) =>
      usersApi.updateStatus(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(status === 'active' ? 'User activated' : 'User deactivated');
    },
    onError: (err) => {
      toast.error(err instanceof FetchError ? err.message : 'Failed to update user status');
    },
  });

  const handleApply = () => setActive({ ...pending, page: 1 });

  const handleReset = () => {
    setPending({ ...DEFAULT_FILTERS });
    setActive({ ...DEFAULT_FILTERS });
  };

  const handleEdit = (values: EditFormValues) => {
    if (!editUser) return;
    const payload: Parameters<typeof usersApi.update>[1] = {
      name: values.name,
      role: values.role,
      status: values.status,
    };
    if (values.newPassword) {
      payload.password = values.newPassword;
    }
    editMutation.mutate({ id: editUser.id, payload });
  };

  return (
    <div className="flex flex-col gap-7">
      <Header
        title="Users"
        description="Manage users and their roles"
        actions={
          <Button size="sm" onClick={() => { setFormError(''); setCreateModal(true); }}>
            <Plus size={14} /> Add User
          </Button>
        }
      />

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Search"
            placeholder="Name or email..."
            className="w-48"
            value={pending.search ?? ''}
            onChange={(e) => setPending((f) => ({ ...f, search: e.target.value || undefined }))}
          />
          <Select
            label="Role"
            className="w-32"
            value={pending.role ?? ''}
            onChange={(e) => setPending((f) => ({ ...f, role: (e.target.value as User['role']) || undefined }))}
          >
            <option value="">All roles</option>
            <option value="viewer">Viewer</option>
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </Select>
          <Select
            label="Status"
            className="w-32"
            value={pending.status ?? ''}
            onChange={(e) => setPending((f) => ({ ...f, status: (e.target.value as User['status']) || undefined }))}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Role</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Last Login</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-3.5">
                      <div className="h-4 animate-pulse rounded bg-gray-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">No users found</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700 flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{user.name}</span>
                      {user.id === currentUser?.id && (
                        <Badge variant="info">you</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{user.email}</td>
                  <td className="px-5 py-3.5">{roleBadge(user.role)}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={user.status === 'active' ? 'success' : 'neutral'}>{user.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Never'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setFormError(''); setEditUser(user); }}
                      >
                        Edit
                      </Button>
                      {user.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={statusMutation.isPending && statusMutation.variables?.id === user.id}
                          className={user.status === 'active'
                            ? 'text-red-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                          }
                          onClick={() =>
                            statusMutation.mutate({
                              id: user.id,
                              status: user.status === 'active' ? 'inactive' : 'active',
                            })
                          }
                        >
                          {user.status === 'active'
                            ? <><UserX size={13} /> Deactivate</>
                            : <><UserCheck size={13} /> Activate</>
                          }
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-400">
              {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" disabled={pagination.page === 1} onClick={() => setActive((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>
                <ChevronLeft size={14} />
              </Button>
              <span className="px-2 text-xs text-gray-500">{pagination.page} / {pagination.totalPages}</span>
              <Button variant="ghost" size="sm" disabled={pagination.page === pagination.totalPages} onClick={() => setActive((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add New User">
        <CreateUserForm
          onSubmit={(v) => createMutation.mutate(v)}
          loading={createMutation.isPending}
          error={formError}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={editUser !== null} onClose={() => setEditUser(null)} title="Edit User">
        {editUser && (
          <EditUserForm
            user={editUser}
            isSelf={editUser.id === currentUser?.id}
            onSubmit={handleEdit}
            loading={editMutation.isPending}
            error={formError}
          />
        )}
      </Modal>
    </div>
  );
}
