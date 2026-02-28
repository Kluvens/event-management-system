import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { AustralianAddressInput } from '@/components/AustralianAddressInput'
import { useCategories, useTags } from '@/api/tagsCategories'
import { api } from '@/api/axios'
import type { CreateEventRequest, Event } from '@/types'

const schema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    location: z.string().min(2, 'Location is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
    price: z.coerce.number().min(0, 'Price must be 0 or more'),
    isPublic: z.boolean(),
    categoryId: z.coerce.number().min(1, 'Select a category'),
    tagIds: z.array(z.number()),
    imageUrl: z.string().nullable().optional(),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and conditions.' }),
    }),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  })

type FormData = z.infer<typeof schema>

function toInputDateTime(iso: string) {
  return iso.substring(0, 16)
}

interface Props {
  defaultValues?: Event
  onSubmit: (data: CreateEventRequest) => void
  isLoading?: boolean
  submitLabel?: string
  showPublishButton?: boolean
}

export function EventForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Save',
  showPublishButton = false,
}: Props) {
  const { data: categories = [] } = useCategories()
  const { data: tags = [] } = useTags()

  const [imagePreview, setImagePreview] = useState<string | null>(
    defaultValues?.imageUrl ?? null
  )
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const publishIntentRef = useRef(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      location: defaultValues?.location ?? '',
      startDate: defaultValues ? toInputDateTime(defaultValues.startDate) : '',
      endDate: defaultValues ? toInputDateTime(defaultValues.endDate) : '',
      capacity: defaultValues?.capacity ?? 100,
      price: defaultValues?.price ?? 0,
      isPublic: defaultValues?.isPublic ?? true,
      categoryId: defaultValues?.categoryId ?? 0,
      tagIds: [],
      imageUrl: defaultValues?.imageUrl ?? null,
      termsAccepted: undefined as unknown as true,
    },
  })

  // Populate tagIds once tags are loaded (edit mode)
  useEffect(() => {
    if (defaultValues && tags.length > 0) {
      const ids = tags
        .filter((t) => defaultValues.tags.includes(t.name))
        .map((t) => t.id)
      setValue('tagIds', ids)
    }
  }, [tags, defaultValues, setValue])

  const watchedTagIds = watch('tagIds') ?? []

  function handleTagToggle(id: number) {
    setValue(
      'tagIds',
      watchedTagIds.includes(id)
        ? watchedTagIds.filter((t) => t !== id)
        : [...watchedTagIds, id]
    )
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setImagePreview(objectUrl)

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post<{ url: string }>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setValue('imageUrl', response.data.url)
    } catch {
      toast.error('Image upload failed. Please try again.')
      setImagePreview(defaultValues?.imageUrl ?? null)
      setValue('imageUrl', defaultValues?.imageUrl ?? null)
    } finally {
      setIsUploading(false)
    }
  }

  function handleRemoveImage() {
    setImagePreview(null)
    setValue('imageUrl', null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function submit({ termsAccepted: _tc, ...data }: FormData) {
    onSubmit({
      ...data,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
      imageUrl: data.imageUrl ?? null,
      publish: publishIntentRef.current,
    })
  }

  const err = 'text-xs text-red-500 mt-1'
  const lbl = 'text-sm font-medium text-foreground'

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      {/* Event Image */}
      <div className="space-y-1.5">
        <Label className={lbl}>Event Image</Label>
        {imagePreview ? (
          <div className="relative overflow-hidden rounded-xl border border-border">
            <img
              src={imagePreview}
              alt="Event preview"
              className="h-52 w-full object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
            {!isUploading && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-500"
          >
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm font-medium">Upload event image</span>
            <span className="text-xs">JPEG, PNG, WebP or GIF · max 5 MB</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleImageFile}
        />
        {!imagePreview && (
          <p className="text-xs text-muted-foreground">
            A default image based on the event category will be used if none is uploaded.
          </p>
        )}
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className={lbl}>
          Event Title
        </Label>
        <Input
          id="title"
          placeholder="Tech Conference 2026"
          {...register('title')}
        />
        {errors.title && <p className={err}>{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className={lbl}>
          Description
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">Markdown supported</span>
        </Label>
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <MarkdownEditor
              id="description"
              value={field.value}
              onChange={field.onChange}
              placeholder="Describe your event… **bold**, _italic_, ## headings, - lists"
              error={!!errors.description}
            />
          )}
        />
        {errors.description && (
          <p className={err}>{errors.description.message}</p>
        )}
      </div>

      {/* Location — Australian address autocomplete */}
      <div className="space-y-1.5">
        <Label htmlFor="location" className={lbl}>
          Location
        </Label>
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <AustralianAddressInput
              id="location"
              value={field.value}
              onChange={field.onChange}
              placeholder="ICC Sydney, Darling Harbour…"
            />
          )}
        />
        {errors.location && <p className={err}>{errors.location.message}</p>}
      </div>

      {/* Dates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="startDate" className={lbl}>
            Start Date &amp; Time
          </Label>
          <Input
            id="startDate"
            type="datetime-local"
            {...register('startDate')}
          />
          {errors.startDate && (
            <p className={err}>{errors.startDate.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate" className={lbl}>
            End Date &amp; Time
          </Label>
          <Input
            id="endDate"
            type="datetime-local"
            {...register('endDate')}
          />
          {errors.endDate && <p className={err}>{errors.endDate.message}</p>}
        </div>
      </div>

      {/* Capacity & Price */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="capacity" className={lbl}>
            Capacity
          </Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            {...register('capacity')}
          />
          {errors.capacity && <p className={err}>{errors.capacity.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price" className={lbl}>
            Price (AUD, 0 = Free)
          </Label>
          <Input
            id="price"
            type="number"
            min={0}
            step={0.01}
            {...register('price')}
          />
          {errors.price && <p className={err}>{errors.price.message}</p>}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className={lbl}>Category</Label>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <Select
              value={field.value?.toString()}
              onValueChange={(v) => field.onChange(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.categoryId && (
          <p className={err}>{errors.categoryId.message}</p>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className={lbl}>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <label
              key={tag.id}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm transition-colors hover:border-amber-300 has-[:checked]:border-amber-400 has-[:checked]:bg-amber-50 has-[:checked]:text-amber-700 dark:has-[:checked]:bg-amber-950/50 dark:has-[:checked]:text-amber-400"
            >
              <Checkbox
                checked={watchedTagIds.includes(tag.id)}
                onCheckedChange={() => handleTagToggle(tag.id)}
                className="h-3.5 w-3.5"
              />
              {tag.name}
            </label>
          ))}
        </div>
      </div>

      {/* Visibility */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Public Event</p>
          <p className="text-xs text-muted-foreground">
            Visible to everyone on the platform
          </p>
        </div>
        <Controller
          control={control}
          name="isPublic"
          render={({ field }) => (
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Terms & Conditions */}
      <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Terms &amp; Conditions</p>
        <div className="text-xs text-muted-foreground space-y-1.5">
          <p>By creating this event you agree to:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Publish accurate, non-misleading event information.</li>
            <li>Honour all confirmed bookings or provide timely cancellation notice to attendees.</li>
            <li>Not post events that involve illegal activities, hate speech, or deceptive listings.</li>
            <li>If you cancel a published event, all attendees will be notified immediately.</li>
            <li>EventHub may suspend events that breach these terms without prior notice.</li>
          </ul>
        </div>
        <div className="flex items-start gap-2">
          <Controller
            control={control}
            name="termsAccepted"
            render={({ field }) => (
              <Checkbox
                id="termsAccepted"
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true ? true : undefined)}
                className="mt-0.5"
              />
            )}
          />
          <label htmlFor="termsAccepted" className="text-sm text-foreground cursor-pointer">
            I have read and agree to the terms and conditions above.
          </label>
        </div>
        {errors.termsAccepted && (
          <p className="text-xs text-red-500">{errors.termsAccepted.message}</p>
        )}
      </div>

      {/* Submit buttons */}
      {showPublishButton ? (
        <div className="flex gap-3">
          <Button
            type="submit"
            variant="outline"
            className="flex-1"
            disabled={isLoading || isUploading}
            onClick={() => { publishIntentRef.current = false }}
          >
            {isLoading && !publishIntentRef.current ? 'Saving…' : 'Save as Draft'}
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isLoading || isUploading}
            onClick={() => { publishIntentRef.current = true }}
          >
            {isLoading && publishIntentRef.current ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      ) : (
        <Button type="submit" className="w-full" disabled={isLoading || isUploading}>
          {isLoading ? 'Saving…' : submitLabel}
        </Button>
      )}
    </form>
  )
}
