import { CLIENT_ANIMATIONS, type ClientAnimationName } from "../../../config/bar/animations"
import { settingField } from "../../../config/settings"
import { THEMES, type ThemeName } from "../../../config/themes"
import { SettingsSection } from "../components/SettingRow"
import { ChoiceSetting, labelledOptions } from "../controls/ChoiceSetting"
import { NumberSetting } from "../controls/NumberSetting"


const themes = labelledOptions(THEMES)
const animations = labelledOptions(CLIENT_ANIMATIONS)

const theme = settingField("theme")
const barFontSize = settingField("barFontSize")
const clientAnimation = settingField("clientAnimation")

export function AppearanceSettings() {
    return (
        <SettingsSection title="Appearance">
            <ChoiceSetting title="Theme" description="Colour palette and accent"
                field={theme} options={themes}/>

            <NumberSetting title="Bar font size" description="Base size in pixels"
                field={barFontSize} min={9} max={24} step={0.5} digits={1}/>

            <ChoiceSetting title="Apps animation" description="Open, close and move preset"
                field={clientAnimation} options={animations}/>
        </SettingsSection>
    )
}