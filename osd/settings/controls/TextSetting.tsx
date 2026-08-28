import type { SettingField } from "../../../util/settingField"
import { SettingRow, type SettingRowProps } from "../components/SettingRow"


export type TextSettingProps = Omit<SettingRowProps, "control"> & {
    field: SettingField<string>
    class?: string
    widthChars?: number
}

export function TextSetting({
    title,
    description,
    field,
    class: className = "",
    widthChars
}: TextSettingProps) {
    return (
        <SettingRow title={title} description={description}
            control={
                <entry class={`settings-control ${className}`} widthChars={widthChars}
                    text={field.value} onNotifyText={entry => {
                        if(entry.text !== field.value.peek())
                            void field.set(entry.text)
                    }}/>
            }/>
    )
}