import AudioButton from "./AudioButton"
import Keymap from "./Keymap"
import NotificationButton from "./NotificationButton"
import PowerButton from "./PowerUButton"
import SystemWidget from "./SystemWidget"
import Tray from "./Tray"

export default function RightSection() {
    return (
        <box class="right-section" spacing={3}>
            <Keymap/>
            <Tray/>
            <NotificationButton/>
            <AudioButton/>
            <SystemWidget/>
            <PowerButton/>
        </box>
    )
}