import { Gtk } from "ags/gtk4"

import type { SettingField } from "../../../util/settingField"
import { SettingRow, type SettingRowProps } from "../components/SettingRow"
import { bindControl } from "./bindControl"


export type SettingOption<T extends string> = readonly [value: T, label: string]

export type ChoiceSettingProps<T extends string> = Omit<SettingRowProps, "control"> & {
    field: SettingField<T>
    options: readonly SettingOption<T>[]
}

export function ChoiceSetting<T extends string>({
    title,
    description,
    field,
    options
}: ChoiceSettingProps<T>) {
    const control = Gtk.DropDown.new_from_strings(options.map(([, label]) => label))

    control.add_css_class("settings-control")

    bindControl({
        field,
        read: () => options[control.selected]?.[0] ?? field.value.peek(),
        write: value => {
            control.selected = Math.max(0, options.findIndex(([option]) => option === value))
        },
        connectChanged: changed => {
            const signal = control.connect("notify::selected", changed)
            return () => control.disconnect(signal)
        }
    })

    return <SettingRow title={title} description={description} control={control}/>
}

type LabelledEntries = Record<string, { readonly label: string }>

export function labelledOptions<const Entries extends LabelledEntries>(entries: Entries) {
    type Key = keyof Entries & string
    return (Object.keys(entries) as Key[])
        .map(key => [key, entries[key].label] as const)
}