import { Gtk } from "ags/gtk4"

import type { SettingField } from "../../../util/settingField"
import { SettingRow, type SettingRowProps } from "../components/SettingRow"
import { bindControl } from "./bindControl"


export type NumberSettingProps = Omit<SettingRowProps, "control"> & {
    field: SettingField<number>
    min: number
    max: number
    step: number
    digits?: number
}

export function NumberSetting({
    title,
    description,
    field,
    min,
    max,
    step,
    digits = 0
}: NumberSettingProps) {
    const control = Gtk.SpinButton.new_with_range(min, max, step)

    control.add_css_class("settings-control")
    control.digits = digits
    control.numeric = true
    control.widthChars = 6

    bindControl({
        field,
        read: () => control.value,
        write: value => { control.value = value },
        connectChanged: changed => {
            const signal = control.connect("value-changed", changed)
            return () => control.disconnect(signal)
        }
    })

    return <SettingRow title={title} description={description} control={control}/>
}