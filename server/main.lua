-- Character name and gender of nearby players. The FiveM/Steam name is only used
-- when Config.UseFiveMNameFallback is on, so roleplay names stay in character.

local MAX_REQUEST_IDS = 40
local RANGE_PADDING = 4.0

local function trimName(value)
    if type(value) ~= 'string' then return nil end
    local trimmed = value:match('^%s*(.-)%s*$')
    if trimmed == nil or trimmed == '' then return nil end
    return trimmed
end

local function joinName(firstname, lastname)
    firstname, lastname = trimName(firstname), trimName(lastname)
    if firstname and lastname then return firstname .. ' ' .. lastname end
    return firstname or lastname
end

local function started(resource)
    return GetResourceState(resource) == 'started'
end

-- Framework is looked up on every call, so the start order of resources never matters.
local function detectFramework()
    local wanted = Config.Framework
    if wanted ~= 'auto' then return wanted end
    if started('qbx_core') then return 'qbx' end
    if started('qb-core') then return 'qb' end
    if started('es_extended') then return 'esx' end
    return 'standalone'
end

local QBCore, ESX

local function characterOf(serverId)
    local framework = detectFramework()

    if framework == 'qbx' then
        local player = exports.qbx_core:GetPlayer(serverId)
        local info = player and player.PlayerData and player.PlayerData.charinfo
        if info then return joinName(info.firstname, info.lastname), tonumber(info.gender) end
    elseif framework == 'qb' then
        QBCore = QBCore or exports['qb-core']:GetCoreObject()
        local player = QBCore and QBCore.Functions.GetPlayer(serverId)
        local info = player and player.PlayerData and player.PlayerData.charinfo
        if info then return joinName(info.firstname, info.lastname), tonumber(info.gender) end
    elseif framework == 'esx' then
        ESX = ESX or exports.es_extended:getSharedObject()
        local player = ESX and ESX.GetPlayerFromId(serverId)
        if player then
            local sex = player.get and player.get('sex')
            local gender = (sex == 'f' or sex == 'F' or sex == 1) and 1 or 0
            local name = joinName(player.get and player.get('firstName'), player.get and player.get('lastName'))
            return name or trimName(player.getName and player.getName()), gender
        end
    end

    if Config.UseFiveMNameFallback then
        return trimName(GetPlayerName(serverId)), nil
    end
    return nil, nil
end

lib.callback.register('daddy-voicevolume:getPlayerProfiles', function(source, targetServerIds)
    if type(targetServerIds) ~= 'table' then return {} end

    local srcPed = GetPlayerPed(source)
    if srcPed == 0 then return {} end

    local srcCoords = GetEntityCoords(srcPed)
    local maxDistance = Config.ListRange + RANGE_PADDING
    local profiles = {}
    local count = 0

    for i = 1, #targetServerIds do
        if count >= MAX_REQUEST_IDS then break end

        local serverId = tonumber(targetServerIds[i])
        if serverId and serverId > 0 and serverId ~= source then
            local targetPed = GetPlayerPed(serverId)
            if targetPed ~= 0 and #(srcCoords - GetEntityCoords(targetPed)) <= maxDistance then
                local ok, name, gender = pcall(characterOf, serverId)
                if not ok then name, gender = nil, nil end
                profiles[serverId] = { name = name, gender = gender == 1 and 1 or (gender == 0 and 0 or nil) }
                count = count + 1
            end
        end
    end

    return profiles
end)
