import AstalHyprland from "gi://AstalHyprland"
import { groupBy } from "./util";

const hyprland = AstalHyprland.get_default();

export function focus(client: AstalHyprland.Client) {
    hyprland.dispatch(`hl.dsp.focus({ window = "address:0x${client.get_address()}" })`, "")
}

export function toggleClient(client: AstalHyprland.Client) {
    if(hyprland.get_focused_client() === client) {    
        hyprland.dispatch("hl.dsp.focus({ last = true })", "")
    } else {
        focus(client)
    }
}

export function getClientsByClass(cls : string) {
    return hyprland.get_clients().filter(client => client.get_class() === cls)
}

export function getClientByClass(cls: string) {
    return getClientsByClass(cls)[0]
}

export function toggleSpecialWorkspace(name : string) {
    hyprland.dispatch(`hl.dsp.workspace.toggle_special('${name}')`, "")
}