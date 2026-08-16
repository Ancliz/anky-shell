import { execAsync } from "ags/process"
import { system } from "../util/icons"
import { groupBy } from "../util/util"
import { Accessor, createBinding, createComputed, createConnection, createEffect, createState, For, onCleanup } from "ags"
import AstalHyprland from "gi://AstalHyprland"
import Apps from "gi://AstalApps"
import { Gtk } from "ags/gtk4"


type TimingMode = "sequential" | "simultaneous"
type Phase = "revealing" | "opening" | "idle" | "closing" | "moving-reveal" | "moving-in" | "moving-out"
type ClientItem = ReturnType<typeof createClientItem>

const apps = new Apps.Apps()
const hyprland = AstalHyprland.get_default()
const OPEN_ICON_TIME = 350
const CLOSE_ICON_TIME = 350
const MOVE_ICON_TIME = 200
const OPEN_REVEAL_TIME = 180
const CLOSE_REVEAL_TIME = 180
const MOVE_REVEAL_TIME = 110
const OPEN_TIMING: TimingMode = "sequential"
const CLOSE_TIMING: TimingMode = "sequential"
const MOVE_TIMING: TimingMode = "simultaneous"

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

const waitFor = (mode: TimingMode, duration: number) => mode === "sequential" ? duration : 0


function getIcon(client: AstalHyprland.Client) {
    const className = client.get_class()
    const query = customClasses[className] ?? className
    return apps.fuzzy_query(query)[0]?.get_icon_name()
}

function focus(client: AstalHyprland.Client) {
    hyprland.dispatch(`hl.dsp.focus({ window = "address:0x${client.get_address()}" })`, "")
}

function createClientItem(client: AstalHyprland.Client, initiallyVisible = false) {
    const [monitorId, setMonitorId] = createState(client.workspace.monitor.id)
    const [phase, setPhase] = createState<Phase>(initiallyVisible ? "idle" : "revealing")
    const [revealed, setRevealed] = createState(initiallyVisible)
    return {
        client,
        monitorId,
        setMonitorId,
        phase,
        setPhase,
        revealed,
        setRevealed,
        targetMonitorId: client.workspace.monitor.id,
        generation: 0
    }
}

function revealTime(phase: Phase) {
    if(phase === "closing") return CLOSE_REVEAL_TIME
    return phase.startsWith("moving") ? MOVE_REVEAL_TIME : OPEN_REVEAL_TIME
}

function AnimatedClient({ item } : { item: ClientItem }) {
    return (
        <revealer
            class="client-slot"
            transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
            transitionDuration={item.phase(revealTime)}
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
        return generation
    }

    function laterIfCurrent(item: ClientItem, generation: number, delay: number, callback: () => void) {
        later(() => {
            if(item.generation === generation)
                callback()
        }, delay)
    }

    function open(item: ClientItem) {
        const generation = beginTransition(item, "revealing")
        const iconDelay = waitFor(OPEN_TIMING, OPEN_REVEAL_TIME)
        const total = Math.max(OPEN_REVEAL_TIME, iconDelay + OPEN_ICON_TIME)

        laterIfCurrent(item, generation, 0, () => item.setRevealed(true))
        laterIfCurrent(item, generation, iconDelay, () => item.setPhase("opening"))
        laterIfCurrent(item, generation, total, () => item.setPhase("idle"))
    }

    function close(item: ClientItem) {
        const generation = beginTransition(item, "closing")
        const revealDelay = waitFor(CLOSE_TIMING, CLOSE_ICON_TIME)
        const total = Math.max(CLOSE_ICON_TIME, revealDelay + CLOSE_REVEAL_TIME)

        laterIfCurrent(item, generation, revealDelay, () => item.setRevealed(false))
        laterIfCurrent(item, generation, total, () => {
            itemsByAddress.delete(item.client.address)
            setClientItems(items => items.filter(current => current !== item))
        })
    }

    function move(item: ClientItem, monitorId: number) {
        const generation = beginTransition(item, "moving-out")
        const revealDelay = waitFor(MOVE_TIMING, MOVE_ICON_TIME)
        const iconDelay = waitFor(MOVE_TIMING, MOVE_REVEAL_TIME)
        const moveOutTime = Math.max(MOVE_ICON_TIME, revealDelay + MOVE_REVEAL_TIME)
        const moveInTime = Math.max(MOVE_REVEAL_TIME, iconDelay + MOVE_ICON_TIME)
        item.targetMonitorId = monitorId

        laterIfCurrent(item, generation, revealDelay, () => item.setRevealed(false))
        laterIfCurrent(item, generation, moveOutTime, () => {
            item.setMonitorId(monitorId)
            item.setPhase("moving-reveal")
            laterIfCurrent(item, generation, 0, () => item.setRevealed(true))
            laterIfCurrent(item, generation, iconDelay, () => item.setPhase("moving-in"))
            laterIfCurrent(item, generation, moveInTime, () => item.setPhase("idle"))
        })
    }

    createEffect(() => {
        const actualClients = new Map<string, { client: AstalHyprland.Client; monitorId: number }>()

        for(const [monitorId, clients] of clientMonitorMap()) {
            for(const client of clients)
                actualClients.set(client.address, { client, monitorId })
        }

        for(const [address, actual] of actualClients) {
            const item = itemsByAddress.get(address)

            if(!item) {
                const newItem = createClientItem(actual.client)

                itemsByAddress.set(address, newItem)
                setClientItems(items => [...items, newItem])
                open(newItem)
            } else if(item.phase.peek() === "closing") {
                item.client = actual.client
                item.targetMonitorId = actual.monitorId
                item.setMonitorId(actual.monitorId)
                open(item)
            } else if(item.targetMonitorId !== actual.monitorId) {
                move(item, actual.monitorId)
            }
        }

        for(const [address, item] of itemsByAddress) {
            if(!actualClients.has(address) && item.phase.peek() !== "closing") {
                close(item)
            }
        }
    })

    function clientsOnMonitor(monitorId: number) {
        return createComputed(() => clientItems().filter(item => item.monitorId() === monitorId))
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
        for(const timer of timers)
            clearTimeout(timer)
    })

    return (
        <box
            class="apps-bar"
            css={`--client-open-time: ${OPEN_ICON_TIME}ms;
                  --client-close-time: ${CLOSE_ICON_TIME}ms;
                  --client-move-time: ${MOVE_ICON_TIME}ms;`}
            spacing={0}
        >
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