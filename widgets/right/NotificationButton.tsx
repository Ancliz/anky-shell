import { execAsync } from "ags/process"
import { notifications } from "../../util/icons"

export default function NotificationButton() {
    return (
        <button onClicked={() => execAsync("swaync-client -t -sw")}>
            <label class="icon" label={notifications.none}/>
        </button>
    )
}