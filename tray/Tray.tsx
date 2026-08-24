import { createBinding, For } from "ags"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import app from "ags/gtk4/app"
import AstalTray from "gi://AstalTray"
import { handleClick } from "../util/util"

const tray = AstalTray.get_default()
const items = createBinding(tray, "items").as(items => items ?? [])

let trayDropdown: Gtk.Box | undefined

export function toggleTray(gdkmonitor: Gdk.Monitor) {
    if(!trayDropdown)
        return

    if(trayDropdown.is_visible()) {
        trayDropdown.hide()
        return
    }
}

function Item({ item }: { item: AstalTray.TrayItem }) {
    return (
        <button tooltipText={createBinding(item, "title")}>
            <Gtk.GestureClick button={0}
                onPressed={gesture =>
                    handleClick(gesture, {
                        left: () => {
                            item.about_to_show()
                            item.activate(0, 0)
                        },
                        right: () => {
                            item.about_to_show()
                            item.secondary_activate(0,0)
                        }
                    })
                }
            />
            <image gicon={createBinding(item, "gicon")}/>
        </button>
    )
}

export default function Tray() {
    return (
        <box>
            <For each={items}>
                {item => <Item item={item}/>}
            </For>
        </box>
    )
}