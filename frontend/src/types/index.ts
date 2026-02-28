// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'Attendee' | 'Admin' | 'SuperAdmin'


// ─── Events ───────────────────────────────────────────────────────────────────

export type EventStatus =
  | 'Draft'
  | 'Published'
  | 'Live'
  | 'SoldOut'
  | 'Completed'
  | 'Cancelled'
  | 'Postponed'

export interface Event {
  id: number
  title: string
  description: string
  location: string
  startDate: string
  endDate: string
  capacity: number
  bookingCount: number
  price: number
  isPublic: boolean
  status: string
  displayStatus: EventStatus
  postponedDate: string | null
  createdAt: string
  createdById: number
  createdByName: string
  categoryId: number
  categoryName: string
  tags: string[]
  imageUrl: string | null
  inviteCode?: string | null
}

export interface EventStats {
  eventId: number
  title: string
  totalCapacity: number
  confirmedBookings: number
  cancelledBookings: number
  occupancyRate: number
  totalRevenue: number
  averageRating: number
  reviewCount: number
}

export interface CreateEventRequest {
  title: string
  description: string
  location: string
  startDate: string
  endDate: string
  capacity: number
  price: number
  isPublic: boolean
  categoryId: number
  tagIds: number[]
  imageUrl?: string | null
  publish?: boolean
}

export interface PagedEventResponse {
  items: Event[]
  totalCount: number
  hasMore: boolean
}

export type UpdateEventRequest = CreateEventRequest

export interface PostponeEventRequest {
  newStartDate: string
  newEndDate: string
}

export interface EventFilters {
  search?: string
  location?: string
  categoryId?: number
  tagIds?: number[]
  from?: string
  to?: string
  sortBy?: 'date' | 'popularity' | 'price'
}

// ─── Announcements ────────────────────────────────────────────────────────────

export interface Announcement {
  id: number
  eventId: number
  eventTitle: string
  title: string
  message: string
  createdAt: string
}

export interface CreateAnnouncementRequest {
  title: string
  message: string
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface Booking {
  id: number
  eventId: number
  eventTitle: string
  eventLocation: string
  eventStartDate: string
  eventEndDate: string
  eventPrice: number
  bookedAt: string
  status: 'Confirmed' | 'Cancelled'
  pointsEarned: number
  isCheckedIn: boolean
  checkedInAt: string | null
  checkInToken: string
}

export interface CheckInInfo {
  bookingId: number
  userId: number
  attendeeName: string
  eventTitle: string
  isCheckedIn: boolean
  checkedInAt: string | null
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface ReviewReply {
  id: number
  userId: number
  userName: string
  comment: string
  createdAt: string
}

export interface Review {
  id: number
  eventId: number
  userId: number
  userName: string
  rating: number
  comment: string
  isPinned: boolean
  likes: number
  dislikes: number
  createdAt: string
  replies: ReviewReply[]
}

export interface CreateReviewRequest {
  rating: number
  comment: string
}

// ─── Tags & Categories ────────────────────────────────────────────────────────

export interface Tag {
  id: number
  name: string
}

export interface Category {
  id: number
  name: string
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export interface Subscription {
  hostId: number
  name: string
  subscribedAt: string
}

export interface Subscriber {
  subscriberId: number
  name: string
  subscribedAt: string
}

// ─── Organizer ────────────────────────────────────────────────────────────────

export interface OrganizerEvent {
  id: number
  title: string
  displayStatus: EventStatus
  startDate: string
  confirmedBookings: number
  capacity: number
}

export interface OrganizerProfile {
  id: number
  name: string
  bio: string | null
  website: string | null
  twitterHandle: string | null
  instagramHandle: string | null
  followerCount: number
  memberSince: string
  events: OrganizerEvent[]
}

export interface UpdateOrganizerProfileRequest {
  name?: string
  bio?: string | null
  website?: string | null
  twitterHandle?: string | null
  instagramHandle?: string | null
}

export interface DashboardEvent {
  eventId: number
  title: string
  displayStatus: EventStatus
  startDate: string
  confirmedBookings: number
  capacity: number
  revenue: number
  checkedIn: number
}

export interface OrganizerDashboard {
  totalEvents: number
  totalAttendees: number
  totalRevenue: number
  totalCheckedIn: number
  upcomingEvents: DashboardEvent[]
  recentEvents: DashboardEvent[]
}

export interface AttendeeRecord {
  bookingId: number
  userId: number
  name: string
  email: string
  bookedAt: string
  bookingStatus: 'Confirmed' | 'Cancelled'
  isCheckedIn: boolean
  checkedInAt: string | null
  checkInToken: string
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminUserSummary {
  id: number
  name: string
  email: string
  role: UserRole
  isSuspended: boolean
  loyaltyTier: string
  loyaltyPoints: number
  eventCount: number
  confirmedBookingCount: number
  createdAt: string
}

export interface AdminUserDetail extends AdminUserSummary {
  recentBookings: Booking[]
  recentEvents: Event[]
}

export interface AdminEvent {
  id: number
  title: string
  description: string
  location: string
  startDate: string
  endDate: string
  capacity: number
  bookingCount: number
  price: number
  isPublic: boolean
  status: string
  displayStatus: EventStatus
  isSuspended: boolean
  createdById: number
  createdByName: string
  categoryName: string
  tags: string[]
  createdAt: string
  imageUrl: string | null
}

export interface AdminBooking {
  id: number
  eventId: number
  eventTitle: string
  userId: number
  userName: string
  eventPrice: number
  bookedAt: string
  status: 'Confirmed' | 'Cancelled'
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  totalEvents: number
  activeEvents: number
  suspendedEvents: number
  totalBookings: number
  confirmedBookings: number
  totalRevenue: number
}

export interface AdjustPointsRequest {
  delta: number
}

export interface LoyaltyPointsResponse {
  userId: number
  loyaltyPoints: number
  loyaltyTier: string
}

// ─── Waitlist ──────────────────────────────────────────────────────────────────

export interface WaitlistPosition {
  eventId: number
  position: number
  joinedAt: string
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'BookingConfirmation'
  | 'EventReminder'
  | 'ReviewReminder'
  | 'EventUpdate'
  | 'Announcement'
  | 'EventCancelled'
  | 'EventPostponed'
  | 'WaitlistPromotion'
  | 'SystemAnnouncement'
  | 'General'

export interface Notification {
  id: number
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  createdAt: string
  eventId: number | null
}

export interface UnreadCountResponse {
  count: number
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface DailyBookingCount {
  date: string
  count: number
}

export interface EventAnalytics {
  eventId: number
  title: string
  totalCapacity: number
  confirmedBookings: number
  cancelledBookings: number
  waitlistCount: number
  occupancyRate: number
  totalRevenue: number
  averageRating: number
  reviewCount: number
  dailyBookings: DailyBookingCount[]
}

// ─── Loyalty Store ────────────────────────────────────────────────────────────

export type StoreCategory = 'Badge' | 'Cosmetic' | 'Feature' | 'Perk' | 'Collectible'

export interface StoreProduct {
  id: number
  name: string
  description: string
  pointCost: number
  category: StoreCategory
  imageUrl?: string
  isActive: boolean
  alreadyOwned: boolean
}

export interface UserPurchase {
  id: number
  product: StoreProduct
  purchasedAt: string
  pointsSpent: number
}

export interface PurchaseProductResponse {
  purchaseId: number
  productName: string
  pointsSpent: number
  remainingPoints: number
}

export interface CreateProductRequest {
  name: string
  description: string
  pointCost: number
  category: StoreCategory
  imageUrl?: string
}

export interface UpdateProductRequest {
  name?: string
  description?: string
  pointCost?: number
  category?: StoreCategory
  imageUrl?: string
  isActive?: boolean
}
