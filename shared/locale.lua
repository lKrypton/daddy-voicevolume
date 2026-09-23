-- Picks Config.Language, falls back to English for any missing key.
function LocaleTable()
    local selected = Locales[Config.Language] or {}
    local merged = {}
    for key, value in pairs(Locales['en'] or {}) do merged[key] = value end
    for key, value in pairs(selected) do merged[key] = value end
    return merged
end

function L(key, ...)
    local text = (Locales[Config.Language] or {})[key] or (Locales['en'] or {})[key] or key
    if select('#', ...) > 0 then
        local ok, formatted = pcall(string.format, text, ...)
        if ok then return formatted end
    end
    return text
end
