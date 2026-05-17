using Microsoft.AspNetCore.Mvc;
using MovieSync.Application.Auth;

namespace MovieSync.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(ITokenService tokens) : ControllerBase
{
    [HttpPost("guest")]
    public ActionResult<AuthResponse> Guest(GuestLoginRequest request)
    {
        return Ok(tokens.IssueGuestToken(request.DisplayName));
    }
}
