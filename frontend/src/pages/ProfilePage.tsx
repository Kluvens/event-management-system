import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User,
  Globe,
  Coins,
  Award,
  Sparkles,
  Zap,
  Star,
  Gift,
  ShoppingBag,
  Twitter,
  Instagram,
  Pencil,
  X,
  Check,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'
import { useUpdateProfile } from '@/api/organizers'
import { useMyPurchases } from '@/api/store'
import { getInitials } from '@/lib/utils'
import type { StoreCategory } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Name too long'),
  bio: z.string().max(500, 'Bio too long').optional(),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const categoryMeta: Record<StoreCategory, { icon: React.ElementType; label: string; color: string }> = {
  Badge:       { icon: Award,    label: 'Badge',       color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400' },
  Cosmetic:    { icon: Sparkles, label: 'Cosmetic',    color: 'text-pink-600 bg-pink-50 dark:bg-pink-950/40 dark:text-pink-400' },
  Feature:     { icon: Zap,      label: 'Feature',     color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400' },
  Perk:        { icon: Star,     label: 'Perk',        color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400' },
  Collectible: { icon: Gift,     label: 'Collectible', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' },
}

const tierConfig: Record<string, { color: string; bar: string; next?: string; nextAt?: number }> = {
  Standard: { color: 'text-stone-600 dark:text-stone-400',    bar: 'bg-stone-400',  next: 'Bronze', nextAt: 1000 },
  Bronze:   { color: 'text-amber-700 dark:text-amber-500',    bar: 'bg-amber-600',  next: 'Silver', nextAt: 5000 },
  Silver:   { color: 'text-slate-500 dark:text-slate-400',    bar: 'bg-slate-400',  next: 'Gold',   nextAt: 15000 },
  Gold:     { color: 'text-yellow-600 dark:text-yellow-400',  bar: 'bg-yellow-400', next: 'Elite',  nextAt: 50000 },
  Elite:    { color: 'text-violet-600 dark:text-violet-400',  bar: 'bg-violet-500' },
}

const tierBadge: Record<string, string> = {
  Standard: 'border-stone-300 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400',
  Bronze:   'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  Silver:   'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
  Gold:     'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400',
  Elite:    'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
}

export function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const updateProfile = useUpdateProfile()
  const { data: purchases = [] } = useMyPurchases()
  const [editing, setEditing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      bio: user?.bio ?? '',
      website: user?.website ?? '',
      twitterHandle: user?.twitterHandle ?? '',
      instagramHandle: user?.instagramHandle ?? '',
    },
  })

  function onEdit() {
    reset({
      name: user?.name ?? '',
      bio: user?.bio ?? '',
      website: user?.website ?? '',
      twitterHandle: user?.twitterHandle ?? '',
      instagramHandle: user?.instagramHandle ?? '',
    })
    setEditing(true)
  }

  function onCancel() {
    setEditing(false)
  }

  function onSubmit(data: FormData) {
    updateProfile.mutate(
      {
        name: data.name,
        bio: data.bio || null,
        website: data.website || null,
        twitterHandle: data.twitterHandle || null,
        instagramHandle: data.instagramHandle || null,
      },
      {
        onSuccess: () => {
          if (user) {
            setUser({
              ...user,
              name: data.name,
              bio: data.bio || null,
              website: data.website || null,
              twitterHandle: data.twitterHandle || null,
              instagramHandle: data.instagramHandle || null,
            })
          }
          setEditing(false)
        },
      },
    )
  }

  if (!user) return null

  const tier = user.loyaltyTier
  const tc = tierConfig[tier] ?? tierConfig.Standard
  const nextAt = tc.nextAt
  const progressPct = nextAt
    ? Math.min(100, Math.round((user.loyaltyPoints / nextAt) * 100))
    : 100

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* ── Header banner ─────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-400 dark:from-amber-900 dark:via-orange-900 dark:to-stone-900 pb-20 pt-10">
        <div className="container mx-auto max-w-4xl px-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Account</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white">My Profile</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 pb-16">
        {/* ── Profile card (overlaps banner) ────────────────── */}
        <div className="-mt-12 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
          {/* Avatar row */}
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {/* Avatar circle */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl font-extrabold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 ring-4 ring-white dark:ring-stone-900">
                {getInitials(user.name)}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">{user.name}</h2>
                  <Badge variant="outline" className={`text-[11px] font-semibold ${tierBadge[tier] ?? tierBadge.Standard}`}>
                    {tier}
                  </Badge>
                </div>
                <p className="text-sm text-stone-500 dark:text-stone-400">{user.email}</p>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">{user.role}</p>
              </div>
            </div>

            {!editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="self-start border-stone-200 dark:border-stone-700 sm:self-auto"
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit Profile
              </Button>
            )}
          </div>

          {/* Loyalty bar */}
          <div className="border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                  {user.loyaltyPoints.toLocaleString()} pts
                </span>
                <span className="text-xs text-stone-400">loyalty points</span>
              </div>
              {tc.next && (
                <span className="text-xs text-stone-400">
                  {(nextAt! - user.loyaltyPoints).toLocaleString()} to {tc.next}
                </span>
              )}
              {!tc.next && (
                <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">Max tier reached</span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${tc.bar}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Bio / form */}
          <div className="border-t border-stone-100 dark:border-stone-800 p-6">
            {editing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-stone-500">Display Name</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio" className="text-xs font-semibold uppercase tracking-wide text-stone-500">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell others a little about yourself…"
                    rows={3}
                    {...register('bio')}
                  />
                  {errors.bio && <p className="text-xs text-red-500">{errors.bio.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="website" className="text-xs font-semibold uppercase tracking-wide text-stone-500">Website</Label>
                  <Input id="website" placeholder="https://yoursite.com" {...register('website')} />
                  {errors.website && <p className="text-xs text-red-500">{errors.website.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="twitter" className="text-xs font-semibold uppercase tracking-wide text-stone-500">X / Twitter</Label>
                    <Input id="twitter" placeholder="@handle" {...register('twitterHandle')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="instagram" className="text-xs font-semibold uppercase tracking-wide text-stone-500">Instagram</Label>
                    <Input id="instagram" placeholder="@handle" {...register('instagramHandle')} />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!isDirty || updateProfile.isPending}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Bio */}
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                  <p className="text-sm text-stone-700 dark:text-stone-300">
                    {user.bio || <span className="italic text-stone-400">No bio yet.</span>}
                  </p>
                </div>

                {/* Website */}
                {user.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 shrink-0 text-stone-400" />
                    <a
                      href={user.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-amber-600 hover:underline dark:text-amber-400"
                    >
                      {user.website}
                    </a>
                  </div>
                )}

                {/* Socials */}
                {(user.twitterHandle || user.instagramHandle) && (
                  <div className="flex flex-wrap gap-3">
                    {user.twitterHandle && (
                      <span className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
                        <Twitter className="h-4 w-4" />
                        {user.twitterHandle}
                      </span>
                    )}
                    {user.instagramHandle && (
                      <span className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
                        <Instagram className="h-4 w-4" />
                        {user.instagramHandle}
                      </span>
                    )}
                  </div>
                )}

                {!user.bio && !user.website && !user.twitterHandle && !user.instagramHandle && (
                  <p className="text-sm italic text-stone-400">
                    Add a bio, website, or social handles to complete your profile.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── My Collection ─────────────────────────────────── */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-amber-500" />
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">My Collection</h2>
            {purchases.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                {purchases.length} item{purchases.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-stone-200 bg-white py-16 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800">
                <ShoppingBag className="h-7 w-7 text-stone-400" />
              </div>
              <p className="font-semibold text-stone-600 dark:text-stone-400">No items yet</p>
              <p className="text-sm text-stone-400">
                Visit the Loyalty Store to spend your points on exclusive items.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {purchases.map((p) => {
                const meta = categoryMeta[p.product.category] ?? categoryMeta.Collectible
                const Icon = meta.icon
                return (
                  <div
                    key={p.id}
                    className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold leading-snug text-stone-900 dark:text-stone-100">
                          {p.product.name}
                        </p>
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[11px] border-stone-200 dark:border-stone-700"
                        >
                          {meta.label}
                        </Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-stone-500 dark:text-stone-400">
                        {p.product.description}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-stone-400">
                        <span className="flex items-center gap-1">
                          <Coins className="h-3 w-3 text-amber-500" />
                          {p.pointsSpent.toLocaleString()} pts
                        </span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(p.purchasedAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
