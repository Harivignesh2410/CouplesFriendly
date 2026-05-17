using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MovieSync.Application.Auth;
using MovieSync.Application.Rooms;
using MovieSync.Infrastructure.Auth;
using MovieSync.Infrastructure.Rooms;

namespace MovieSync.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton<IRoomRepository, InMemoryRoomRepository>();
        services.AddScoped<IRoomService, RoomService>();

        services
            .AddAuthentication(MovieSyncAuthenticationHandler.SchemeName)
            .AddScheme<AuthenticationSchemeOptions, MovieSyncAuthenticationHandler>(MovieSyncAuthenticationHandler.SchemeName, _ => { });

        return services;
    }
}
