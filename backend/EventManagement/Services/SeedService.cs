using EventManagement.Data;
using EventManagement.Models;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Services;

public static class SeedService
{
    public static async Task SeedDemoDataAsync(AppDbContext db)
    {
        // Idempotent guard — only seed if no events exist
        if (await db.Events.AnyAsync()) return;

        var now = DateTime.UtcNow;

        // ── Demo users ────────────────────────────────────────────────
        var organiser = new User
        {
            Name         = "Alex Chambers",
            Email        = "alex@demo.eventhub",
            PasswordHash = string.Empty,
            Role         = "Attendee",
            Bio          = "Passionate tech event organiser based in Sydney. Building communities one event at a time.",
            Website      = "https://alexchambers.demo",
        };

        var attendee = new User
        {
            Name         = "Sam Rivera",
            Email        = "sam@demo.eventhub",
            PasswordHash = string.Empty,
            Role         = "Attendee",
        };

        db.Users.AddRange(organiser, attendee);
        await db.SaveChangesAsync();

        // ── Events ────────────────────────────────────────────────────
        // Category IDs: 1=Conference, 2=Workshop, 3=Concert, 4=Sports, 5=Networking, 6=Other
        // Tag IDs: 1=Music 2=Technology 3=Business 4=Arts 5=Food&Drink 6=Health&Wellness
        //          7=Education 8=Entertainment 9=Gaming 10=Outdoor 11=Charity 12=Family

        var events = new List<Event>
        {
            // Published — near future
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },

            // Draft — only visible to organiser
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },

            // Cancelled
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },

            // Postponed
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
                PostponedDate = now.AddDays(15), // original date
                CategoryId  = 2,
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },

            // Live — started 12 hours ago, ends tomorrow
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },

            // Completed events (past end date) — visible on organiser dashboard, hidden from browse
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },
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
                CreatedById = organiser.Id,
                ImageUrl    = null,
            },
        };

        db.Events.AddRange(events);
        await db.SaveChangesAsync();

        // ── Tags for select events ────────────────────────────────────
        var tagAssignments = new List<EventTag>
        {
            // AI Summit → Technology, Business
            new() { EventId = events[0].Id, TagId = 2 },
            new() { EventId = events[0].Id, TagId = 3 },
            // React Workshop → Technology, Education
            new() { EventId = events[1].Id, TagId = 2 },
            new() { EventId = events[1].Id, TagId = 7 },
            // Jazz → Music, Entertainment
            new() { EventId = events[2].Id, TagId = 1 },
            new() { EventId = events[2].Id, TagId = 8 },
            // Trail Running → Outdoor, Health & Wellness
            new() { EventId = events[3].Id, TagId = 10 },
            new() { EventId = events[3].Id, TagId = 6 },
            // Networking → Business, Technology
            new() { EventId = events[4].Id, TagId = 3 },
            new() { EventId = events[4].Id, TagId = 2 },
            // Family Fun Day → Family, Entertainment
            new() { EventId = events[5].Id, TagId = 12 },
            new() { EventId = events[5].Id, TagId = 8 },
            // Blockchain → Technology, Business
            new() { EventId = events[6].Id, TagId = 2 },
            new() { EventId = events[6].Id, TagId = 3 },
            // Watercolour → Arts, Education
            new() { EventId = events[7].Id, TagId = 4 },
            new() { EventId = events[7].Id, TagId = 7 },
            // Python Bootcamp → Technology, Education
            new() { EventId = events[8].Id, TagId = 2 },
            new() { EventId = events[8].Id, TagId = 7 },
            // Charity Gala → Charity, Entertainment
            new() { EventId = events[9].Id, TagId = 11 },
            new() { EventId = events[9].Id, TagId = 8 },
            // Charity Gala → Food & Drink
            new() { EventId = events[9].Id, TagId = 5 },
            // DevOps Summit → Technology, Business
            new() { EventId = events[13].Id, TagId = 2 },
            new() { EventId = events[13].Id, TagId = 3 },
            // Italian Cooking → Food & Drink, Education
            new() { EventId = events[14].Id, TagId = 5 },
            new() { EventId = events[14].Id, TagId = 7 },
            // Women in Tech → Technology, Business
            new() { EventId = events[15].Id, TagId = 2 },
            new() { EventId = events[15].Id, TagId = 3 },
            // Photography Walk → Arts, Outdoor
            new() { EventId = events[16].Id, TagId = 4 },
            new() { EventId = events[16].Id, TagId = 10 },
            // Comedy Night → Entertainment, Music
            new() { EventId = events[17].Id, TagId = 8 },
            new() { EventId = events[17].Id, TagId = 1 },
        };

        db.EventTags.AddRange(tagAssignments);
        await db.SaveChangesAsync();

        // ── Bookings for completed events (so attendee can leave reviews) ──
        var completedBookings = new List<Booking>
        {
            new() {
                UserId       = attendee.Id,
                EventId      = events[14].Id, // Italian Cooking Masterclass
                Status       = "Confirmed",
                BookedAt     = events[14].StartDate.AddDays(-10),
                PointsEarned = 1200,
                IsCheckedIn  = true,
                CheckedInAt  = events[14].StartDate,
                CheckInToken = Guid.NewGuid().ToString(),
            },
            new() {
                UserId       = attendee.Id,
                EventId      = events[15].Id, // Women in Tech Conference
                Status       = "Confirmed",
                BookedAt     = events[15].StartDate.AddDays(-20),
                PointsEarned = 890,
                IsCheckedIn  = true,
                CheckedInAt  = events[15].StartDate,
                CheckInToken = Guid.NewGuid().ToString(),
            },
            new() {
                UserId       = attendee.Id,
                EventId      = events[16].Id, // Photography Walk
                Status       = "Confirmed",
                BookedAt     = events[16].StartDate.AddDays(-5),
                PointsEarned = 450,
                IsCheckedIn  = true,
                CheckedInAt  = events[16].StartDate,
                CheckInToken = Guid.NewGuid().ToString(),
            },
            new() {
                UserId       = attendee.Id,
                EventId      = events[17].Id, // Comedy Night
                Status       = "Confirmed",
                BookedAt     = events[17].StartDate.AddDays(-3),
                PointsEarned = 350,
                IsCheckedIn  = true,
                CheckedInAt  = events[17].StartDate,
                CheckInToken = Guid.NewGuid().ToString(),
            },
        };

        db.Bookings.AddRange(completedBookings);
        attendee.LoyaltyPoints = 2890;
        await db.SaveChangesAsync();

        // ── Store products ────────────────────────────────────────────
        if (!await db.StoreProducts.AnyAsync())
        {
            var storeProducts = new List<StoreProduct>
            {
                // Badges
                new() { Name = "Event Pioneer",       Description = "Awarded to early adopters who booked their first event. Displays proudly on your profile.",         PointCost = 500,  Category = "Badge",       IsActive = true },
                new() { Name = "Super Fan",            Description = "For the devoted — granted to attendees who have attended 10+ events. Show the world your passion.", PointCost = 1500, Category = "Badge",       IsActive = true },
                // Cosmetics
                new() { Name = "Gold Profile Frame",   Description = "A shimmering gold border around your profile picture. Stand out from the crowd.",                  PointCost = 2000, Category = "Cosmetic",    IsActive = true },
                new() { Name = "Midnight Theme",       Description = "A deep, dark profile theme with midnight-blue accents. Sleek and exclusive.",                      PointCost = 3000, Category = "Cosmetic",    IsActive = true },
                // Features
                new() { Name = "Priority Booking Pass", Description = "Get a 24-hour head start on ticket sales before they open to the public. Never miss out again.", PointCost = 2500, Category = "Feature",     IsActive = true },
                new() { Name = "Extended Review",      Description = "Unlock the ability to write longer reviews (up to 2000 characters) with rich formatting.",         PointCost = 1000, Category = "Feature",     IsActive = true },
                // Perks
                new() { Name = "Featured Organizer Boost", Description = "Pin your next event to the featured section on the homepage for 7 days.",                     PointCost = 5000, Category = "Perk",        IsActive = true },
                new() { Name = "Analytics Pack",       Description = "Unlock advanced analytics for your events — demographic breakdowns, heatmaps, and revenue trends.", PointCost = 3500, Category = "Perk",       IsActive = true },
                // Collectibles
                new() { Name = "Event Mascot Figure",  Description = "A virtual limited-edition desk figure of the EventHub mascot. Displayed on your profile forever.", PointCost = 8000, Category = "Collectible", IsActive = true },
            };

            db.StoreProducts.AddRange(storeProducts);
            await db.SaveChangesAsync();
        }
    }
}
