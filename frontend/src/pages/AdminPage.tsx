import { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  useAdminStats,
  useAdminUsers,
  useAdminEvents,
  useAdminBookings,
  useSuspendUser,
  useUnsuspendUser,
  useSetUserRole,
  useAdjustPoints,
  useSuspendEvent,
  useUnsuspendEvent,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
} from '@/api/admin'
import { useCategories } from '@/api/tagsCategories'
import { useTags } from '@/api/tagsCategories'
import type { AdminUserSummary, AdminEvent, Category, Tag } from '@/types'

// ─── Inline Confirm wrapper (ConfirmDialog needs open/onOpenChange state) ──────

function InlineConfirm({
  buttonLabel,
  buttonClassName,
  title,
  description,
  onConfirm,
}: Readonly<{
  buttonLabel: string
  buttonClassName?: string
  title: string
  description: string
  onConfirm: () => void
}>) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className={buttonClassName}
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        onConfirm={() => { onConfirm(); setOpen(false) }}
      />
    </>
  )
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────

const PIE_COLORS = ['#6366f1', '#ef4444', '#f59e0b']

function OverviewTab() {
  const { data: stats, isPending } = useAdminStats()

  if (isPending) return <LoadingSpinner />
  if (!stats) return null

  const pieData = [
    { name: 'Active', value: stats.activeEvents },
    { name: 'Suspended', value: stats.suspendedEvents },
  ].filter((d) => d.value > 0)

  const bookingBar = [
    { name: 'Total', value: stats.totalBookings },
    { name: 'Confirmed', value: stats.confirmedBookings },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Users', value: stats.totalUsers.toLocaleString() },
          { label: 'Total Events', value: stats.totalEvents.toLocaleString() },
          { label: 'Total Bookings', value: stats.totalBookings.toLocaleString() },
          { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Events by Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Bookings Overview</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bookingBar} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Active Users', value: stats.activeUsers },
          { label: 'Suspended Users', value: stats.suspendedUsers },
          { label: 'Confirmed Bookings', value: stats.confirmedBookings },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Users Tab ─────────────────────────────────────────────────────────────────

function PointsDialog({ user }: Readonly<{ user: AdminUserSummary }>) {
  const [open, setOpen] = useState(false)
  const [delta, setDelta] = useState('')
  const adjust = useAdjustPoints()

  const handleSubmit = () => {
    const n = parseInt(delta)
    if (isNaN(n)) return
    adjust.mutate(
      { id: user.id, delta: n },
      {
        onSuccess: () => { setOpen(false); setDelta('') },
        onError: () => toast.error('Failed to adjust points'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">Points</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Points — {user.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">Current: {user.loyaltyPoints} pts ({user.loyaltyTier})</p>
        <div className="space-y-2">
          <Label>Delta (positive to add, negative to deduct)</Label>
          <Input
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="e.g. 100 or -50"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={adjust.isPending}>Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function UsersTab() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const debouncedSearch = useDebounce(search)

  const { data: users = [], isPending } = useAdminUsers({
    search: debouncedSearch || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
  })

  const suspend = useSuspendUser()
  const unsuspend = useUnsuspendUser()
  const changeRole = useSetUserRole()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Attendee">Attendee</SelectItem>
            <SelectItem value="Organizer">Organizer</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isPending ? (
          <LoadingSpinner />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-slate-500">{u.email}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(role) =>
                        changeRole.mutate(
                          { id: u.id, role: role as AdminUserSummary['role'] },
                          { onError: () => toast.error('Failed to change role') },
                        )
                      }
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Attendee">Attendee</SelectItem>
                        <SelectItem value="Organizer">Organizer</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{u.loyaltyPoints.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={u.isSuspended ? 'destructive' : 'secondary'}>
                      {u.isSuspended ? 'Suspended' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(u.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <PointsDialog user={u} />
                      {u.isSuspended ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            unsuspend.mutate(u.id, { onError: () => toast.error('Failed') })
                          }
                        >
                          Unsuspend
                        </Button>
                      ) : (
                        <InlineConfirm
                          buttonLabel="Suspend"
                          buttonClassName="text-red-600"
                          title="Suspend User"
                          description={`Suspend ${u.name}? They will lose access to the platform.`}
                          onConfirm={() =>
                            suspend.mutate(u.id, { onError: () => toast.error('Failed') })
                          }
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

// ─── Events Tab ────────────────────────────────────────────────────────────────

function EventsTab() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)

  const { data: events = [], isPending } = useAdminEvents({ search: debouncedSearch || undefined })
  const suspend = useSuspendEvent()
  const unsuspend = useUnsuspendEvent()

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isPending ? (
          <LoadingSpinner />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((ev: AdminEvent) => (
                <TableRow key={ev.id}>
                  <TableCell className="font-medium">{ev.title}</TableCell>
                  <TableCell className="text-slate-500">{ev.createdByName}</TableCell>
                  <TableCell>{formatDate(ev.startDate)}</TableCell>
                  <TableCell>
                    <StatusBadge status={ev.displayStatus} />
                  </TableCell>
                  <TableCell>
                    {ev.isSuspended ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          unsuspend.mutate(ev.id, { onError: () => toast.error('Failed') })
                        }
                      >
                        Unsuspend
                      </Button>
                    ) : (
                      <InlineConfirm
                        buttonLabel="Suspend"
                        buttonClassName="text-red-600"
                        title="Suspend Event"
                        description={`Suspend "${ev.title}"? It will be hidden from attendees.`}
                        onConfirm={() =>
                          suspend.mutate(ev.id, { onError: () => toast.error('Failed') })
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

// ─── Bookings Tab ──────────────────────────────────────────────────────────────

function BookingsTab() {
  const { data: bookings = [], isPending } = useAdminBookings()

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {isPending ? (
        <LoadingSpinner />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Attendee</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Booked</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.userName}</TableCell>
                <TableCell className="text-slate-500">{b.eventTitle}</TableCell>
                <TableCell>{formatCurrency(b.eventPrice)}</TableCell>
                <TableCell>{formatDate(b.bookedAt)}</TableCell>
                <TableCell>
                  <Badge variant={b.status === 'Cancelled' ? 'destructive' : 'secondary'}>
                    {b.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

// ─── Taxonomy Tab ──────────────────────────────────────────────────────────────

const nameSchema = z.object({ name: z.string().min(1, 'Name is required') })
type NameForm = z.infer<typeof nameSchema>

function TaxonomyDialog({
  mode,
  initial,
  onSave,
  isPending,
  trigger,
}: Readonly<{
  mode: 'create' | 'edit'
  initial?: string
  onSave: (name: string) => void
  isPending: boolean
  trigger: React.ReactNode
}>) {
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: initial ?? '' },
  })

  const onSubmit = (data: NameForm) => {
    onSave(data.name)
    setOpen(false)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create' : 'Edit'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TaxonomyDeleteButton({
  title,
  description,
  onConfirm,
}: Readonly<{
  title: string
  description: string
  onConfirm: () => void
}>) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        onConfirm={() => { onConfirm(); setOpen(false) }}
      />
    </>
  )
}

function TaxonomyTab() {
  const { data: categories = [], isPending: catPending } = useCategories()
  const { data: tags = [], isPending: tagPending } = useTags()
  const createCat = useCreateCategory()
  const updateCat = useUpdateCategory()
  const deleteCat = useDeleteCategory()
  const createTag = useCreateTag()
  const updateTag = useUpdateTag()
  const deleteTag = useDeleteTag()

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Categories */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Categories</h3>
          <TaxonomyDialog
            mode="create"
            onSave={(name) =>
              createCat.mutate(name, { onError: () => toast.error('Failed') })
            }
            isPending={createCat.isPending}
            trigger={
              <Button size="sm">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            }
          />
        </div>
        {catPending ? (
          <LoadingSpinner />
        ) : (
          <ul className="space-y-2">
            {categories.map((cat: Category) => (
              <li key={cat.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <span className="text-sm text-slate-800">{cat.name}</span>
                <div className="flex gap-1">
                  <TaxonomyDialog
                    mode="edit"
                    initial={cat.name}
                    onSave={(name) =>
                      updateCat.mutate({ id: cat.id, name }, { onError: () => toast.error('Failed') })
                    }
                    isPending={updateCat.isPending}
                    trigger={
                      <Button size="sm" variant="ghost">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <TaxonomyDeleteButton
                    title="Delete Category"
                    description={`Delete "${cat.name}"? Events using this category will be unaffected.`}
                    onConfirm={() =>
                      deleteCat.mutate(cat.id, { onError: () => toast.error('Failed') })
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tags */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Tags</h3>
          <TaxonomyDialog
            mode="create"
            onSave={(name) =>
              createTag.mutate(name, { onError: () => toast.error('Failed') })
            }
            isPending={createTag.isPending}
            trigger={
              <Button size="sm">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            }
          />
        </div>
        {tagPending ? (
          <LoadingSpinner />
        ) : (
          <ul className="space-y-2">
            {tags.map((tag: Tag) => (
              <li key={tag.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <span className="text-sm text-slate-800">{tag.name}</span>
                <div className="flex gap-1">
                  <TaxonomyDialog
                    mode="edit"
                    initial={tag.name}
                    onSave={(name) =>
                      updateTag.mutate({ id: tag.id, name }, { onError: () => toast.error('Failed') })
                    }
                    isPending={updateTag.isPending}
                    trigger={
                      <Button size="sm" variant="ghost">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <TaxonomyDeleteButton
                    title="Delete Tag"
                    description={`Delete "${tag.name}"?`}
                    onConfirm={() =>
                      deleteTag.mutate(tag.id, { onError: () => toast.error('Failed') })
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Main AdminPage ────────────────────────────────────────────────────────────

export function AdminPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Admin Panel</h1>
      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="taxonomy">Categories & Tags</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="events"><EventsTab /></TabsContent>
        <TabsContent value="bookings"><BookingsTab /></TabsContent>
        <TabsContent value="taxonomy"><TaxonomyTab /></TabsContent>
      </Tabs>
    </div>
  )
}
