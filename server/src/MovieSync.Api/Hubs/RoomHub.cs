using System.Security.Claims;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MovieSync.Application.Common;
using MovieSync.Application.Rooms;

namespace MovieSync.Api.Hubs;

[Authorize]
public sealed class RoomHub(IRoomService rooms, IConfiguration configuration) : Hub
{
    private static readonly ConcurrentDictionary<string, string> RoomByConnection = new();
    private static readonly ConcurrentDictionary<string, ScreenShareSession> ScreenSharesByRoom = new(StringComparer.OrdinalIgnoreCase);

    public async Task JoinRoom(string inviteCode)
    {
        var room = await rooms.JoinAsync(inviteCode, CurrentUser(), ClientBaseUrl(), Context.ConnectionAborted);
        if (room is null)
        {
            throw new HubException("Room not found.");
        }

        RoomByConnection[Context.ConnectionId] = inviteCode;
        await Groups.AddToGroupAsync(Context.ConnectionId, inviteCode, Context.ConnectionAborted);
        await Clients.Group(inviteCode).SendAsync("roomSnapshot", room, Context.ConnectionAborted);
        await Clients.GroupExcept(inviteCode, Context.ConnectionId).SendAsync("toast", $"{CurrentUser().DisplayName} joined the room", Context.ConnectionAborted);

        await Clients.Caller.SendAsync("roomConnectionReady", new
        {
            connectionId = Context.ConnectionId,
            activeScreenShare = ScreenSharesByRoom.TryGetValue(inviteCode, out var activeShare) ? activeShare : null
        }, Context.ConnectionAborted);
    }

    public async Task SendChat(string inviteCode, string message)
    {
        var chatMessage = await rooms.AddChatMessageAsync(inviteCode, CurrentUser(), message, Context.ConnectionAborted);
        if (chatMessage is not null)
        {
            await Clients.Group(inviteCode).SendAsync("chatMessage", chatMessage, Context.ConnectionAborted);
        }
    }

    public async Task SyncPlayback(string inviteCode, PlaybackSyncRequest request)
    {
        var playback = await rooms.SyncPlaybackAsync(inviteCode, request, Context.ConnectionAborted);
        if (playback is not null)
        {
            await Clients.Group(inviteCode).SendAsync("playbackSynced", playback, Context.ConnectionAborted);
        }
    }

    public async Task StartScreenShare(string inviteCode)
    {
        var user = CurrentUser();
        var session = new ScreenShareSession(Context.ConnectionId, user.UserId, user.DisplayName);

        if (!ScreenSharesByRoom.TryAdd(inviteCode, session))
        {
            throw new HubException("A screen share is already active in this room.");
        }

        await Clients.Group(inviteCode).SendAsync("screenShareStarted", session, Context.ConnectionAborted);
        await Clients.GroupExcept(inviteCode, Context.ConnectionId).SendAsync("toast", $"{user.DisplayName} started sharing", Context.ConnectionAborted);
    }

    public async Task StopScreenShare(string inviteCode)
    {
        if (ScreenSharesByRoom.TryGetValue(inviteCode, out var session) && session.HostConnectionId == Context.ConnectionId)
        {
            ScreenSharesByRoom.TryRemove(inviteCode, out _);
            await Clients.Group(inviteCode).SendAsync("screenShareStopped", Context.ConnectionId, Context.ConnectionAborted);
        }
    }

    public async Task RequestScreenShare(string inviteCode)
    {
        if (!ScreenSharesByRoom.TryGetValue(inviteCode, out var session))
        {
            return;
        }

        if (session.HostConnectionId == Context.ConnectionId)
        {
            return;
        }

        await Clients.Client(session.HostConnectionId).SendAsync("screenShareViewerReady", new
        {
            viewerConnectionId = Context.ConnectionId,
            roomInviteCode = inviteCode
        }, Context.ConnectionAborted);
    }

    public async Task SendWebRtcOffer(string inviteCode, string targetConnectionId, string offer)
    {
        if (!CanSignalPeer(inviteCode, targetConnectionId))
        {
            return;
        }

        await Clients.Client(targetConnectionId).SendAsync("webRtcOffer", new WebRtcSignal(Context.ConnectionId, inviteCode, offer), Context.ConnectionAborted);
    }

    public async Task SendWebRtcAnswer(string inviteCode, string targetConnectionId, string answer)
    {
        if (!CanSignalPeer(inviteCode, targetConnectionId))
        {
            return;
        }

        await Clients.Client(targetConnectionId).SendAsync("webRtcAnswer", new WebRtcSignal(Context.ConnectionId, inviteCode, answer), Context.ConnectionAborted);
    }

    public async Task SendIceCandidate(string inviteCode, string targetConnectionId, string candidate)
    {
        if (!CanSignalPeer(inviteCode, targetConnectionId))
        {
            return;
        }

        await Clients.Client(targetConnectionId).SendAsync("webRtcIceCandidate", new WebRtcSignal(Context.ConnectionId, inviteCode, candidate), Context.ConnectionAborted);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (RoomByConnection.TryRemove(Context.ConnectionId, out var inviteCode))
        {
            if (ScreenSharesByRoom.TryGetValue(inviteCode, out var screenShare) && screenShare.HostConnectionId == Context.ConnectionId)
            {
                ScreenSharesByRoom.TryRemove(inviteCode, out _);
                await Clients.Group(inviteCode).SendAsync("screenShareStopped", Context.ConnectionId, CancellationToken.None);
            }
            else if (screenShare is not null)
            {
                await Clients.Client(screenShare.HostConnectionId).SendAsync("screenShareViewerLeft", Context.ConnectionId, CancellationToken.None);
            }

            var snapshot = await rooms.LeaveAsync(inviteCode, CurrentUser(), ClientBaseUrl(), CancellationToken.None);
            if (snapshot is not null)
            {
                await Clients.Group(inviteCode).SendAsync("roomSnapshot", snapshot, CancellationToken.None);
                await Clients.Group(inviteCode).SendAsync("toast", $"{CurrentUser().DisplayName} left the room", CancellationToken.None);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private UserContext CurrentUser()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new HubException("Missing user id.");
        var displayName = Context.User?.FindFirstValue(ClaimTypes.Name) ?? "Guest";
        return new UserContext(userId, displayName);
    }

    private string ClientBaseUrl()
    {
        return configuration["Client:BaseUrl"] ?? "http://localhost:5173";
    }

    private bool CanSignalPeer(string inviteCode, string targetConnectionId)
    {
        return RoomByConnection.TryGetValue(Context.ConnectionId, out var senderRoom)
            && RoomByConnection.TryGetValue(targetConnectionId, out var targetRoom)
            && string.Equals(senderRoom, inviteCode, StringComparison.OrdinalIgnoreCase)
            && string.Equals(targetRoom, inviteCode, StringComparison.OrdinalIgnoreCase);
    }
}

public sealed record ScreenShareSession(string HostConnectionId, string HostUserId, string HostDisplayName);

public sealed record WebRtcSignal(string SenderConnectionId, string RoomInviteCode, string Payload);
