import { settingField } from "../../../config/settings"
import { mapSettingField } from "../../../util/settingField"
import { SettingsSection } from "../components/SettingRow"
import { NumberSetting } from "../controls/NumberSetting"


const cpuPollInterval = mapSettingField(
    settingField("cpuPollInterval"),
    milliseconds => milliseconds / 1_000,
    seconds => seconds * 1_000
)
const ramPollInterval = mapSettingField(
    settingField("ramPollInterval"),
    milliseconds => milliseconds / 1_000,
    seconds => seconds * 1_000
)
const cpuValueChars = settingField("cpuValueChars")
const memoryValueChars = settingField("memoryValueChars")

export function MonitoringSettings() {
    return (
        <SettingsSection title="Monitoring">
            <NumberSetting title="CPU refresh" description="Seconds between samples"
                field={cpuPollInterval} min={0.25} max={60} step={0.25} digits={2}/>

            <NumberSetting title="RAM refresh" description="Seconds between samples"
                field={ramPollInterval} min={0.25} max={60} step={0.25} digits={2}/>

            <NumberSetting title="CPU width" description="Reserved value characters"
                field={cpuValueChars} min={2} max={10} step={1}/>

            <NumberSetting title="RAM width" description="Reserved value characters"
                field={memoryValueChars} min={2} max={10} step={1}/>
        </SettingsSection>
    )
}