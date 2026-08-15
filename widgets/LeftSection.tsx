import { execAsync } from "ags/process"
import { system } from "../util/icons"
import { groupBy } from "../util/util"
import { Accessor, createBinding, createConnection, For } from "ags"
import AstalHyprland from "gi://AstalHyprland"
import Apps from "gi://AstalApps"


const apps = new Apps.Apps()
const hyprland = AstalHyprland.get_default()

const groupClients = () =>
    [...groupBy(hyprland.clients, c => c.workspace.monitor.id)]
        .sort(([a], [b]) =>
            hyprland.get_monitor(a).x - hyprland.get_monitor(b).x
        )

const clientMonitorMap =  createConnection(
    groupClients(),
    [hyprland, "client-added",   () => groupClients()],
    [hyprland, "client-removed", () => groupClients()],
    [hyprland, "client-moved",   () => groupClients()],
    [hyprland, "event", (event, _, current) => event === "activespecial" ? groupClients() : current]
)

const customClasses = {
    spbtop: "foot"
}

function mapCustoms(className: string) {
    return customClasses[className as keyof typeof customClasses] ?? className
}

function getIcon(clients: AstalHyprland.Client) {
    const hyprClass = clients.get_class()
    return apps.fuzzy_query(mapCustoms(hyprClass))[0]?.get_icon_name()
}

function focus(client: AstalHyprland.Client) {
    hyprland.dispatch(`hl.dsp.focus({ window = "address:0x${client.get_address()}" })`, "")
}

export default function LeftSection() {
    return (
        <box class="apps-bar" spacing={0}>
            <LauncherButton/>
            <For each={clientMonitorMap}>
                {([_, clientArray], index) => (
                    <box class="monitor-clients">
                        { clientArray.map(client => (
                            <button onClicked={() => focus(client)}>
                                <image pixelSize={30} class="client-icon" icon-name={getIcon(client)}/>
                            </button>
                            ))}
                        { index() < clientMonitorMap().length - 1
                          &&
                          (<label class="monitor-client-delimiter" label="|"/>)}
                    </box>
                )}
            </For>
        </box>
    )
}

function LauncherButton() {
    return (
        <button onClicked={() => execAsync("bash -c $HOME/configs/waybar/scripts/applauncher.sh")}>
            <label class="icon" label={system["dots-grid"]}/>
        </button>
    )
}