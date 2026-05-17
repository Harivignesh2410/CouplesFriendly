using MovieSync.Application.Common;

namespace MovieSync.Application.Auth;

public interface ITokenService
{
    AuthResponse IssueGuestToken(string displayName);
    UserContext? Validate(string token);
}
