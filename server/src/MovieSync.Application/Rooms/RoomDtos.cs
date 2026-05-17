using MovieSync.Domain.Rooms;

namespace MovieSync.Application.Rooms;

public sealed record CreateRoomRequest(string Name);

public sealed record RoomSummaryResponse(
    Guid Id,
    string Name,
    string InviteCode,
    string InviteUrl,
    PlaybackState Playback,
    IReadOnlyCollection<RoomParticipant> Participants);

public sealed record ChatMessageResponse(
    Guid Id,
    Guid RoomId,
    string UserId,
    string DisplayName,
    string Message,
    DateTimeOffset SentAt);

public sealed record PlaybackSyncRequest(PlaybackStatus Status, double PositionSeconds);
