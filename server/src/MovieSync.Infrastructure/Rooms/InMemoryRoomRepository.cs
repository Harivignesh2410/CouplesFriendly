using System.Collections.Concurrent;
using MovieSync.Application.Rooms;
using MovieSync.Domain.Rooms;

namespace MovieSync.Infrastructure.Rooms;

public sealed class InMemoryRoomRepository : IRoomRepository
{
    private readonly ConcurrentDictionary<string, Room> _roomsByInviteCode = new(StringComparer.OrdinalIgnoreCase);

    public Task<Room> AddAsync(Room room, CancellationToken cancellationToken)
    {
        _roomsByInviteCode[room.InviteCode] = room;
        return Task.FromResult(room);
    }

    public Task<Room?> GetByInviteCodeAsync(string inviteCode, CancellationToken cancellationToken)
    {
        _roomsByInviteCode.TryGetValue(inviteCode, out var room);
        return Task.FromResult(room);
    }

    public Task<IReadOnlyCollection<Room>> ListAsync(CancellationToken cancellationToken)
    {
        return Task.FromResult<IReadOnlyCollection<Room>>(_roomsByInviteCode.Values.ToArray());
    }

    public Task UpdateAsync(Room room, CancellationToken cancellationToken)
    {
        _roomsByInviteCode[room.InviteCode] = room;
        return Task.CompletedTask;
    }
}
