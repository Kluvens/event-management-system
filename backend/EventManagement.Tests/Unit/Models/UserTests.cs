using EventManagement.Models;
using Xunit;

namespace EventManagement.Tests.Unit.Models;

public class UserTests
{
    // ── LoyaltyTier ──────────────────────────────────────────────────

    [Theory]
    [InlineData(0,     "Standard")]
    [InlineData(999,   "Standard")]
    [InlineData(1000,  "Bronze")]
    [InlineData(4999,  "Bronze")]
    [InlineData(5000,  "Silver")]
    [InlineData(14999, "Silver")]
    [InlineData(15000, "Gold")]
    [InlineData(49999, "Gold")]
    [InlineData(50000, "Elite")]
    [InlineData(99999, "Elite")]
    public void LoyaltyTier_ReturnsCorrectTierForPoints(int points, string expectedTier)
    {
        var user = new User { LoyaltyPoints = points };
        Assert.Equal(expectedTier, user.LoyaltyTier);
    }

    // ── LoyaltyDiscount ──────────────────────────────────────────────

    [Theory]
    [InlineData(0,     0.00)]
    [InlineData(999,   0.00)]
    [InlineData(1000,  0.05)]
    [InlineData(5000,  0.10)]
    [InlineData(15000, 0.15)]
    [InlineData(50000, 0.20)]
    public void LoyaltyDiscount_ReturnsCorrectDiscountForPoints(int points, decimal expectedDiscount)
    {
        var user = new User { LoyaltyPoints = points };
        Assert.Equal(expectedDiscount, user.LoyaltyDiscount);
    }

    [Fact]
    public void NewUser_HasStandardTierAndZeroDiscount()
    {
        var user = new User();
        Assert.Equal(0, user.LoyaltyPoints);
        Assert.Equal("Standard", user.LoyaltyTier);
        Assert.Equal(0m, user.LoyaltyDiscount);
    }

    [Fact]
    public void NewUser_DefaultRoleIsAttendee()
    {
        var user = new User();
        Assert.Equal("Attendee", user.Role);
    }
}
