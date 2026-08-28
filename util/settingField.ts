import type { Accessor } from "ags"


export type SettingField<T> = {
    value: Accessor<T>
    set: (value: T) => void | Promise<void>
    reset?: () => void | Promise<void>
}

export function mapSettingField<Source, Value>(
    field: SettingField<Source>,
    read: (value: Source) => Value,
    write: (value: Value) => Source
): SettingField<Value> {
    return {
        value: field.value(read),
        set: value => field.set(write(value)),
        reset: field.reset
    }
}