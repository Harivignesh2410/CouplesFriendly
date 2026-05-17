using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using MovieSync.Application.Auth;
using MovieSync.Application.Common;

namespace MovieSync.Infrastructure.Auth;

public sealed class JwtTokenService(IOptions<JwtOptions> options) : ITokenService
{
    private readonly JwtOptions _options = options.Value;

    public AuthResponse IssueGuestToken(string displayName)
    {
        var cleanName = string.IsNullOrWhiteSpace(displayName) ? "Guest" : displayName.Trim();
        var userId = Guid.NewGuid().ToString("N");
        var now = DateTimeOffset.UtcNow;

        var header = new Dictionary<string, object>
        {
            ["alg"] = "HS256",
            ["typ"] = "JWT"
        };
        var payload = new Dictionary<string, object>
        {
            ["iss"] = _options.Issuer,
            ["aud"] = _options.Audience,
            ["sub"] = userId,
            ["name"] = cleanName,
            ["iat"] = now.ToUnixTimeSeconds(),
            ["exp"] = now.AddMinutes(_options.ExpirationMinutes).ToUnixTimeSeconds()
        };

        var token = Sign(header, payload);
        return new AuthResponse(token, userId, cleanName);
    }

    public UserContext? Validate(string token)
    {
        var parts = token.Split('.');
        if (parts.Length != 3)
        {
            return null;
        }

        var signingInput = $"{parts[0]}.{parts[1]}";
        var expectedSignature = Base64UrlEncode(Hmac(signingInput));
        if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expectedSignature), Encoding.UTF8.GetBytes(parts[2])))
        {
            return null;
        }

        var json = Encoding.UTF8.GetString(Base64UrlDecode(parts[1]));
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        if (!root.TryGetProperty("iss", out var issuer) || issuer.GetString() != _options.Issuer)
        {
            return null;
        }

        if (!root.TryGetProperty("aud", out var audience) || audience.GetString() != _options.Audience)
        {
            return null;
        }

        if (!root.TryGetProperty("exp", out var exp) || DateTimeOffset.FromUnixTimeSeconds(exp.GetInt64()) <= DateTimeOffset.UtcNow)
        {
            return null;
        }

        var userId = root.TryGetProperty("sub", out var sub) ? sub.GetString() : null;
        var displayName = root.TryGetProperty("name", out var name) ? name.GetString() : null;

        return string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(displayName)
            ? null
            : new UserContext(userId, displayName);
    }

    private string Sign(Dictionary<string, object> header, Dictionary<string, object> payload)
    {
        var encodedHeader = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(header));
        var encodedPayload = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(payload));
        var signingInput = $"{encodedHeader}.{encodedPayload}";
        var signature = Base64UrlEncode(Hmac(signingInput));
        return $"{signingInput}.{signature}";
    }

    private byte[] Hmac(string value)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.SigningKey));
        return hmac.ComputeHash(Encoding.UTF8.GetBytes(value));
    }

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static byte[] Base64UrlDecode(string value)
    {
        var base64 = value.Replace('-', '+').Replace('_', '/');
        base64 = base64.PadRight(base64.Length + (4 - base64.Length % 4) % 4, '=');
        return Convert.FromBase64String(base64);
    }
}
