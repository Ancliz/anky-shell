import GLib from "gi://GLib"
import type { ClientAnimationName } from "./bar/animations"
import type { ThemeName } from "./themes"
import { createPersistentSettings } from "../util/persistentSettings"

export type Settings = {
    cpuPollInterval: number
    ramPollInterval: number
    cpuValueChars: number
    memoryValueChars: number
    barFontSize: number
    dateFormat: string
    timeFormat: string
    theme: ThemeName
    clientAnimation: ClientAnimationName
}

export const DEFAULT_SETTINGS: Settings = {
    cpuPollInterval: 2_000,
    ramPollInterval: 5_000,
    cpuValueChars: 4,
    memoryValueChars: 5,
    barFontSize: 14,
    dateFormat: "DD/MM/YY",
    timeFormat: "HH:mm",
    theme: "mocha-mauve",
    clientAnimation: "grow-shake"
}

export const SETTINGS_PATH = GLib.build_filenamev([
    GLib.get_user_config_dir(), "ags", "bar", "settings.json"
])

const store = createPersistentSettings({
    defaults: DEFAULT_SETTINGS,
    path: SETTINGS_PATH,
    debounceMs: 200
})

export const settings = store.state
export const setSettings = store.setState
export const setSetting = store.set
export const setting = store.accessor
export const settingField = store.field
export const resetSettings = store.reset
export const disposeSettings = store.dispose