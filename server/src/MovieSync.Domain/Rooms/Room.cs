namespace MovieSync.Domain.Rooms;

public sealed class Room
{
    private readonly List<RoomParticipant> _participants = [];
    private readonly List<ChatMessage> _messages = [];

    public Room(Guid id, string name, string inviteCode, string createdBy, DateTimeOffset createdAt)
    {
        Id = id;
        Name = name;
        InviteCode = inviteCode;
        CreatedBy = createdBy;
        CreatedAt = createdAt;
        Playback = new PlaybackState(PlaybackStatus.Paused, 0, createdAt);
    }

    public Guid Id { get; }
    public string Name { get; private set; }
    public string InviteCode { get; }
    public string CreatedBy { get; }
    public DateTimeOffset CreatedAt { get; }
    public PlaybackState Playback { get; private set; }
    public IReadOnlyCollection<RoomParticipant> Participants => _participants;
    public IReadOnlyCollection<ChatMessage> Messages => _messages;

    public void Join(string userId, string displayName, DateTimeOffset joinedAt)
    {
        if (_participants.All(participant => participant.UserId != userId))
        {
            _participants.Add(new RoomParticipant(userId, displayName, joinedAt));
        }
    }

    public void Leave(string userId)
    {
        _participants.RemoveAll(participant => participant.UserId == userId);
    }

    public ChatMessage AddMessage(string userId, string displayName, string message, DateTimeOffset sentAt)
    {
        var chatMessage = new ChatMessage(Guid.NewGuid(), Id, userId, displayName, message.Trim(), sentAt);
        _messages.Add(chatMessage);
        return chatMessage;
    }

    public void UpdatePlayback(PlaybackStatus status, double positionSeconds, DateTimeOffset updatedAt)
    {
        Playback = new PlaybackState(status, Math.Max(0, positionSeconds), updatedAt);
    }
}
