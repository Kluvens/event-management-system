using EventManagement.Models;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<EventTag> EventTags => Set<EventTag>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<ReviewReply> ReviewReplies => Set<ReviewReply>();
    public DbSet<ReviewVote> ReviewVotes => Set<ReviewVote>();
    public DbSet<HostSubscription> HostSubscriptions => Set<HostSubscription>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<UserFavorite> UserFavorites => Set<UserFavorite>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ── Users ──────────────────────────────────────────────────
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.CognitoSub)
            .IsUnique()
            .HasFilter("\"CognitoSub\" IS NOT NULL");

        // Ignore computed properties so EF doesn't try to map them
        modelBuilder.Entity<User>()
            .Ignore(u => u.LoyaltyTier)
            .Ignore(u => u.LoyaltyDiscount);

        // ── Events ─────────────────────────────────────────────────
        modelBuilder.Entity<Event>()
            .HasOne(e => e.CreatedBy)
            .WithMany(u => u.CreatedEvents)
            .HasForeignKey(e => e.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Event>()
            .Property(e => e.Price)
            .HasColumnType("decimal(18,2)");

        // ── Bookings ───────────────────────────────────────────────
        modelBuilder.Entity<Booking>()
            .HasIndex(b => new { b.UserId, b.EventId })
            .IsUnique();

        modelBuilder.Entity<Booking>()
            .HasIndex(b => b.CheckInToken)
            .IsUnique();

        // ── EventTag (many-to-many join) ───────────────────────────
        modelBuilder.Entity<EventTag>()
            .HasKey(et => new { et.EventId, et.TagId });

        modelBuilder.Entity<EventTag>()
            .HasOne(et => et.Event)
            .WithMany(e => e.EventTags)
            .HasForeignKey(et => et.EventId);

        modelBuilder.Entity<EventTag>()
            .HasOne(et => et.Tag)
            .WithMany(t => t.EventTags)
            .HasForeignKey(et => et.TagId);

        // ── Reviews ────────────────────────────────────────────────
        modelBuilder.Entity<Review>()
            .HasIndex(r => new { r.EventId, r.UserId })
            .IsUnique(); // one review per user per event

        // ── ReviewVotes (composite PK) ─────────────────────────────
        modelBuilder.Entity<ReviewVote>()
            .HasKey(rv => new { rv.ReviewId, rv.UserId });

        modelBuilder.Entity<ReviewVote>()
            .HasOne(rv => rv.Review)
            .WithMany(r => r.Votes)
            .HasForeignKey(rv => rv.ReviewId);

        modelBuilder.Entity<ReviewVote>()
            .HasOne(rv => rv.User)
            .WithMany()
            .HasForeignKey(rv => rv.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // ── UserFavorites (composite PK) ──────────────────────────
        modelBuilder.Entity<UserFavorite>()
            .HasKey(uf => new { uf.UserId, uf.EventId });

        modelBuilder.Entity<UserFavorite>()
            .HasOne(uf => uf.User)
            .WithMany()
            .HasForeignKey(uf => uf.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserFavorite>()
            .HasOne(uf => uf.Event)
            .WithMany()
            .HasForeignKey(uf => uf.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── HostSubscriptions (composite PK) ──────────────────────
        modelBuilder.Entity<HostSubscription>()
            .HasKey(hs => new { hs.SubscriberId, hs.HostId });

        modelBuilder.Entity<HostSubscription>()
            .HasOne(hs => hs.Subscriber)
            .WithMany(u => u.Subscriptions)
            .HasForeignKey(hs => hs.SubscriberId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<HostSubscription>()
            .HasOne(hs => hs.Host)
            .WithMany(u => u.Subscribers)
            .HasForeignKey(hs => hs.HostId)
            .OnDelete(DeleteBehavior.Restrict);

        // ── Seed data ──────────────────────────────────────────────
        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Conference" },
            new Category { Id = 2, Name = "Workshop" },
            new Category { Id = 3, Name = "Concert" },
            new Category { Id = 4, Name = "Sports" },
            new Category { Id = 5, Name = "Networking" },
            new Category { Id = 6, Name = "Other" }
        );

        modelBuilder.Entity<Tag>().HasData(
            new Tag { Id = 1,  Name = "Music" },
            new Tag { Id = 2,  Name = "Technology" },
            new Tag { Id = 3,  Name = "Business" },
            new Tag { Id = 4,  Name = "Arts" },
            new Tag { Id = 5,  Name = "Food & Drink" },
            new Tag { Id = 6,  Name = "Health & Wellness" },
            new Tag { Id = 7,  Name = "Education" },
            new Tag { Id = 8,  Name = "Entertainment" },
            new Tag { Id = 9,  Name = "Gaming" },
            new Tag { Id = 10, Name = "Outdoor" },
            new Tag { Id = 11, Name = "Charity" },
            new Tag { Id = 12, Name = "Family" }
        );
    }
}
