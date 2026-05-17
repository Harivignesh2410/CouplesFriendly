using System.Security.Cryptography;
using MovieSync.Application.Common;
using MovieSync.Domain.Rooms;

namespace MovieSync.Application.Rooms;

public sealed class RoomService(IRoomRepository rooms) : IRoomService
{
    public async Task<RoomSummaryResponse> CreateAsync(CreateRoomRequest request, UserContext user, string clientBaseUrl, CancellationToken cancellationToken)
    {
        var roomName = string.IsNullOrWhiteSpace(request.Name) ? "Movie Night" : request.Name.Trim();
        var now = DateTimeOffset.UtcNow;
        var inviteCode = await CreateUniqueInviteCodeAsync(cancellationToken);
        var room = new Room(Guid.NewGuid(), roomName, inviteCode, user.UserId, now);
        room.Join(user.UserId, user.DisplayName, now);

        await rooms.AddAsync(room, cancellationToken);
        return Map(room, clientBaseUrl);
    }

    public async Task<RoomSummaryResponse?> JoinAsync(string inviteCode, UserContext user, string clientBaseUrl, CancellationToken cancellationToken)
    {
        var room = await rooms.GetByInviteCodeAsync(inviteCode, cancellationToken);
        if (room is null)
        {
            return null;
        }

        room.Join(user.UserId, user.DisplayName, DateTimeOffset.UtcNow);
        await rooms.UpdateAsync(room, cancellationToken);
        return Map(room, clientBaseUrl);
    }

    public async Task<RoomSummaryResponse?> LeaveAsync(string inviteCode, UserContext user, string clientBaseUrl, CancellationToken cancellationToken)
    {
        var room = await rooms.GetByInviteCodeAsync(inviteCode, cancellationToken);
        if (room is null)
        {
            return null;
        }

        room.Leave(user.UserId);
        await rooms.UpdateAsync(room, cancellationToken);
        return Map(room, clientBaseUrl);
    }

    public async Task<IReadOnlyCollection<RoomSummaryResponse>> ListAsync(string clientBaseUrl, CancellationToken cancellationToken)
    {
        var allRooms = await rooms.ListAsync(cancellationToken);
        return allRooms
            .OrderByDescending(room => room.CreatedAt)
            .Select(room => Map(room, clientBaseUrl))
            .ToArray();
    }

    public async Task<ChatMessageResponse?> AddChatMessageAsync(string inviteCode, UserContext user, string message, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return null;
        }

        var room = await rooms.GetByInviteCodeAsync(inviteCode, cancellationToken);
        if (room is null)
        {
            return null;
        }

        var chatMessage = room.AddMessage(user.UserId, user.DisplayName, message, DateTimeOffset.UtcNow);
        await rooms.UpdateAsync(room, cancellationToken);
        return new ChatMessageResponse(chatMessage.Id, chatMessage.RoomId, chatMessage.UserId, chatMessage.DisplayName, chatMessage.Message, chatMessage.SentAt);
    }

    public async Task<PlaybackState?> SyncPlaybackAsync(string inviteCode, PlaybackSyncRequest request, CancellationToken cancellationToken)
    {
        var room = await rooms.GetByInviteCodeAsync(inviteCode, cancellationToken);
        if (room is null)
        {
            return null;
        }

        room.UpdatePlayback(request.Status, request.PositionSeconds, DateTimeOffset.UtcNow);
        await rooms.UpdateAsync(room, cancellationToken);
        return room.Playback;
    }

    private static RoomSummaryResponse Map(Room room, string clientBaseUrl)
    {
        var inviteUrl = $"{clientBaseUrl.TrimEnd('/')}/room/{room.InviteCode}";
        return new RoomSummaryResponse(room.Id, room.Name, room.InviteCode, inviteUrl, room.Playback, room.Participants);
    }

    private async Task<string> CreateUniqueInviteCodeAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 8; attempt++)
        {
            var inviteCode = CreateInviteCode();
            if (await rooms.GetByInviteCodeAsync(inviteCode, cancellationToken) is null)
            {
                return inviteCode;
            }
        }

        return $"{CreateInviteCode()}{DateTimeOffset.UtcNow.ToUnixTimeSeconds() % 100}";
    }

    private static string CreateInviteCode()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Span<byte> bytes = stackalloc byte[8];
        RandomNumberGenerator.Fill(bytes);

        return new string(bytes.ToArray().Select(value => alphabet[value % alphabet.Length]).ToArray());
    }
}
