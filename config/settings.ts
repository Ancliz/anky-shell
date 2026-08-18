import GLib from "gi://GLib"
import { Accessor, createState } from "ags"
import { readFile, writeFile } from "ags/file"
import type { ClientAnimationName } from "./animations"
import type { ThemeName } from "./themes"

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

function loadSettings(): Settings {
    try {
        const saved = JSON.parse(readFile(SETTINGS_PATH))
        return Object.fromEntries(Object.entries(DEFAULT_SETTINGS)
            .map(([key, fallback]) => [key, saved[key] ?? fallback])) as Settings
    } catch {
        return { ...DEFAULT_SETTINGS }
    }
}

export const [settings, setSettings] = createState(loadSettings())
let saveTimer: ReturnType<typeof setTimeout> | undefined

function saveSettings() {
    try          { writeFile(SETTINGS_PATH, JSON.stringify(settings.peek(), null, 4) + "\n") }
    catch(error) {  console.error("Could not save settings:", error)                         }
    saveTimer = undefined
}

function queueSave() {
    if(saveTimer !== undefined)
        clearTimeout(saveTimer)
    saveTimer = setTimeout(saveSettings, 200)
}

settings.subscribe(queueSave)

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(current => Object.is(current[key], value) ? current : { ...current, [key]: value })
}

export function setting<K extends keyof Settings>(key: K): Accessor<Settings[K]> {
    return new Accessor(
        () => settings.peek()[key],
        notify => {
            let current = settings.peek()[key]
            return settings.subscribe(() => {
                const next = settings.peek()[key]
                if(Object.is(current, next))
                    return

                current = next
                notify()
            })
        }
    )
}

export function resetSettings() {
    setSettings({ ...DEFAULT_SETTINGS })
}