using EventManagement.Data;
using EventManagement.Models;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Services;

public static class SeedService
{
    public static async Task SeedDemoDataAsync(AppDbContext db)
    {
        if (await db.Events.AnyAsync()) return;

        var now = DateTime.UtcNow;

        // ── Users ──────────────────────────────────────────────────────────────

        // Organizers
        var alex = new User
        {
            Name         = "Alex Chambers",
            Email        = "alex@demo.eventhub",
            PasswordHash = string.Empty,
            Role         = "Attendee",
            Bio          = "Passionate tech event organiser based in Sydney. Building communities one event at a time.",
            Website      = "https://alexchambers.demo",
            LoyaltyPoints = 4200,
        };
        var priya = new User
        {
            Name         = "Priya Mehta",
            Email        = "priya@demo.eventhub",
            PasswordHash = string.Empty,
            Role         = "Attendee",
            Bio          = "Arts & culture curator. I believe great events change lives — I've been running workshops across Sydney since 2019.",
            Website      = "https://priyamehta.demo",
            LoyaltyPoints = 2800,
        };
        var jordan = new User
        {
            Name         = "Jordan Clarke",
            Email        = "jordan@demo.eventhub",
            PasswordHash = string.Empty,
            Role         = "Attendee",
            Bio          = "Fitness coach and outdoor adventure specialist. If it involves mountains or mud, I'm in.",
            LoyaltyPoints = 1500,
        };

        // Attendees
        var sam = new User
        {
            Name         = "Sam Rivera",
            Email        = "sam@demo.eventhub",
            PasswordHash = string.Empty,
            Role         = "Attendee",
            LoyaltyPoints = 3890,
        };
        var maya = new User
        {
            Name         = "Maya Chen",
            Email        = "maya@demo.eventhub",
            PasswordHash = string.Empty,
            Role         = "Attendee",
            LoyaltyPoints = 2100,
        };
        var luca = new User
        {
            Name         = "Luca Bianchi",
            Email        = "luca@demo.eventhub",
            PasswordHash = string.Empty,
            Role         = "Attendee",
            LoyaltyPoints = 760,
        };
        var anna = new User
        {
            Name         = "Anna Williams",
            Email        = "anna@demo.eventhub",
            PasswordHash = string.Empty,
            Role         = "Attendee",
            LoyaltyPoints = 1340,
        };
        var tom = new User
        {
            Name         = "Tom Hassan",
            Email        = "tom@demo.eventhub",
            PasswordHash = string.Empty,
            Role         = "Attendee",
            LoyaltyPoints = 980,
        };

        db.Users.AddRange(alex, priya, jordan, sam, maya, luca, anna, tom);
        await db.SaveChangesAsync();

        // ── Events ─────────────────────────────────────────────────────────────
        // Category IDs: 1=Conference, 2=Workshop, 3=Concert, 4=Sports, 5=Networking, 6=Other
        // Tag IDs: 1=Music 2=Technology 3=Business 4=Arts 5=Food&Drink 6=Health&Wellness
        //          7=Education 8=Entertainment 9=Gaming 10=Outdoor 11=Charity 12=Family

        var events = new List<Event>
        {
            // ── Upcoming (published) ───────────────────────────────────────────

            // [0] AI Summit — 14 days, 200 cap
            new() {
                Title       = "AI & Machine Learning Summit 2026",
                Description = "Join industry leaders and researchers for a deep dive into the latest advances in artificial intelligence and machine learning. Featuring keynotes, workshops, and networking sessions across two packed days.",
                Location    = "International Convention Centre, Darling Harbour, Sydney NSW 2000",
                StartDate   = now.AddDays(14),
                EndDate     = now.AddDays(15),
                Capacity    = 200,
                Price       = 149m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 1,
                CreatedById = alex.Id,
            },
            // [1] React Workshop — 7 days, 30 cap (almost full)
            new() {
                Title       = "React Workshop: Advanced Patterns",
                Description = "An intensive hands-on workshop covering advanced React patterns including compound components, render props, custom hooks, and performance optimisation. Bring your laptop — this is a coding day.",
                Location    = "Fishburners, 11 York St, Sydney NSW 2000",
                StartDate   = now.AddDays(7),
                EndDate     = now.AddDays(7).AddHours(8),
                Capacity    = 30,
                Price       = 79m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 2,
                CreatedById = alex.Id,
            },
            // [2] Jazz Under the Stars — 21 days, 500 cap
            new() {
                Title       = "Jazz Under the Stars",
                Description = "An unforgettable evening of live jazz performed under the open sky at the Royal Botanic Garden. Bring a picnic rug and enjoy world-class musicians in a magical setting. Free entry — all welcome.",
                Location    = "Royal Botanic Garden, Mrs Macquaries Rd, Sydney NSW 2000",
                StartDate   = now.AddDays(21),
                EndDate     = now.AddDays(21).AddHours(4),
                Capacity    = 500,
                Price       = 0m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 3,
                CreatedById = priya.Id,
            },
            // [3] Trail Running Camp — 30 days, 50 cap
            new() {
                Title       = "Sydney Trail Running Camp",
                Description = "Three days of guided trail running through the Blue Mountains with expert coaches. Suitable for all levels from beginners to experienced trail runners. Accommodation and meals included in the price.",
                Location    = "Echo Point, Katoomba NSW 2780",
                StartDate   = now.AddDays(30),
                EndDate     = now.AddDays(33),
                Capacity    = 50,
                Price       = 349m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 4,
                CreatedById = jordan.Id,
            },
            // [4] Networking Night — 10 days, 100 cap
            new() {
                Title       = "Tech Startup Networking Night",
                Description = "Monthly meetup for founders, engineers, designers and investors in the Sydney tech ecosystem. Grab a drink, meet your next co-founder or collaborator, and hear a short pitch from three local startups. Free to attend.",
                Location    = "The Grounds of Alexandria, 2 Huntley St, Alexandria NSW 2015",
                StartDate   = now.AddDays(10),
                EndDate     = now.AddDays(10).AddHours(3),
                Capacity    = 100,
                Price       = 0m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 5,
                CreatedById = alex.Id,
            },
            // [5] Family Fun Day — 45 days, 300 cap
            new() {
                Title       = "Family Fun Day at Centennial Park",
                Description = "A full day of activities for the whole family — bouncy castles, face painting, live music, food stalls and games. Free entry. Rain or shine — covered areas available.",
                Location    = "Centennial Park, Grand Dr, Centennial Park NSW 2021",
                StartDate   = now.AddDays(45),
                EndDate     = now.AddDays(45).AddHours(8),
                Capacity    = 300,
                Price       = 0m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 6,
                CreatedById = priya.Id,
            },
            // [6] Blockchain Conference — 50 days, 400 cap
            new() {
                Title       = "Blockchain & Web3 Developer Conference",
                Description = "Australia's largest gathering of blockchain developers, DeFi builders and Web3 entrepreneurs. Three tracks covering smart contracts, Layer 2 scaling, NFTs and decentralised identity. Day passes and full conference tickets available.",
                Location    = "Melbourne Convention and Exhibition Centre, 1 Convention Pl, South Wharf VIC 3006",
                StartDate   = now.AddDays(50),
                EndDate     = now.AddDays(51),
                Capacity    = 400,
                Price       = 249m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 1,
                CreatedById = alex.Id,
            },
            // [7] Watercolour Workshop — 18 days, 20 cap (almost full)
            new() {
                Title       = "Watercolour Painting Workshop for Beginners",
                Description = "Learn the fundamentals of watercolour painting in this relaxed, guided workshop. All materials provided. You will leave with two finished paintings and the confidence to keep going. No prior experience needed.",
                Location    = "Carriageworks, 245 Wilson St, Eveleigh NSW 2015",
                StartDate   = now.AddDays(18),
                EndDate     = now.AddDays(18).AddHours(5),
                Capacity    = 20,
                Price       = 89m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 2,
                CreatedById = priya.Id,
            },
            // [8] Python Bootcamp — 40 days, 30 cap
            new() {
                Title       = "Python Data Science Bootcamp",
                Description = "A weekend deep-dive into data science with Python. Topics include pandas, matplotlib, scikit-learn and a capstone machine learning project. Laptops required. Suitable for intermediate Python developers.",
                Location    = "General Assembly, 1 Margaret St, Sydney NSW 2000",
                StartDate   = now.AddDays(40),
                EndDate     = now.AddDays(41),
                Capacity    = 30,
                Price       = 129m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 2,
                CreatedById = alex.Id,
            },
            // [9] Charity Gala — 60 days, 80 cap
            new() {
                Title       = "Charity Gala Dinner: Support Youth Education",
                Description = "An elegant black-tie gala dinner raising funds for underprivileged youth education programs across regional Australia. Entertainment, silent auction, and a three-course dinner. All proceeds go directly to the cause.",
                Location    = "Sydney Town Hall, 483 George St, Sydney NSW 2000",
                StartDate   = now.AddDays(60),
                EndDate     = now.AddDays(60).AddHours(5),
                Capacity    = 80,
                Price       = 250m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 6,
                CreatedById = priya.Id,
            },

            // ── Special states ─────────────────────────────────────────────────

            // [10] Draft
            new() {
                Title       = "Clean Energy Innovation Forum",
                Description = "A gathering of clean energy researchers, engineers and investors discussing the path to net zero. Draft — final agenda still being confirmed.",
                Location    = "CSIRO Discovery, Black Mountain Dr, Canberra ACT 2601",
                StartDate   = now.AddDays(70),
                EndDate     = now.AddDays(71),
                Capacity    = 120,
                Price       = 99m,
                IsPublic    = true,
                Status      = "Draft",
                CategoryId  = 1,
                CreatedById = alex.Id,
            },
            // [11] Cancelled
            new() {
                Title       = "Yoga & Mindfulness Weekend Retreat",
                Description = "A rejuvenating two-day retreat in the Hunter Valley focusing on yoga, breathwork and mindfulness meditation. This event has been cancelled due to venue unavailability.",
                Location    = "Peterson House, Broke Rd, Pokolbin NSW 2320",
                StartDate   = now.AddDays(25),
                EndDate     = now.AddDays(26),
                Capacity    = 60,
                Price       = 299m,
                IsPublic    = true,
                Status      = "Cancelled",
                CategoryId  = 6,
                CreatedById = jordan.Id,
            },
            // [12] Postponed
            new() {
                Title       = "JavaScript Full-Stack Bootcamp",
                Description = "An intensive five-day bootcamp covering Node.js, Express, React and PostgreSQL. Build a complete full-stack application from scratch. This event has been rescheduled — see new dates below.",
                Location    = "Coder Academy, 3/9 Barrack St, Sydney NSW 2000",
                StartDate   = now.AddDays(55),
                EndDate     = now.AddDays(59),
                Capacity    = 25,
                Price       = 1299m,
                IsPublic    = true,
                Status      = "Postponed",
                PostponedDate = now.AddDays(15),
                CategoryId  = 2,
                CreatedById = alex.Id,
            },
            // [13] Live — started 12h ago, 200 cap
            new() {
                Title       = "DevOps & Cloud Summit 2026",
                Description = "Two-day summit covering Kubernetes, CI/CD pipelines, infrastructure as code and cloud-native architectures. Live now — join us for Day 2 tomorrow.",
                Location    = "Swissotel Sydney, 68 Market St, Sydney NSW 2000",
                StartDate   = now.AddHours(-12),
                EndDate     = now.AddHours(20),
                Capacity    = 200,
                Price       = 129m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 1,
                CreatedById = alex.Id,
            },

            // ── Past (completed) ───────────────────────────────────────────────

            // [14] Italian Cooking — -20 days, 15 cap
            new() {
                Title       = "Italian Cooking Masterclass",
                Description = "Learn to make fresh pasta, risotto and tiramisu from scratch with award-winning chef Marco Conti. A hands-on class for food lovers. All ingredients and equipment provided.",
                Location    = "The Essential Ingredient, 731 Bourke St, Surry Hills NSW 2010",
                StartDate   = now.AddDays(-20),
                EndDate     = now.AddDays(-20).AddHours(4),
                Capacity    = 15,
                Price       = 120m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 2,
                CreatedById = priya.Id,
            },
            // [15] Women in Tech — -35 days, 200 cap
            new() {
                Title       = "Women in Tech Conference Sydney",
                Description = "Annual conference celebrating and connecting women in technology across Australia. Inspiring keynotes, mentorship sessions, and a dedicated job fair. Thank you to all who attended — see you next year!",
                Location    = "Sofitel Sydney Wentworth, 61-101 Phillip St, Sydney NSW 2000",
                StartDate   = now.AddDays(-35),
                EndDate     = now.AddDays(-34),
                Capacity    = 200,
                Price       = 89m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 1,
                CreatedById = alex.Id,
            },
            // [16] Photography Walk — -14 days, 20 cap
            new() {
                Title       = "Outdoor Photography Walk: Harbour Bridge",
                Description = "A guided photography walk around the iconic Sydney Harbour Bridge and foreshore at golden hour. Suitable for all camera types including smartphones. Tips on composition, light and post-processing included.",
                Location    = "Milsons Point Station, Kirribilli NSW 2061",
                StartDate   = now.AddDays(-14),
                EndDate     = now.AddDays(-14).AddHours(3),
                Capacity    = 20,
                Price       = 45m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 6,
                CreatedById = priya.Id,
            },
            // [17] Comedy Night — -7 days, 150 cap
            new() {
                Title       = "Comedy Night: Laugh Out Loud",
                Description = "Three hours of non-stop comedy from five of Australia's best stand-up comedians. Two-drink minimum included in the ticket price. All ages welcome — clean set.",
                Location    = "Sydney Comedy Store, Entertainment Quarter, Moore Park NSW 2021",
                StartDate   = now.AddDays(-7),
                EndDate     = now.AddDays(-7).AddHours(3),
                Capacity    = 150,
                Price       = 35m,
                IsPublic    = true,
                Status      = "Published",
                CategoryId  = 3,
                CreatedById = jordan.Id,
            },
        };

        db.Events.AddRange(events);
        await db.SaveChangesAsync();

        // ── Event tags ─────────────────────────────────────────────────────────

        db.EventTags.AddRange(
            // AI Summit → Technology, Business
            new EventTag { EventId = events[0].Id, TagId = 2 },
            new EventTag { EventId = events[0].Id, TagId = 3 },
            // React Workshop → Technology, Education
            new EventTag { EventId = events[1].Id, TagId = 2 },
            new EventTag { EventId = events[1].Id, TagId = 7 },
            // Jazz → Music, Entertainment
            new EventTag { EventId = events[2].Id, TagId = 1 },
            new EventTag { EventId = events[2].Id, TagId = 8 },
            // Trail Running → Outdoor, Health & Wellness
            new EventTag { EventId = events[3].Id, TagId = 10 },
            new EventTag { EventId = events[3].Id, TagId = 6 },
            // Networking → Business, Technology
            new EventTag { EventId = events[4].Id, TagId = 3 },
            new EventTag { EventId = events[4].Id, TagId = 2 },
            // Family Fun Day → Family, Entertainment
            new EventTag { EventId = events[5].Id, TagId = 12 },
            new EventTag { EventId = events[5].Id, TagId = 8 },
            // Blockchain → Technology, Business
            new EventTag { EventId = events[6].Id, TagId = 2 },
            new EventTag { EventId = events[6].Id, TagId = 3 },
            // Watercolour → Arts, Education
            new EventTag { EventId = events[7].Id, TagId = 4 },
            new EventTag { EventId = events[7].Id, TagId = 7 },
            // Python Bootcamp → Technology, Education
            new EventTag { EventId = events[8].Id, TagId = 2 },
            new EventTag { EventId = events[8].Id, TagId = 7 },
            // Charity Gala → Charity, Entertainment, Food & Drink
            new EventTag { EventId = events[9].Id, TagId = 11 },
            new EventTag { EventId = events[9].Id, TagId = 8 },
            new EventTag { EventId = events[9].Id, TagId = 5 },
            // DevOps Summit → Technology, Business
            new EventTag { EventId = events[13].Id, TagId = 2 },
            new EventTag { EventId = events[13].Id, TagId = 3 },
            // Italian Cooking → Food & Drink, Education
            new EventTag { EventId = events[14].Id, TagId = 5 },
            new EventTag { EventId = events[14].Id, TagId = 7 },
            // Women in Tech → Technology, Business
            new EventTag { EventId = events[15].Id, TagId = 2 },
            new EventTag { EventId = events[15].Id, TagId = 3 },
            // Photography Walk → Arts, Outdoor
            new EventTag { EventId = events[16].Id, TagId = 4 },
            new EventTag { EventId = events[16].Id, TagId = 10 },
            // Comedy Night → Entertainment, Music
            new EventTag { EventId = events[17].Id, TagId = 8 },
            new EventTag { EventId = events[17].Id, TagId = 1 }
        );
        await db.SaveChangesAsync();

        // ── Bookings ───────────────────────────────────────────────────────────

        static Booking Book(int userId, int eventId, decimal price, DateTime eventStart,
                            int daysBeforeBook, bool checkedIn = false) => new()
        {
            UserId       = userId,
            EventId      = eventId,
            Status       = "Confirmed",
            BookedAt     = eventStart.AddDays(-daysBeforeBook),
            PointsEarned = (int)Math.Round(price * 10),
            IsCheckedIn  = checkedIn,
            CheckedInAt  = checkedIn ? eventStart.AddMinutes(10) : null,
            CheckInToken = Guid.NewGuid().ToString(),
        };

        var bookings = new List<Booking>
        {
            // ── AI Summit [0] — targeting 120/200 ─────────────────────────────
            Book(sam.Id,   events[0].Id, events[0].Price, events[0].StartDate, 12),
            Book(maya.Id,  events[0].Id, events[0].Price, events[0].StartDate, 10),
            Book(luca.Id,  events[0].Id, events[0].Price, events[0].StartDate,  8),
            Book(anna.Id,  events[0].Id, events[0].Price, events[0].StartDate,  6),
            Book(tom.Id,   events[0].Id, events[0].Price, events[0].StartDate,  5),

            // ── React Workshop [1] — 28/30 (almost full) ──────────────────────
            Book(sam.Id,   events[1].Id, events[1].Price, events[1].StartDate, 6),
            Book(maya.Id,  events[1].Id, events[1].Price, events[1].StartDate, 5),
            Book(luca.Id,  events[1].Id, events[1].Price, events[1].StartDate, 4),
            Book(anna.Id,  events[1].Id, events[1].Price, events[1].StartDate, 3),
            Book(tom.Id,   events[1].Id, events[1].Price, events[1].StartDate, 2),

            // ── Jazz Under the Stars [2] — 180/500 ────────────────────────────
            Book(sam.Id,   events[2].Id, events[2].Price, events[2].StartDate, 14),
            Book(maya.Id,  events[2].Id, events[2].Price, events[2].StartDate, 10),
            Book(anna.Id,  events[2].Id, events[2].Price, events[2].StartDate,  7),

            // ── Trail Running Camp [3] — 38/50 ────────────────────────────────
            Book(sam.Id,   events[3].Id, events[3].Price, events[3].StartDate, 20),
            Book(tom.Id,   events[3].Id, events[3].Price, events[3].StartDate, 15),
            Book(luca.Id,  events[3].Id, events[3].Price, events[3].StartDate, 12),

            // ── Networking Night [4] — 72/100 ─────────────────────────────────
            Book(sam.Id,   events[4].Id, events[4].Price, events[4].StartDate,  8),
            Book(maya.Id,  events[4].Id, events[4].Price, events[4].StartDate,  6),
            Book(luca.Id,  events[4].Id, events[4].Price, events[4].StartDate,  4),
            Book(anna.Id,  events[4].Id, events[4].Price, events[4].StartDate,  3),
            Book(tom.Id,   events[4].Id, events[4].Price, events[4].StartDate,  2),

            // ── Family Fun Day [5] — 95/300 ───────────────────────────────────
            Book(sam.Id,   events[5].Id, events[5].Price, events[5].StartDate, 30),
            Book(anna.Id,  events[5].Id, events[5].Price, events[5].StartDate, 20),
            Book(tom.Id,   events[5].Id, events[5].Price, events[5].StartDate, 10),

            // ── Blockchain Conf [6] — 85/400 ──────────────────────────────────
            Book(maya.Id,  events[6].Id, events[6].Price, events[6].StartDate, 35),
            Book(luca.Id,  events[6].Id, events[6].Price, events[6].StartDate, 20),

            // ── Watercolour Workshop [7] — 18/20 (almost full) ────────────────
            Book(sam.Id,   events[7].Id, events[7].Price, events[7].StartDate, 15),
            Book(maya.Id,  events[7].Id, events[7].Price, events[7].StartDate, 12),
            Book(anna.Id,  events[7].Id, events[7].Price, events[7].StartDate,  8),
            Book(tom.Id,   events[7].Id, events[7].Price, events[7].StartDate,  5),

            // ── Python Bootcamp [8] — 16/30 ───────────────────────────────────
            Book(sam.Id,   events[8].Id, events[8].Price, events[8].StartDate, 25),
            Book(luca.Id,  events[8].Id, events[8].Price, events[8].StartDate, 15),
            Book(tom.Id,   events[8].Id, events[8].Price, events[8].StartDate, 10),

            // ── Charity Gala [9] — 42/80 ──────────────────────────────────────
            Book(maya.Id,  events[9].Id, events[9].Price, events[9].StartDate, 45),
            Book(anna.Id,  events[9].Id, events[9].Price, events[9].StartDate, 30),
            Book(sam.Id,   events[9].Id, events[9].Price, events[9].StartDate, 20),

            // ── DevOps Summit (live) [13] — 185/200 ───────────────────────────
            Book(sam.Id,   events[13].Id, events[13].Price, events[13].StartDate, 10, checkedIn: true),
            Book(maya.Id,  events[13].Id, events[13].Price, events[13].StartDate,  8, checkedIn: true),
            Book(luca.Id,  events[13].Id, events[13].Price, events[13].StartDate,  6, checkedIn: true),
            Book(anna.Id,  events[13].Id, events[13].Price, events[13].StartDate,  5, checkedIn: true),
            Book(tom.Id,   events[13].Id, events[13].Price, events[13].StartDate,  3, checkedIn: true),

            // ── Italian Cooking (past) [14] — 14/15 ───────────────────────────
            Book(sam.Id,   events[14].Id, events[14].Price, events[14].StartDate, 10, checkedIn: true),
            Book(maya.Id,  events[14].Id, events[14].Price, events[14].StartDate,  8, checkedIn: true),
            Book(luca.Id,  events[14].Id, events[14].Price, events[14].StartDate,  6, checkedIn: true),
            Book(anna.Id,  events[14].Id, events[14].Price, events[14].StartDate,  4, checkedIn: true),
            Book(tom.Id,   events[14].Id, events[14].Price, events[14].StartDate,  2, checkedIn: true),

            // ── Women in Tech (past) [15] ──────────────────────────────────────
            Book(sam.Id,   events[15].Id, events[15].Price, events[15].StartDate, 25, checkedIn: true),
            Book(maya.Id,  events[15].Id, events[15].Price, events[15].StartDate, 20, checkedIn: true),
            Book(anna.Id,  events[15].Id, events[15].Price, events[15].StartDate, 15, checkedIn: true),
            Book(tom.Id,   events[15].Id, events[15].Price, events[15].StartDate, 10, checkedIn: true),

            // ── Photography Walk (past) [16] ───────────────────────────────────
            Book(sam.Id,   events[16].Id, events[16].Price, events[16].StartDate, 5, checkedIn: true),
            Book(luca.Id,  events[16].Id, events[16].Price, events[16].StartDate, 4, checkedIn: true),
            Book(tom.Id,   events[16].Id, events[16].Price, events[16].StartDate, 3, checkedIn: true),

            // ── Comedy Night (past) [17] ───────────────────────────────────────
            Book(sam.Id,   events[17].Id, events[17].Price, events[17].StartDate, 7, checkedIn: true),
            Book(maya.Id,  events[17].Id, events[17].Price, events[17].StartDate, 5, checkedIn: true),
            Book(luca.Id,  events[17].Id, events[17].Price, events[17].StartDate, 3, checkedIn: true),
            Book(anna.Id,  events[17].Id, events[17].Price, events[17].StartDate, 2, checkedIn: true),
        };

        db.Bookings.AddRange(bookings);
        await db.SaveChangesAsync();

        // ── Reviews (on completed events) ─────────────────────────────────────

        var reviews = new List<Review>
        {
            // Italian Cooking Masterclass [14]
            new() { EventId = events[14].Id, UserId = sam.Id,  Rating = 5, Comment = "Absolutely incredible evening. Chef Marco's technique for hand-rolled pasta was mind-blowing — I've been making it at home every week since. The tiramisu alone was worth the ticket price. Highest recommendation!", CreatedAt = events[14].EndDate.AddDays(1), IsPinned = true },
            new() { EventId = events[14].Id, UserId = maya.Id, Rating = 5, Comment = "Perfect class for someone who loves cooking but wanted to level up. Small group meant we all got hands-on time with the chef. Came home with recipes AND skills. Will absolutely book Priya's next event.", CreatedAt = events[14].EndDate.AddDays(2) },
            new() { EventId = events[14].Id, UserId = luca.Id, Rating = 4, Comment = "Really enjoyable afternoon. The risotto section was fascinating. Slightly rushed at the end — felt like we could have used another 30 minutes for the dessert section. But overall a great experience.", CreatedAt = events[14].EndDate.AddDays(3) },
            new() { EventId = events[14].Id, UserId = anna.Id, Rating = 5, Comment = "One of the best things I've done in Sydney. Chef Marco is warm, funny and incredibly knowledgeable. The venue was beautiful. Already convinced two friends to book the next class!", CreatedAt = events[14].EndDate.AddDays(2) },
            new() { EventId = events[14].Id, UserId = tom.Id,  Rating = 4, Comment = "Great value for money. All ingredients were top quality and fresh. My only minor gripe is parking was tricky in Surry Hills, but that's hardly the organiser's fault. Pasta turned out amazing!", CreatedAt = events[14].EndDate.AddDays(4) },

            // Women in Tech [15]
            new() { EventId = events[15].Id, UserId = sam.Id,  Rating = 5, Comment = "This conference genuinely changed my career trajectory. The mentorship speed-dating session was brilliant — I connected with my now-mentor in 10 minutes. Alex runs a tight ship and the speakers were world-class.", CreatedAt = events[15].EndDate.AddDays(1), IsPinned = true },
            new() { EventId = events[15].Id, UserId = maya.Id, Rating = 5, Comment = "Inspiring from first keynote to last panel. So refreshing to be in a room of 200 women talking about real engineering challenges without any of the usual gatekeeping. Job fair was also super useful — got two interviews!", CreatedAt = events[15].EndDate.AddDays(2) },
            new() { EventId = events[15].Id, UserId = anna.Id, Rating = 4, Comment = "Excellent event overall. The afternoon sessions were slightly repetitive in themes, but the morning keynote with Dr Sarah Kim was phenomenal. Venue and catering were top notch. Will be back next year.", CreatedAt = events[15].EndDate.AddDays(3) },
            new() { EventId = events[15].Id, UserId = tom.Id,  Rating = 4, Comment = "Attended as an ally and felt very welcome. Great mix of technical talks and career development. The Q&A sections were a highlight — no time-wasting softballs, real questions from an engaged audience.", CreatedAt = events[15].EndDate.AddDays(4) },

            // Photography Walk [16]
            new() { EventId = events[16].Id, UserId = sam.Id,  Rating = 5, Comment = "What a golden-hour experience! Priya's eye for location is incredible — every spot we stopped at had a story and a stunning composition waiting. Came home with 20 photos I'm genuinely proud of.", CreatedAt = events[16].EndDate.AddDays(1) },
            new() { EventId = events[16].Id, UserId = luca.Id, Rating = 5, Comment = "I only had my phone but still took the best photos of my life. The tips on natural light and framing were practical and immediately applicable. Priya has a gift for teaching. Booked the Botanic Garden walk next!", CreatedAt = events[16].EndDate.AddDays(2) },
            new() { EventId = events[16].Id, UserId = tom.Id,  Rating = 4, Comment = "Beautiful walk, great company. Would have loved slightly more time at the Opera House viewpoint — we moved on a bit quickly. But the Harbour Bridge shots at dusk were incredible. Solid 4 stars!", CreatedAt = events[16].EndDate.AddDays(2) },

            // Comedy Night [17]
            new() { EventId = events[17].Id, UserId = sam.Id,  Rating = 5, Comment = "Laughed until I cried. Jordan found five comedians who somehow got funnier as the night went on. The MC kept the energy perfectly between acts. Best night out I've had in Sydney this year.", CreatedAt = events[17].EndDate.AddDays(1), IsPinned = true },
            new() { EventId = events[17].Id, UserId = maya.Id, Rating = 4, Comment = "Really fun night. First three acts were brilliant, fourth was a bit flat, but the closer absolutely killed it. Would have preferred more parking info beforehand — Moore Park can be chaos. Would go again.", CreatedAt = events[17].EndDate.AddDays(2) },
            new() { EventId = events[17].Id, UserId = luca.Id, Rating = 5, Comment = "Hadn't been to a proper comedy night since before COVID and this was the perfect reintroduction. Jokes landed across all age groups — my 55-year-old mum came and she's been quoting the headliner all week.", CreatedAt = events[17].EndDate.AddDays(1) },
            new() { EventId = events[17].Id, UserId = anna.Id, Rating = 3, Comment = "Good atmosphere and a couple of standout acts, but the sound mix was off for the first 20 minutes which made it hard to catch the punchlines. Once the venue fixed it, the show improved a lot. Average overall.", CreatedAt = events[17].EndDate.AddDays(3) },
        };

        db.Reviews.AddRange(reviews);
        await db.SaveChangesAsync();

        // ── Review replies (organizers responding) ─────────────────────────────

        db.ReviewReplies.AddRange(
            new ReviewReply { ReviewId = reviews[0].Id,  UserId = priya.Id, Comment = "Thank you so much, Sam! Chef Marco was over the moon reading this. We're running another session in April — hope to see you back! 🍝", CreatedAt = reviews[0].CreatedAt.AddDays(1) },
            new ReviewReply { ReviewId = reviews[2].Id,  UserId = priya.Id, Comment = "Really appreciate the honest feedback, Luca. You're right — tiramisu deserves more time. We've already extended the class to 5.5 hours for the next round.", CreatedAt = reviews[2].CreatedAt.AddHours(18) },
            new ReviewReply { ReviewId = reviews[5].Id,  UserId = alex.Id,  Comment = "This genuinely made my day, Sam. The mentorship speed-dating was our most requested addition this year. Can't wait to reveal the 2027 lineup!", CreatedAt = reviews[5].CreatedAt.AddDays(1) },
            new ReviewReply { ReviewId = reviews[8].Id,  UserId = alex.Id,  Comment = "Noted on the afternoon sessions — we'll tighten the track themes for next year. Glad Dr Kim's keynote resonated, she was the highlight for many! See you in 2027.", CreatedAt = reviews[8].CreatedAt.AddDays(2) },
            new ReviewReply { ReviewId = reviews[13].Id, UserId = jordan.Id, Comment = "Ha! Venue sound gremlins — I won't let them off the hook. Already spoken to the Comedy Store about their AV setup for next time. Glad it came good in the end!", CreatedAt = reviews[13].CreatedAt.AddDays(1) }
        );
        await db.SaveChangesAsync();

        // ── Announcements ─────────────────────────────────────────────────────

        db.Announcements.AddRange(
            new Announcement {
                EventId   = events[0].Id,
                Title     = "Keynote speaker confirmed: Dr Lisa Chen",
                Message   = "We're thrilled to announce that Dr Lisa Chen, lead researcher at DeepMind, will be delivering our opening keynote on 'Frontier AI Safety and Real-World Applications'. This is an unmissable start to the Summit.",
                CreatedAt = now.AddDays(-3),
            },
            new Announcement {
                EventId   = events[1].Id,
                Title     = "Only 2 spots remaining!",
                Message   = "The React Advanced Patterns workshop is almost sold out — only 2 tickets left. If you've been on the fence, now is the time. Grab yours before they're gone.",
                CreatedAt = now.AddDays(-1),
            },
            new Announcement {
                EventId   = events[4].Id,
                Title     = "Three amazing startups pitching on the night",
                Message   = "We can now reveal the three startups pitching at Thursday's Networking Night: Clearpath AI (autonomous logistics), Bloom Health (preventive care platform), and Mosaic Studio (generative design tools). See you there!",
                CreatedAt = now.AddDays(-2),
            },
            new Announcement {
                EventId   = events[13].Id,
                Title     = "Day 2 agenda is live",
                Message   = "Day 2 kicks off at 9am with a special live demo of our CI/CD pipeline showcase. Don't miss the 2pm roundtable on platform engineering — limited seats, first come first served at the door.",
                CreatedAt = now.AddHours(-8),
            },
            new Announcement {
                EventId   = events[9].Id,
                Title     = "Silent auction preview now online",
                Message   = "Get a sneak peek at the 12 items up for auction on the night — including a signed Aboriginal artwork, a luxury Hunter Valley weekend, and a private chef dinner for 6. Preview at the link in your booking confirmation.",
                CreatedAt = now.AddDays(-7),
            }
        );
        await db.SaveChangesAsync();

        // ── Notifications ─────────────────────────────────────────────────────

        db.Notifications.AddRange(
            // Sam's notifications
            new Notification { UserId = sam.Id, Type = "BookingConfirmation", Title = "Booking confirmed!", Message = $"You're going to \"AI & Machine Learning Summit 2026\" on {events[0].StartDate:MMM d, yyyy}. You earned 1490 loyalty points.", EventId = events[0].Id, IsRead = false, CreatedAt = now.AddDays(-12) },
            new Notification { UserId = sam.Id, Type = "Announcement",        Title = "📢 AI Summit: Keynote speaker confirmed", Message = "Dr Lisa Chen from DeepMind will open the Summit. Don't miss it!", EventId = events[0].Id, IsRead = false, CreatedAt = now.AddDays(-3) },
            new Notification { UserId = sam.Id, Type = "EventReminder",       Title = "AI Summit is tomorrow!", Message = "Your event starts in less than 24 hours. Make sure you have your ticket QR code ready.", EventId = events[0].Id, IsRead = false, CreatedAt = now.AddDays(-1) },
            new Notification { UserId = sam.Id, Type = "BookingConfirmation", Title = "Booking confirmed!", Message = $"You're going to \"React Workshop: Advanced Patterns\" on {events[1].StartDate:MMM d, yyyy}. You earned 790 loyalty points.", EventId = events[1].Id, IsRead = true,  CreatedAt = now.AddDays(-6) },
            new Notification { UserId = sam.Id, Type = "ReviewReminder",      Title = "How was the Italian Cooking Masterclass?", Message = "You attended 2 days ago — share your experience to help others.", EventId = events[14].Id, IsRead = true, CreatedAt = events[14].EndDate.AddDays(1) },

            // Maya's notifications
            new Notification { UserId = maya.Id, Type = "BookingConfirmation", Title = "Booking confirmed!", Message = $"You're going to \"Watercolour Painting Workshop\" on {events[7].StartDate:MMM d, yyyy}. You earned 890 loyalty points.", EventId = events[7].Id, IsRead = false, CreatedAt = now.AddDays(-12) },
            new Notification { UserId = maya.Id, Type = "ReviewReminder",      Title = "How was the Women in Tech Conference?", Message = "You attended last month — share your experience to help others.", EventId = events[15].Id, IsRead = true, CreatedAt = events[15].EndDate.AddDays(1) },
            new Notification { UserId = maya.Id, Type = "WaitlistPromotion",   Title = "You're in! Blockchain & Web3 Conference", Message = "A spot opened up and you've been moved off the waitlist. Your booking is confirmed.", EventId = events[6].Id, IsRead = false, CreatedAt = now.AddDays(-5) },

            // Organizer notifications
            new Notification { UserId = alex.Id, Type = "General", Title = "Your event is getting popular!", Message = "AI & Machine Learning Summit has 5 new bookings in the last 24 hours. You're at 120/200 capacity.", EventId = events[0].Id, IsRead = false, CreatedAt = now.AddDays(-1) },
            new Notification { UserId = priya.Id, Type = "General", Title = "Watercolour Workshop almost full", Message = "Only 2 spots remain. Consider opening a waiting list or planning a second session.", EventId = events[7].Id, IsRead = false, CreatedAt = now.AddDays(-2) }
        );
        await db.SaveChangesAsync();

        // ── Subscriptions ─────────────────────────────────────────────────────

        db.HostSubscriptions.AddRange(
            new HostSubscription { SubscriberId = sam.Id,  HostId = alex.Id,   SubscribedAt = now.AddDays(-60) },
            new HostSubscription { SubscriberId = sam.Id,  HostId = priya.Id,  SubscribedAt = now.AddDays(-45) },
            new HostSubscription { SubscriberId = maya.Id, HostId = alex.Id,   SubscribedAt = now.AddDays(-30) },
            new HostSubscription { SubscriberId = maya.Id, HostId = priya.Id,  SubscribedAt = now.AddDays(-20) },
            new HostSubscription { SubscriberId = luca.Id, HostId = jordan.Id, SubscribedAt = now.AddDays(-15) },
            new HostSubscription { SubscriberId = anna.Id, HostId = alex.Id,   SubscribedAt = now.AddDays(-10) },
            new HostSubscription { SubscriberId = tom.Id,  HostId = priya.Id,  SubscribedAt = now.AddDays(-8)  }
        );
        await db.SaveChangesAsync();

        // ── Store products + purchases ─────────────────────────────────────────

        if (!await db.StoreProducts.AnyAsync())
        {
            var products = new List<StoreProduct>
            {
                new() { Name = "Event Pioneer",            Description = "Awarded to early adopters who booked their first event. Displays proudly on your profile.",             PointCost = 500,  Category = "Badge",       IsActive = true },
                new() { Name = "Super Fan",                Description = "For the devoted — granted to attendees who have attended 10+ events. Show the world your passion.",     PointCost = 1500, Category = "Badge",       IsActive = true },
                new() { Name = "Gold Profile Frame",       Description = "A shimmering gold border around your profile picture. Stand out from the crowd.",                      PointCost = 2000, Category = "Cosmetic",    IsActive = true },
                new() { Name = "Midnight Theme",           Description = "A deep, dark profile theme with midnight-blue accents. Sleek and exclusive.",                          PointCost = 3000, Category = "Cosmetic",    IsActive = true },
                new() { Name = "Priority Booking Pass",   Description = "Get a 24-hour head start on ticket sales before they open to the public. Never miss out again.",       PointCost = 2500, Category = "Feature",     IsActive = true },
                new() { Name = "Extended Review",          Description = "Unlock the ability to write longer reviews (up to 2000 characters) with rich formatting.",             PointCost = 1000, Category = "Feature",     IsActive = true },
                new() { Name = "Featured Organizer Boost",Description = "Pin your next event to the featured section on the homepage for 7 days.",                              PointCost = 5000, Category = "Perk",        IsActive = true },
                new() { Name = "Analytics Pack",           Description = "Unlock advanced analytics for your events — demographic breakdowns, heatmaps, and revenue trends.",    PointCost = 3500, Category = "Perk",        IsActive = true },
                new() { Name = "Event Mascot Figure",      Description = "A virtual limited-edition desk figure of the EventHub mascot. Displayed on your profile forever.",     PointCost = 8000, Category = "Collectible", IsActive = true },
            };

            db.StoreProducts.AddRange(products);
            await db.SaveChangesAsync();

            // Sam has bought a few items
            db.UserPurchases.AddRange(
                new UserPurchase { UserId = sam.Id, ProductId = products[0].Id, PurchasedAt = now.AddDays(-50), PointsSpent = products[0].PointCost },
                new UserPurchase { UserId = sam.Id, ProductId = products[4].Id, PurchasedAt = now.AddDays(-20), PointsSpent = products[4].PointCost },
                new UserPurchase { UserId = maya.Id, ProductId = products[0].Id, PurchasedAt = now.AddDays(-30), PointsSpent = products[0].PointCost },
                new UserPurchase { UserId = maya.Id, ProductId = products[5].Id, PurchasedAt = now.AddDays(-10), PointsSpent = products[5].PointCost }
            );
            await db.SaveChangesAsync();
        }
    }
}
