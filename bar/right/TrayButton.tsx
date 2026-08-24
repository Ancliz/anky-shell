import { Gdk } from "ags/gtk4"
import Tray from "../../tray/Tray"
import { system } from "../../util/icons"

export default function TrayButton() {
    return (
        <menubutton name="tray">
            <label class="icon" label={system["menu-down-outline"]}/>
            <popover>
                <Tray/>
            </popover>
        </menubutton>
    )
}