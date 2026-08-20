import { Gtk } from "ags/gtk4"
import { createSubprocess, execAsync } from "ags/process"
import { handleClick } from "../../util/util"
import { notifications } from "../../util/icons"

const icons = {
    ...notifications,
    "notification": notifications["unread-2"],
    "inhibited-notification": notifications["mute-unread"],
    "dnd-inhibited-notification": notifications["mute-unread"],
    "dnd-inhibited-none": notifications["inhibited-none"]
}

type SwayState = {
    alt: keyof typeof icons
    class: string | string[]
    text: string
    tooltip: string
}

type State = SwayState & { seen: boolean }

const state = createSubprocess<State>(
    { alt: "none", class: "none", text: "0", tooltip: "No notifications", seen: false },
    ["swaync-client", "-swb"],
    (output, previous) => {
        const next = JSON.parse(output) as SwayState
        const count = Number(next.text)
        const open = Array.isArray(next.class) && next.class.includes("cc-open")
        const seen = count > 0 && (open || (count <= Number(previous.text) && previous.seen))

        return { ...next, seen: seen }
    }
)

const icon = state(({ alt, seen: seen }) =>
    alt === "notification" && seen ? notifications.unread : icons[alt]
)

const iconClass = state(({ alt, seen: seen }) =>
    `icon notification-icon${alt.endsWith("notification") && !seen ? " active" : ""}`
)

const togglePanel = () => void execAsync(["swaync-client", "-t", "-sw"])
const toggleDnd = () => void execAsync(["swaync-client", "-d", "-sw"])

export default function NotificationButton() {
    return (
        <button tooltipText={state(({ tooltip }) => tooltip)}>
            <Gtk.GestureClick button={0}
                onPressed={gesture => handleClick(gesture, { left: togglePanel, right: toggleDnd })}
            />
            <label class={iconClass} label={icon}/>
        </button>
    )
}