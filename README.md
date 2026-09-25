# Daddy Voice Volume

![Daddy Voice Volume](https://raw.githubusercontent.com/lKrypton/daddy-voicevolume/main/.github/banner.jpg)

Turn the voice of one nearby player up or down, only for yourself. Made for pma-voice.
Someone too loud or too quiet? Press F10, pick the player and move the slider.

Free and open source by Daddy Studios.

![The panel](https://raw.githubusercontent.com/lKrypton/daddy-voicevolume/main/.github/preview.png)

## Features

- **Per-player volume** from 5% to 100% (50% is normal), only on your side
- **Nearby list** with character names, IDs and distance, live while the panel is open
- **Masked players** show as "Unknown Man" or "Unknown Woman" instead of their name
- **Arrow above the player** you point at in the list, so you know who is who
- **Search** by name or ID, drag and resize the panel, it remembers its place
- **Reset voice** button and `/fixvoice` to reconnect Mumble when you cannot hear people
- Keeps pma-voice in charge: talking ranges, radio and phone calls work as before
- **Qbox, QBCore, ESX or standalone** character names, detected on its own
- **English and Turkish**

## Requirements

- pma-voice
- ox_lib
- Optional: qbx_core, qb-core or es_extended for character names

## Installation

1. Put the `daddy-voicevolume` folder in your `resources` folder.
2. Start it after pma-voice and ox_lib in your `server.cfg`:

```cfg
ensure pma-voice
ensure ox_lib
ensure daddy-voicevolume
```

3. Restart the server. Players press **F10** (or type `/voicevolume`). The key can be changed
   in the FiveM key bindings.

## Configuration

Everything is in `config.lua`: language, framework, command and key, list range, volume
limits and the arrow color. Texts are in `locales/en.lua` and `locales/tr.lua`.

## How it works

The panel only changes the gain of a player on your own client
(`MumbleSetVolumeOverrideByServerId`). The change applies only while that player is inside
their pma-voice talking range; outside it, or on a shared radio or phone channel, pma-voice
decides the volume as usual. Nothing is saved, the volumes reset when you reconnect.

## Support

Discord: https://discord.gg/NFKjbN9s2q
