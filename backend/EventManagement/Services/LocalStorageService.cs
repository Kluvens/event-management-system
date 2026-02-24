namespace EventManagement.Services;

/// <summary>
/// Saves uploads to the local filesystem under wwwroot/uploads.
/// Used for local development only.
/// </summary>
public class LocalStorageService(IWebHostEnvironment env) : IStorageService
{
    public async Task<string> UploadAsync(IFormFile file, string folder)
    {
        var uploadsDir = Path.Combine(
            env.WebRootPath ?? env.ContentRootPath, "uploads", folder);
        Directory.CreateDirectory(uploadsDir);

        var ext      = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return $"/uploads/{folder}/{fileName}";
    }
}
