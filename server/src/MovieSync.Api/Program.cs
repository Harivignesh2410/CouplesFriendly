using MovieSync.Api.Hubs;
using MovieSync.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddAuthorization();
builder.Services.AddInfrastructure(builder.Configuration);

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .GetChildren()
    .Select(origin => origin.Value)
    .OfType<string>()
    .ToArray();

if (allowedOrigins.Length == 0)
{
    allowedOrigins =
    [
        "https://couples-friendly.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ];
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("Client", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors("Client");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<RoomHub>("/hubs/rooms");

app.MapGet("/", () => Results.Ok(new { name = "Movie Sync API", status = "ready" }));

app.Run();
