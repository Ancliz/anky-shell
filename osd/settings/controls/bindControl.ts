import { onCleanup } from "ags"

import type { SettingField } from "../../../util/settingField"


type ControlBinding<Value> = {
    field: SettingField<Value>
    read: () => Value
    write: (value: Value) => void
    connectChanged: (changed: () => void) => () => void
    equals?: (left: Value, right: Value) => boolean
}

export function bindControl<Value>({
    field,
    read,
    write,
    connectChanged,
    equals = Object.is
}: ControlBinding<Value>) {
    const sync = () => {
        const value = field.value.peek()
        if(!equals(read(), value))
            write(value)
    }

    sync()

    const disconnect = connectChanged(() => {
        const value = read()
        if(!equals(value, field.value.peek()))
            void field.set(value)
    })
    const unsubscribe = field.value.subscribe(sync)

    onCleanup(() => {
        disconnect()
        unsubscribe()
    })
}