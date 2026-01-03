# Runtime base
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
EXPOSE 80
EXPOSE 443

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["ExcelProcessorApi.csproj", "."]
RUN dotnet restore "ExcelProcessorApi.csproj"
COPY . .
RUN dotnet publish "ExcelProcessorApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final stage
FROM runtime AS final
WORKDIR /app
COPY --from=build /app/publish .

RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:80

ENTRYPOINT ["dotnet", "ExcelProcessorApi.dll"]