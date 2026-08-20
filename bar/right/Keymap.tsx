import { createComputed, createConnection } from "ags"
import Hyprland from "gi://AstalHyprland"

const hyprland = Hyprland.get_default()

const keymaps: Record<string, string> = {
    "": "",
    "special": "S",
    "qlauncher": "Q"
};

const submap = createConnection("", [hyprland, "submap", (name, _current) => name])
const keymap = submap(name => { return keymaps[name] ?? "" })

export default function Keymap() {
    return (
        <button visible={keymap(value => value !== "")}>
            <label label={keymap}/>
        </button>
    )
}