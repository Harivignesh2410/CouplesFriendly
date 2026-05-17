using MovieSync.Domain.Rooms;

namespace MovieSync.Application.Rooms;

public interface IRoomRepository
{
    Task<Room> AddAsync(Room room, CancellationToken cancellationToken);
    Task<Room?> GetByInviteCodeAsync(string inviteCode, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Room>> ListAsync(CancellationToken cancellationToken);
    Task UpdateAsync(Room room, CancellationToken cancellationToken);
}
