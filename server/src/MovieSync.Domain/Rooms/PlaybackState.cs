namespace MovieSync.Domain.Rooms;

public sealed record PlaybackState(
    PlaybackStatus Status,
    double PositionSeconds,
    DateTimeOffset UpdatedAt);
