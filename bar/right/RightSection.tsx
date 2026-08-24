import { Gdk } from "ags/gtk4"

import AudioButton from "./AudioButton"
import Keymap from "./Keymap"
import NotificationButton from "./NotificationButton"
import PowerButton from "./PowerUButton"
import SettingsButton from "./SettingsButton"
import SystemWidget from "./SystemWidget"
import TrayButton from "./TrayButton"

export default function RightSection({ gdkmonitor: gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
    return (
        <box class="right-section" spacing={3}>
            <Keymap/>
            <TrayButton/>
            <NotificationButton/>
            <AudioButton/>
            <SystemWidget/>
            <SettingsButton gdkmonitor={gdkmonitor}/>
            <PowerButton/>
        </box>
    )
}