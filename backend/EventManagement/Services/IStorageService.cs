namespace EventManagement.Services;

public interface IStorageService
{
    /// <summary>
    /// Uploads a file and returns its publicly accessible URL.
    /// </summary>
    Task<string> UploadAsync(IFormFile file, string folder);
}
