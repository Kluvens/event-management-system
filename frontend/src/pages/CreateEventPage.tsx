import { useNavigate } from 'react-router-dom'
import { EventForm } from '@/features/events/EventForm'
import { useCreateEvent } from '@/api/events'
import type { CreateEventRequest } from '@/types'

export function CreateEventPage() {
  const navigate = useNavigate()
  const createEvent = useCreateEvent()

  async function handleSubmit(data: CreateEventRequest) {
    const event = await createEvent.mutateAsync(data)
    // Drafts go to the edit page so the user can keep refining; published events go to the detail page
    navigate(data.publish ? `/events/${event.id}` : `/events/${event.id}/edit`)
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Create Event</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Save as a draft to continue editing later, or publish immediately to make it visible to attendees.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <EventForm
          onSubmit={handleSubmit}
          isLoading={createEvent.isPending}
          showPublishButton
        />
      </div>
    </div>
  )
}
