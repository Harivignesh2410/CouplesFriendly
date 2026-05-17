using MovieSync.Application.Common;
using MovieSync.Domain.Rooms;

namespace MovieSync.Application.Rooms;

public interface IRoomService
{
    Task<RoomSummaryResponse> CreateAsync(CreateRoomRequest request, UserContext user, string clientBaseUrl, CancellationToken cancellationToken);
    Task<RoomSummaryResponse?> JoinAsync(string inviteCode, UserContext user, string clientBaseUrl, CancellationToken cancellationToken);
    Task<RoomSummaryResponse?> LeaveAsync(string inviteCode, UserContext user, string clientBaseUrl, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<RoomSummaryResponse>> ListAsync(string clientBaseUrl, CancellationToken cancellationToken);
    Task<ChatMessageResponse?> AddChatMessageAsync(string inviteCode, UserContext user, string message, CancellationToken cancellationToken);
    Task<PlaybackState?> SyncPlaybackAsync(string inviteCode, PlaybackSyncRequest request, CancellationToken cancellationToken);
}
