using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/upload")]
public class UploadController(IWebHostEnvironment env) : ControllerBase
{
    private static readonly string[] AllowedContentTypes =
        ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        if (!AllowedContentTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { message = "Only JPEG, PNG, WebP, or GIF images are allowed." });

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { message = "File size must be under 5 MB." });

        var uploadsDir = Path.Combine(
            env.WebRootPath ?? env.ContentRootPath, "uploads", "events");
        Directory.CreateDirectory(uploadsDir);

        var ext      = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return Ok(new { url = $"/uploads/events/{fileName}" });
    }
}
