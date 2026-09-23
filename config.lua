Config = {}

Config.Language = 'en'                   -- 'en' or 'tr', see locales/
Config.Framework = 'auto'                -- 'auto', 'qbx', 'qb', 'esx' or 'standalone' (only used for character names)
Config.UseFiveMNameFallback = false      -- show the FiveM name when no character name is found (otherwise "Player 12")

Config.OpenCommand = 'voicevolume'       -- command that opens and closes the panel
Config.OpenKey = 'F10'                   -- default key, players can change it in the FiveM key bindings
Config.FixVoiceCommand = 'fixvoice'      -- command that resets the voice connection, false to disable

Config.ListRange = 18.0                  -- players listed within this distance (m)
Config.RefreshInterval = 1500            -- list refresh while the panel is open (ms)
Config.ReapplyInterval = 200             -- how often custom volumes are checked against radio/phone and range (ms)

Config.MinVolume = 0.05                  -- lowest volume, 5% (players cannot be fully muted)
Config.DefaultVolume = 0.5               -- 50% = normal volume, no change applied
Config.MaxVolume = 1.0                   -- highest volume, 100% = twice as loud

Config.MarkerColor = { 244, 63, 94, 230 } -- arrow above the hovered player (r, g, b, alpha)
