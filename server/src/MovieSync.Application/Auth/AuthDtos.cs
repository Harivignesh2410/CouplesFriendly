namespace MovieSync.Application.Auth;

public sealed record GuestLoginRequest(string DisplayName);

public sealed record AuthResponse(string AccessToken, string UserId, string DisplayName);
