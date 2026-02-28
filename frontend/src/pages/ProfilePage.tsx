import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Globe, Coins } from 'lucide-react'
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
import { getInitials } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Name too long'),
  bio: z.string().max(500, 'Bio too long').optional(),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const tierColors: Record<string, string> = {
  Bronze: 'bg-amber-700 text-white',
  Silver: 'bg-slate-400 text-white',
  Gold: 'bg-amber-400 text-black',
  Platinum: 'bg-sky-400 text-white',
}

export function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const updateProfile = useUpdateProfile()
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
    </div>
  )
}
