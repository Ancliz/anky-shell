import { execAsync } from "ags/process"
import { system } from "../util/icons"
import { groupBy } from "../util/util"
import {
    createBinding, createComputed, createConnection, createEffect,
    createState, For, onCleanup
} from "ags"
import AstalHyprland from "gi://AstalHyprland"
import Apps from "gi://AstalApps"
import { Gtk } from "ags/gtk4"

import {
    getClientAnimation,
    type ClientAnimationTiming,
    type TimingMode
} from "../config/bar/animations"
import { setting } from "../config/settings"

type Phase = "revealing" | "opening" | "idle" | "closing" | "moving-reveal" | "moving-in" | "moving-out"
type ClientItem = ReturnType<typeof createClientItem>

const apps = new Apps.Apps()
const hyprland = AstalHyprland.get_default()
const clientAnimation = setting("clientAnimation")

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
    const initialRevealTime = getClientAnimation(clientAnimation.peek()).open.revealTime
    const [revealDuration, setRevealDuration] = createState(initialRevealTime)
    return {
        client,
        monitorId,
        setMonitorId,
        phase,
        setPhase,
        revealed,
        setRevealed,
        revealDuration,
        setRevealDuration,
        targetMonitorId: client.workspace.monitor.id,
        generation: 0
    }
}

function AnimatedClient({ item } : { item: ClientItem }) {
    return (
        <revealer
            class="client-slot"
            transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
            transitionDuration={item.revealDuration}
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

    function beginTransition(item: ClientItem, phase: Phase, transition: ClientAnimationTiming) {
        const generation = ++item.generation
        item.setRevealDuration(transition.revealTime)
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
        const transition = getClientAnimation(clientAnimation.peek()).open
        const generation = beginTransition(item, "revealing", transition)
        const iconDelay = waitFor(transition.timing, transition.revealTime)
        const total = Math.max(transition.revealTime, iconDelay + transition.iconTime)

        laterIfCurrent(item, generation, 0, () => item.setRevealed(true))
        laterIfCurrent(item, generation, iconDelay, () => item.setPhase("opening"))
        laterIfCurrent(item, generation, total, () => item.setPhase("idle"))
    }

    function close(item: ClientItem) {
        const transition = getClientAnimation(clientAnimation.peek()).close
        const generation = beginTransition(item, "closing", transition)
        const revealDelay = waitFor(transition.timing, transition.iconTime)
        const total = Math.max(transition.iconTime, revealDelay + transition.revealTime)

        laterIfCurrent(item, generation, revealDelay, () => item.setRevealed(false))
        laterIfCurrent(item, generation, total, () => {
            itemsByAddress.delete(item.client.address)
            setClientItems(items => items.filter(current => current !== item))
        })
    }

    function move(item: ClientItem, monitorId: number) {
        const transition = getClientAnimation(clientAnimation.peek()).move
        const generation = beginTransition(item, "moving-out", transition)
        const revealDelay = waitFor(transition.timing, transition.iconTime)
        const iconDelay = waitFor(transition.timing, transition.revealTime)
        const moveOutTime = Math.max(transition.iconTime, revealDelay + transition.revealTime)
        const moveInTime = Math.max(transition.revealTime, iconDelay + transition.iconTime)
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

                // Reuse it so stale timers cannot remove a quickly reopened client
                // A client can reappear before close() finishes, so reuse its item instead of duplicating it
                item.client = actual.client
                item.targetMonitorId = actual.monitorId
                item.setMonitorId(actual.monitorId)

                // open() increments its generation to invalidate close timers, then restarts its animation
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
        const items = clientItems()
        const last = monitors().findLastIndex(monitor =>
            items.some(item => item.monitorId() === monitor.id)
        )
        return monitors().slice(0, last + 1)
    })
    const className = clientAnimation(name => `apps-bar ${getClientAnimation(name).className}`)

    onCleanup(() => {
        for(const timer of timers)
            clearTimeout(timer)
    })

    return (
        <box class={className} spacing={0}>
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
        <button class="applauncher-button"
            onClicked={() => execAsync("bash -c $HOME/configs/waybar/scripts/applauncher.sh")}>
            <label class="applauncher-icon" label={system["dots-grid"]}/>
        </button>
    )
}
