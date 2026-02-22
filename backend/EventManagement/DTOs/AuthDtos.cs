namespace EventManagement.DTOs;

public record RegisterRequest(string Name, string Email, string Password);

public record LoginRequest(string Email, string Password);

public record AuthResponse(string Token, int UserId, string Name, string Email, string Role);
