namespace MovieSync.Domain.Rooms;

public sealed record ChatMessage(
    Guid Id,
    Guid RoomId,
    string UserId,
    string DisplayName,
    string Message,
    DateTimeOffset SentAt);
