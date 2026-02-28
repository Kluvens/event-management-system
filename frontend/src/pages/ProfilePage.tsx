import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Globe, Coins, Award, Sparkles, Zap, Star, Gift, ShoppingBag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  Badge:       { icon: Award,    label: 'Badge',       color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
  Cosmetic:    { icon: Sparkles, label: 'Cosmetic',    color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/40' },
  Feature:     { icon: Zap,      label: 'Feature',     color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
  Perk:        { icon: Star,     label: 'Perk',        color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
  Collectible: { icon: Gift,     label: 'Collectible', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
}

const tierColors: Record<string, string> = {
  Bronze: 'bg-amber-700 text-white',
  Silver: 'bg-slate-400 text-white',
  Gold: 'bg-amber-400 text-black',
  Platinum: 'bg-sky-400 text-white',
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

  const tierClass = tierColors[user.loyaltyTier] ?? 'bg-amber-600 text-white'

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">My Profile</h1>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-amber-100 text-xl font-semibold text-amber-700">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-xl">{user.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="mt-0.5 text-xs font-medium text-amber-600">{user.role}</p>
            </div>
            {!editing && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>

        <Separator />

        {/* Loyalty */}
        <CardContent className="pt-4">
          <div className="mb-6 flex items-center gap-3">
            <Coins className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium">{user.loyaltyPoints.toLocaleString()} points</p>
              <p className="text-xs text-muted-foreground">Loyalty balance</p>
            </div>
            <Badge className={tierClass}>{user.loyaltyTier}</Badge>
          </div>

          <Separator className="mb-6" />

          {/* Profile form */}
          {editing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell others a little about yourself…"
                  rows={3}
                  {...register('bio')}
                />
                {errors.bio && <p className="text-xs text-red-500">{errors.bio.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://yoursite.com" {...register('website')} />
                {errors.website && (
                  <p className="text-xs text-red-500">{errors.website.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="twitter">X (Twitter) handle</Label>
                  <Input id="twitter" placeholder="@handle" {...register('twitterHandle')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="instagram">Instagram handle</Label>
                  <Input id="instagram" placeholder="@handle" {...register('instagramHandle')} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!isDirty || updateProfile.isPending}>
                  {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Bio</p>
                  <p className="text-sm">{user.bio || 'No bio yet.'}</p>
                </div>
              </div>

              {user.website && (
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-amber-600 hover:underline"
                  >
                    {user.website}
                  </a>
                </div>
              )}

              {(user.twitterHandle || user.instagramHandle) && (
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {user.twitterHandle && <span>X: {user.twitterHandle}</span>}
                  {user.instagramHandle && <span>Instagram: {user.instagramHandle}</span>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {/* My Collection */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold">My Collection</h2>
          {purchases.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              {purchases.length} item{purchases.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {purchases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground">No items yet</p>
              <p className="text-sm text-muted-foreground/60">
                Visit the Loyalty Store to spend your points on exclusive items.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {purchases.map((p) => {
              const meta = categoryMeta[p.product.category] ?? categoryMeta.Collectible
              const Icon = meta.icon
              return (
                <Card key={p.id} className="flex items-start gap-4 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold leading-snug">{p.product.name}</p>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {p.product.description}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground/70">
                      <span className="flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        {p.pointsSpent.toLocaleString()} pts
                      </span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(p.purchasedAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
