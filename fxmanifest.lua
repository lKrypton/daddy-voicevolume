fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'daddy-voicevolume'
author 'Daddy Studios'
description 'Per-player voice volume for nearby players, made for pma-voice'
version '1.0.0'

ui_page 'web/index.html'

files {
    'web/index.html',
    'web/style.css',
    'web/app.js',
}

shared_scripts {
    '@ox_lib/init.lua',
    'config.lua',
    'locales/*.lua',
    'shared/locale.lua',
}

client_scripts {
    'client/voice.lua',
    'client/main.lua',
}

server_scripts {
    'server/main.lua',
}

dependencies {
    'pma-voice',
    'ox_lib',
}
