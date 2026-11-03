# syntax=docker/dockerfile:1.7

# ---- Stage 1: build (SDK nặng, chỉ dùng để biên dịch) ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy riêng file .csproj trước để Docker cache lớp "restore".
# Sửa code mà không đổi package thì bước restore không phải chạy lại.
COPY src/NexusOMS.Api/NexusOMS.Api.csproj                                                   src/NexusOMS.Api/
COPY src/NexusOMS.Contracts/NexusOMS.Contracts.csproj                                       src/NexusOMS.Contracts/
COPY src/Modules/InventoryAndChannels/NexusOMS.InventoryAndChannels.csproj                  src/Modules/InventoryAndChannels/
COPY src/Modules/OrderingAndFinance/NexusOMS.OrderingAndFinance.csproj                      src/Modules/OrderingAndFinance/
COPY src/Modules/InventoryAndChannels/Domain/ src/Modules/InventoryAndChannels/Domain/
COPY src/Modules/InventoryAndChannels/Application/ src/Modules/InventoryAndChannels/Application/
COPY src/Modules/InventoryAndChannels/Infrastructure/ src/Modules/InventoryAndChannels/Infrastructure/
COPY src/Modules/OrderingAndFinance/Domain/ src/Modules/OrderingAndFinance/Domain/
COPY src/Modules/OrderingAndFinance/Application/ src/Modules/OrderingAndFinance/Application/
COPY src/Modules/OrderingAndFinance/Infrastructure/ src/Modules/OrderingAndFinance/Infrastructure/
RUN dotnet restore src/NexusOMS.Api/NexusOMS.Api.csproj

COPY src/ src/
RUN dotnet publish src/NexusOMS.Api/NexusOMS.Api.csproj \
    -c Release -o /app/publish --no-restore /p:UseAppHost=false

# ---- Stage 2: runtime (image nhỏ, không có SDK, chạy user thường) ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_EnableDiagnostics=0
EXPOSE 8080

# Image aspnet có sẵn user "app" (không phải root)
USER app
ENTRYPOINT ["dotnet", "NexusOMS.Api.dll"]
