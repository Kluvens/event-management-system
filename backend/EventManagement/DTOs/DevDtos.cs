namespace EventManagement.DTOs;

public record DevRegisterRequest(string Name, string Email, string Password);
public record DevLoginRequest(string Email, string Password);
public record DevAdminRegisterRequest(string Name, string Email, string Password, string RegistrationKey);
