import { useParams, useNavigate } from 'react-router-dom'
import { EventForm } from '@/features/events/EventForm'
import { useEvent, useUpdateEvent } from '@/api/events'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { CreateEventRequest } from '@/types'

export function EditEventPage() {
  const { id } = useParams<{ id: string }>()
  const eventId = parseInt(id ?? '0')
  const navigate = useNavigate()

  const { data: event, isPending } = useEvent(eventId)
  const updateEvent = useUpdateEvent(eventId)

  async function handleSubmit(data: CreateEventRequest) {
    await updateEvent.mutateAsync(data)
    navigate(`/events/${eventId}`)
  }

  if (isPending) return <LoadingSpinner />
  if (!event) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center text-slate-500">
        Event not found.
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Edit Event</h1>
        <p className="mt-1 text-sm text-slate-500">
          Changes to a published event are visible immediately.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <EventForm
          defaultValues={event}
          onSubmit={handleSubmit}
          isLoading={updateEvent.isPending}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  )
}
