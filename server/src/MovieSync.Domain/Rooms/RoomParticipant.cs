namespace MovieSync.Domain.Rooms;

public sealed record RoomParticipant(
    string UserId,
    string DisplayName,
    DateTimeOffset JoinedAt);
