import { Accessor, createState } from "ags"
import { readFile, writeFile } from "ags/file"

import type { SettingField } from "./settingField"
import { createTimeoutScope } from "./util"


export type PersistentSettingsOptions<T extends object> = {
    defaults: T
    path: string
    debounceMs?: number
    validate?: (value: unknown) => Partial<T> | null
}

export function createPersistentSettings<T extends object>({
    defaults,
    path,
    debounceMs = 200,
    validate
}: PersistentSettingsOptions<T>) {
    
    function mergeDefaults(saved: Partial<T>): T {
        return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [
            key,
            saved[key as keyof T] ?? fallback
        ])) as T
    }

    function load(): T {
        try {
            const parsed: unknown = JSON.parse(readFile(path))
            const saved = validate ? validate(parsed) : parsed

            return saved && typeof saved === "object" && !Array.isArray(saved)
                ? mergeDefaults(saved as Partial<T>)
                : { ...defaults }
        } catch {
            return { ...defaults }
        }
    }

    const [state, setState] = createState(load())
    const timers = createTimeoutScope()

    function save() {
        try          { writeFile(path, JSON.stringify(state.peek(), null, 4) + "\n") }
        catch(error) { console.error(`Could not save settings at ${path}:`, error)   }
    }

    const unsubscribe = state.subscribe(() => timers.replace("save", save, debounceMs))

    function set<K extends keyof T>(key: K, value: T[K]) {
        setState(current => Object.is(current[key], value) ? current : { ...current, [key]: value })
    }

    function accessor<K extends keyof T>(key: K): Accessor<T[K]> {
        return new Accessor(
            () => state.peek()[key],
            notify => {
                let current = state.peek()[key]
                return state.subscribe(() => {
                    const next = state.peek()[key]
                    if(Object.is(current, next))
                        return

                    current = next
                    notify()
                })
            }
        )
    }

    function field<K extends keyof T>(key: K): SettingField<T[K]> {
        return {
            value: accessor(key),
            set: value => set(key, value),
            reset: () => set(key, defaults[key])
        }
    }

    function reset() {
        setState({ ...defaults })
    }

    function dispose() {
        unsubscribe()
        timers.cancelAll()
    }

    return { state, setState, set, accessor, field, reset, dispose }
}