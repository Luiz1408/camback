
# Multi-stage build for ASP.NET Core 8.0
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["TruperBack/TruperBack.csproj", "TruperBack/"]
RUN dotnet restore "TruperBack/TruperBack.csproj"
COPY . .
WORKDIR "/src/TruperBack"
RUN dotnet build "TruperBack.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "TruperBack.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final stage
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

# Set environment variables
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:80

ENTRYPOINT ["dotnet", "TruperBack.dll"]

