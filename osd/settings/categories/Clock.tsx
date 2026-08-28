import { createComputed } from "ags"
import { createPoll } from "ags/time"

import { settingField } from "../../../config/settings"
import { formatDateTime } from "../../../util/dateFormat"
import { VERTICAL } from "../../../util/gtkutil"
import { SettingsSection } from "../components/SettingRow"
import { TextSetting } from "../controls/TextSetting"


const dateFormat = settingField("dateFormat")
const timeFormat = settingField("timeFormat")

export function ClockPreview() {
    const now = createPoll(new Date(), 1_000, () => new Date())
    const previewDate = createComputed(() => formatDateTime(now(), dateFormat.value()))
    const previewTime = createComputed(() => formatDateTime(now(), timeFormat.value()))

    return (
        <box class="settings-preview" orientation={VERTICAL}>
            <label class="settings-preview-date" xalign={0} label={previewDate}/>
            <label class="settings-preview-clock" xalign={0} label={previewTime}/>
        </box>
    )
}

export function ClockSettings() {
    return (
        <SettingsSection title="Clock">
            <TextSetting title="Date format"
                description="YYYY, MMM, MM, DD and ddd; [text] stays literal"
                field={dateFormat} class="settings-format" widthChars={16}/>

            <TextSetting title="Time format"
                description="HH or hh, mm, ss and A; [text] stays literal"
                field={timeFormat} class="settings-format" widthChars={16}/>
        </SettingsSection>
    )
}