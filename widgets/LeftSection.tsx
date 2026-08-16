import { execAsync } from "ags/process"
import { system } from "../util/icons"
import { groupBy } from "../util/util"
import { Accessor, createBinding, createComputed, createConnection, createEffect, createState, For, onCleanup } from "ags"
import AstalHyprland from "gi://AstalHyprland"
import Apps from "gi://AstalApps"
import { Gtk } from "ags/gtk4"


const apps = new Apps.Apps()
const hyprland = AstalHyprland.get_default()
const ANIMATION_TIME = 180

const customClasses: Record<string, string> = {
    spbtop: "foot",
    spterm: "foot"
}

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

const monitors = createBinding(hyprland, "monitors").as(monitors =>
    monitors.toSorted((a, b) => a.x - b.x)
)

function getIcon(client: AstalHyprland.Client) {
    const className = client.get_class()
    const query = customClasses[className] ?? className
    return apps.fuzzy_query(query)[0]?.get_icon_name()
}

function focus(client: AstalHyprland.Client) {
    hyprland.dispatch(`hl.dsp.focus({ window = "address:0x${client.get_address()}" })`, "")
}

type Phase = "opening" | "idle" | "closing" | "moving-in" | "moving-out"

function createClientItem(client: AstalHyprland.Client, initiallyVisible = false) {
    const [monitorId, setMonitorId] = createState(client.workspace.monitor.id)
    const [phase, setPhase] = createState<Phase>(initiallyVisible ? "idle" : "opening")
    const [revealed, setRevealed] = createState(initiallyVisible)
    return {
        client,
        monitorId,
        setMonitorId,
        phase,
        setPhase,
        revealed,
        setRevealed,
        generation: 0
    }
}

type ClientItem = ReturnType<typeof createClientItem>

function AnimatedClient({ item } : { item: ClientItem }) {
    return (
        <revealer
            class="client-slot"
            transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
            transitionDuration={ANIMATION_TIME}
            revealChild={item.revealed}
        >
            <button class={item.phase(p => `client ${p}`)} onClicked={() => focus(item.client)}>
                <image class="client-icon" pixelSize={30} icon-name={getIcon(item.client)}/>
            </button>
        </revealer>
    )
}

export default function LeftSection() {
    const initialItems = hyprland.clients.map(client => createClientItem(client, true))
    const [clientItems, setClientItems] = createState<ClientItem[]>(initialItems)
    const itemsByAddress = new Map(initialItems.map(item => [item.client.address, item]))
    const timers = new Set<ReturnType<typeof setTimeout>>()

    function later(callback: () => void, delay: number) {
        const timer = setTimeout(() => {
            timers.delete(timer)
            callback()
        }, delay)

        timers.add(timer)
    }

    function beginTransition(item: ClientItem, phase: Phase) {
        const generation = ++item.generation
        item.setPhase(phase)
        item.setRevealed(false)
        return generation
    }

    function laterIfCurrent(item: ClientItem, generation: number, delay: number, callback: () => void) {
        later(() => {
            if (item.generation === generation)
                callback()
        }, delay)
    }

function open(item: ClientItem) {
    const generation = beginTransition(item, "opening")

    laterIfCurrent(item, generation, 0, () =>
        item.setRevealed(true)
    )

    laterIfCurrent(item, generation, ANIMATION_TIME, () =>
        item.setPhase("idle")
    )
}

function close(item: ClientItem) {
    const generation = beginTransition(item, "closing")

    laterIfCurrent(item, generation, ANIMATION_TIME, () => {
        itemsByAddress.delete(item.client.address)
        setClientItems(items =>
            items.filter(current => current !== item)
        )
    })
}

function move(item: ClientItem, monitorId: number) {
    const generation = beginTransition(item, "moving-out")

    laterIfCurrent(item, generation, ANIMATION_TIME, () => {
        item.setMonitorId(monitorId)
        item.setPhase("moving-in")

        laterIfCurrent(item, generation, 0, () =>
            item.setRevealed(true)
        )

        laterIfCurrent(item, generation, ANIMATION_TIME, () =>
            item.setPhase("idle")
        )
    })
}

    createEffect(() => {
        const actualClients = new Map<
            string,
            { client: AstalHyprland.Client; monitorId: number }
        >()

        for (const [monitorId, clients] of clientMonitorMap()) {
            for (const client of clients)
                actualClients.set(client.address, { client, monitorId })
        }

        for (const [address, actual] of actualClients) {
            const item = itemsByAddress.get(address)

            if (!item) {
                const newItem = createClientItem(actual.client)

                itemsByAddress.set(address, newItem)
                setClientItems(items => [...items, newItem])
                open(newItem)
            } else if (item.monitorId.peek() !== actual.monitorId) {
                move(item, actual.monitorId)
            }
        }

        for (const [address, item] of itemsByAddress) {
            if (
                !actualClients.has(address)
                && item.phase.peek() !== "closing"
            ) {
                close(item)
            }
        }
    })

    function clientsOnMonitor(monitorId: number) {
        return createComputed(() =>
            clientItems().filter(
                item => item.monitorId() === monitorId
            )
        )
    }

    const renderedMonitors = createComputed(() => {
    const orderedMonitors = monitors()
    const occupied = new Set(clientItems().map(item => item.monitorId()))

    let lastOccupied = -1

    for(let index = 0; index < orderedMonitors.length; ++index) {
        if(occupied.has(orderedMonitors[index].id))
            lastOccupied = index
    }

    return orderedMonitors.slice(0, lastOccupied + 1)
})

    onCleanup(() => {
        for (const timer of timers)
            clearTimeout(timer)
    })

    return (
        <box class="apps-bar" spacing={0}>
            <LauncherButton/>
            <For each={renderedMonitors}>
                {(monitor, index) => (
                    <box>
                        <box class="monitor-clients">
                            <For each={clientsOnMonitor(monitor.id)}>
                                {item => <AnimatedClient item={item} />}
                            </For>
                        </box>

                        <label class="monitor-client-delimiter" label="|"
                               visible={createComputed(() => index() < renderedMonitors().length - 1)}/>
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