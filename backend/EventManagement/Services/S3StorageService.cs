using Amazon;
using Amazon.S3;
using Amazon.S3.Transfer;

namespace EventManagement.Services;

/// <summary>
/// Uploads files to AWS S3 and returns the public object URL.
///
/// AWS credentials are resolved automatically via the default credential chain:
///   1. Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
///   2. ~/.aws/credentials file (local dev)
///   3. IAM role attached to EC2/ECS (production)
///
/// The S3 bucket must allow public reads, either via:
///   - A bucket policy granting s3:GetObject to *  (recommended)
///   - Or ACLs enabled + PublicRead on each object
/// </summary>
public class S3StorageService : IStorageService
{
    private readonly string _bucketName;
    private readonly IAmazonS3 _s3Client;

    public S3StorageService(IConfiguration config)
    {
        _bucketName = config["Storage:S3:BucketName"]
            ?? throw new InvalidOperationException("Storage:S3:BucketName is not configured.");

        var region = config["Storage:S3:Region"] ?? "ap-southeast-2";
        _s3Client  = new AmazonS3Client(RegionEndpoint.GetBySystemName(region));
    }

    public async Task<string> UploadAsync(IFormFile file, string folder)
    {
        var ext      = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName = $"{Guid.NewGuid()}{ext}";
        var key      = $"{folder}/{fileName}";

        using var stream = file.OpenReadStream();

        var uploadRequest = new TransferUtilityUploadRequest
        {
            BucketName  = _bucketName,
            Key         = key,
            InputStream = stream,
            ContentType = file.ContentType,
            // Makes the object publicly readable.
            // Requires "ACLs enabled" on the bucket, OR remove this line
            // and use a public bucket policy instead.
            CannedACL   = S3CannedACL.PublicRead,
        };

        var transferUtility = new TransferUtility(_s3Client);
        await transferUtility.UploadAsync(uploadRequest);

        // Standard S3 public URL format
        var region = _s3Client.Config.RegionEndpoint.SystemName;
        return $"https://{_bucketName}.s3.{region}.amazonaws.com/{key}";
    }
}
