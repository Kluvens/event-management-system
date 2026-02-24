import { useNavigate } from 'react-router-dom'
import { EventForm } from '@/features/events/EventForm'
import { useCreateEvent } from '@/api/events'
import type { CreateEventRequest } from '@/types'

export function CreateEventPage() {
  const navigate = useNavigate()
  const createEvent = useCreateEvent()

  async function handleSubmit(data: CreateEventRequest) {
    const event = await createEvent.mutateAsync(data)
    navigate(`/events/${event.id}`)
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Create Event</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your event starts as a draft. Publish it when you&apos;re ready.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <EventForm
          onSubmit={handleSubmit}
          isLoading={createEvent.isPending}
          submitLabel="Create Event"
        />
      </div>
    </div>
  )
}
