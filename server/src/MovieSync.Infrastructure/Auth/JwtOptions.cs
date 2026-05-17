namespace MovieSync.Infrastructure.Auth;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; init; } = "MovieSync";
    public string Audience { get; init; } = "MovieSync.Client";
    public string SigningKey { get; init; } = "replace-this-development-signing-key-with-a-secret";
    public int ExpirationMinutes { get; init; } = 240;
}
