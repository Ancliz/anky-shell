import { system } from "../../util/icons"

export default function Tray() {
    return (
        <button name="tray">
            <label class="icon" label={system["menu-down-outline"]}/>
        </button>
    )
}