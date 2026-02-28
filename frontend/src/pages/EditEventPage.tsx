import { useParams, useNavigate } from 'react-router-dom'
import { EventForm } from '@/features/events/EventForm'
import { useEvent, useUpdateEvent, usePublishEvent } from '@/api/events'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { CreateEventRequest } from '@/types'

export function EditEventPage() {
  const { id } = useParams<{ id: string }>()
  const eventId = parseInt(id ?? '0')
  const navigate = useNavigate()

  const { data: event, isPending } = useEvent(eventId)
  const updateEvent = useUpdateEvent(eventId)
  const publishEvent = usePublishEvent()

  const isDraft = event?.status === 'Draft'

  async function handleSubmit(data: CreateEventRequest) {
    await updateEvent.mutateAsync(data)
    if (data.publish) {
      await publishEvent.mutateAsync(eventId)
      navigate(`/events/${eventId}`)
    }
    // Saving without publishing keeps the user on the edit page so they can keep refining
  }

  if (isPending) return <LoadingSpinner />
  if (!event) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
        Event not found.
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Edit Event</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isDraft
            ? 'Your draft is only visible to you. Publish when you\'re ready.'
            : 'Changes to a published event are visible immediately.'}
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <EventForm
          defaultValues={event}
          onSubmit={handleSubmit}
          isLoading={updateEvent.isPending || publishEvent.isPending}
          showPublishButton={isDraft}
          draftLabel="Save Changes"
          submitLabel="Save Changes"
        />
      </div>
    </div>
  )
}
