using EventManagement.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/tags")]
public class TagsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tags = await db.Tags
            .Select(t => new { t.Id, t.Name })
            .OrderBy(t => t.Name)
            .ToListAsync();
        return Ok(tags);
    }
}
