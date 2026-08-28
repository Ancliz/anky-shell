import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"

import { resetSettings, setting } from "../../config/settings"
import { getTheme } from "../../config/themes"
import { END, VERTICAL } from "../../util/gtkutil"
import { AppearanceSettings } from "./categories/Appearance"
import { ClockPreview, ClockSettings } from "./categories/Clock"
import { MonitoringSettings } from "./categories/Monitoring"


const WINDOW_NAME = "settings-osd"

let settingsWindow: Astal.Window | undefined


export function openSettings(gdkmonitor: Gdk.Monitor) {
    if(!settingsWindow)
        return

    settingsWindow.hide()
    settingsWindow.gdkmonitor = gdkmonitor
    settingsWindow.present()
}

function closeSettings() {
    settingsWindow?.hide()
}

export default function SettingsOSD() {
    const className = setting("theme")(theme => `SettingsOSD ${getTheme(theme).className}`)

    return (
        <window $={self => { settingsWindow = self }}
            name={WINDOW_NAME} class={className} namespace={WINDOW_NAME} visible={false}
            application={app} layer={Astal.Layer.OVERLAY} keymode={Astal.Keymode.ON_DEMAND}
            exclusivity={Astal.Exclusivity.IGNORE} hideOnClose resizable={false}>
            <Gtk.EventControllerKey onKeyPressed={(_controller, keyval) => {
                if(keyval !== Gdk.KEY_Escape)
                    return false

                closeSettings()
                return true
            }}/>

            <box class="settings-panel" widthRequest={820}
                orientation={VERTICAL} spacing={18}>
                <box class="settings-header" spacing={12}>
                    <box hexpand orientation={VERTICAL}>
                        <label class="settings-title" xalign={0} label="Bar settings"/>
                        <label class="settings-description" xalign={0}
                            label="Changes are previewed and saved automatically."/>
                    </box>
                    <button class="settings-close settings-close-icon" tooltipText="Close"
                        onClicked={closeSettings}>
                        <label label="×"/>
                    </button>
                </box>

                <ClockPreview/>

                <box class="settings-grid" spacing={24}>
                    <box class="settings-column" hexpand orientation={VERTICAL} spacing={10}>
                        <AppearanceSettings/>
                        <ClockSettings/>
                    </box>

                    <box class="settings-column" hexpand orientation={VERTICAL} spacing={10}>
                        <MonitoringSettings/>
                    </box>
                </box>

                <box class="settings-actions" halign={END} spacing={8}>
                    <button class="settings-reset" onClicked={resetSettings}>
                        <label label="Reset defaults"/>
                    </button>
                </box>
            </box>
        </window>
    )
}