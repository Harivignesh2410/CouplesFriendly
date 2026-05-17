using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieSync.Application.Common;
using MovieSync.Application.Rooms;

namespace MovieSync.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/rooms")]
public sealed class RoomsController(IRoomService rooms, IConfiguration configuration) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<RoomSummaryResponse>>> List(CancellationToken cancellationToken)
    {
        return Ok(await rooms.ListAsync(ClientBaseUrl(), cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<RoomSummaryResponse>> Create(CreateRoomRequest request, CancellationToken cancellationToken)
    {
        var room = await rooms.CreateAsync(request, CurrentUser(), ClientBaseUrl(), cancellationToken);
        return CreatedAtAction(nameof(GetByInviteCode), new { inviteCode = room.InviteCode }, room);
    }

    [HttpGet("{inviteCode}")]
    public async Task<ActionResult<RoomSummaryResponse>> GetByInviteCode(string inviteCode, CancellationToken cancellationToken)
    {
        var room = await rooms.JoinAsync(inviteCode, CurrentUser(), ClientBaseUrl(), cancellationToken);
        return room is null ? NotFound() : Ok(room);
    }

    private UserContext CurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new InvalidOperationException("Missing user id.");
        var displayName = User.FindFirstValue(ClaimTypes.Name) ?? "Guest";
        return new UserContext(userId, displayName);
    }

    private string ClientBaseUrl()
    {
        return configuration["Client:BaseUrl"] ?? "http://localhost:5173";
    }
}
