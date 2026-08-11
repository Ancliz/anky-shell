import { execAsync } from "ags/process"
import { system } from "../util/icons"

function LauncherButton() {
    return (
        <button onClicked={() => execAsync("bash -c $HOME/configs/waybar/scripts/applauncher.sh")}>
            <label class="icon" label={system["dots-grid"]}/>
        </button>
    )
}

export default function LeftSection() {
    return (
        <box spacing={8}>
            <LauncherButton/>
        </box>
    )
}