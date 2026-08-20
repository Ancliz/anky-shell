import { Gdk } from "ags/gtk4"

import { openSettings } from "../../osd/settings/Settings"
import { system } from "../../util/icons"


type SettingsButtonProps = { gdkmonitor: Gdk.Monitor }

export default function SettingsButton({ gdkmonitor: gdkmonitor }: SettingsButtonProps) {
    return (
        <button class="settings-button" tooltipText="Bar settings"
            onClicked={() => openSettings(gdkmonitor)}>
            <label class="icon" label={system.settings}/>
        </button>
    )
}