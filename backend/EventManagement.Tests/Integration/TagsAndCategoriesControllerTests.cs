using System.Net;
using System.Net.Http.Json;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

public class TagsAndCategoriesControllerTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public TagsAndCategoriesControllerTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    // ── GET /api/tags ─────────────────────────────────────────────────

    [Fact]
    public async Task GetAllTags_Returns200WithSeededTags()
    {
        var response = await _client.GetAsync("/api/tags");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var tags = await response.Content.ReadFromJsonAsync<List<TagResponse>>();
        Assert.NotNull(tags);
        Assert.NotEmpty(tags);

        // Verify some seeded tags are present
        Assert.Contains(tags, t => t.Name == "Music");
        Assert.Contains(tags, t => t.Name == "Technology");
        Assert.Contains(tags, t => t.Name == "Education");
    }

    [Fact]
    public async Task GetAllTags_ReturnsAllTwelveTags()
    {
        var response = await _client.GetAsync("/api/tags");
        var tags = await response.Content.ReadFromJsonAsync<List<TagResponse>>();
        Assert.NotNull(tags);
        Assert.Equal(12, tags.Count);
    }

    [Fact]
    public async Task GetAllTags_ReturnsTagsOrderedByName()
    {
        var response = await _client.GetAsync("/api/tags");
        var tags = await response.Content.ReadFromJsonAsync<List<TagResponse>>();
        Assert.NotNull(tags);

        for (int i = 1; i < tags.Count; i++)
            Assert.True(
                string.Compare(tags[i].Name, tags[i - 1].Name,
                    StringComparison.OrdinalIgnoreCase) >= 0,
                $"Tags not sorted: {tags[i - 1].Name} should come before {tags[i].Name}");
    }

    // ── GET /api/categories ───────────────────────────────────────────

    [Fact]
    public async Task GetAllCategories_Returns200WithSeededCategories()
    {
        var response = await _client.GetAsync("/api/categories");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var categories = await response.Content.ReadFromJsonAsync<List<CategoryResponse>>();
        Assert.NotNull(categories);
        Assert.NotEmpty(categories);

        Assert.Contains(categories, c => c.Name == "Conference");
        Assert.Contains(categories, c => c.Name == "Workshop");
        Assert.Contains(categories, c => c.Name == "Concert");
    }

    [Fact]
    public async Task GetAllCategories_ReturnsSixCategories()
    {
        var response = await _client.GetAsync("/api/categories");
        var categories = await response.Content.ReadFromJsonAsync<List<CategoryResponse>>();
        Assert.NotNull(categories);
        Assert.Equal(6, categories.Count);
    }
}

// Local record types to deserialize tag and category responses
// (avoids coupling tests to internal DTOs that may not have public setters)
internal record TagResponse(int Id, string Name);
internal record CategoryResponse(int Id, string Name);
