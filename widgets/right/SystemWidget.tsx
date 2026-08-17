import Gio from "gi://Gio"
import Hyprland from "gi://AstalHyprland"

import { createBinding, createComputed, createState } from "ags"
import { readFile } from "ags/file"
import { Gtk } from "ags/gtk4"
import { createPoll } from "ags/time"

import {
    network as networkIcons,
    system as systemIcons
} from "../../util/icons"


const hyprland = Hyprland.get_default()
const networkMonitor = Gio.NetworkMonitor.get_default()

const CPU_POLL_INTERVAL = 2_000
const RAM_POLL_INTERVAL = 5_000
const CPU_VALUE_CHARS = 4
const MEMORY_VALUE_CHARS = 5
const KIBIBYTE = 1_024
const GIBIBYTE = KIBIBYTE ** 3
const CPU_SENSOR_NAMES = ["k10temp", "coretemp", "zenpower"]

type CpuSample = { idle: number, total: number }
type CpuStats = { usage: number, temperature: number | null }
type MemoryStats = { used: number, total: number }

function readSystemFile(path: string): string | null {
    try   { return readFile(path) }
    catch { return null           }
}

function findCpuTemperatureFile(): string | null {
    try {
        const directory = Gio.File.new_for_path("/sys/class/hwmon")
        const children = directory.enumerate_children(
            Gio.FILE_ATTRIBUTE_STANDARD_NAME,
            Gio.FileQueryInfoFlags.NONE,
            null
        )

        let child: Gio.FileInfo | null
        let temperatureFile: string | null = null

        while((child = children.next_file(null))) {
            const path = directory.get_child(child.get_name()).get_path()

            if(path && CPU_SENSOR_NAMES.includes(readSystemFile(`${path}/name`)?.trim() ?? "")) {
                temperatureFile = `${path}/temp1_input`
                break
            }
        }

        children.close(null)
        return temperatureFile
    } catch {
        return null
    }
}

const cpuTemperatureFile = findCpuTemperatureFile()

function readCpuSample(): CpuSample {
    const times = readFile("/proc/stat")
        .split("\n")[0]
        .trim()
        .split(/\s+/)
        .slice(1, 9)
        .map(Number)

    return {
        idle: times[3] + times[4],
        total: times.reduce((sum, time) => sum + time, 0)
    }
}

let previousCpu = readCpuSample()

function readCpuUsage(): number {
    const current = readCpuSample()
    const idle = current.idle - previousCpu.idle
    const total = current.total - previousCpu.total

    previousCpu = current
    return Math.max(0, Math.min(100, 100 * (1 - idle / total)))
}

function readCpuTemperature(): number | null {
    if(!cpuTemperatureFile)
        return null

    const temperature = readSystemFile(cpuTemperatureFile)
    return temperature ? Number(temperature) / 1_000 : null
}

function readCpuStats(): CpuStats {
    return { usage: readCpuUsage(), temperature: readCpuTemperature() }
}

function readMemoryStats(): MemoryStats {
    const memory = Object.fromEntries(
        readFile("/proc/meminfo")
            .trim()
            .split("\n")
            .map(line => {
                const [key, value] = line.split(/:\s+/)

                return [key, Number.parseInt(value)]
            })
    )

    const total = memory.MemTotal
    const available = memory.MemAvailable

    return {
        used: (total - available) * KIBIBYTE,
        total: total * KIBIBYTE
    }
}

function readIpAddress(): string {
    let socket: Gio.Socket | null = null

    try {
        socket = Gio.Socket.new(Gio.SocketFamily.IPV4, Gio.SocketType.DATAGRAM, Gio.SocketProtocol.UDP)
        socket.connect(Gio.InetSocketAddress.new_from_string("1.1.1.1", 53), null)

        const address = socket.get_local_address() as Gio.InetSocketAddress
        return address.get_address().to_string()
    } catch {
        return "Unavailable"
    } finally {
        socket?.close()
    }
}

const networkAvailable = createBinding(networkMonitor, "networkAvailable")
const networkIcon = networkAvailable(available =>
    available ? networkIcons.wired : networkIcons["wired-off"]
)
const [networkRevision, setNetworkRevision] = createState(0)

networkMonitor.connect("network-changed", () => setNetworkRevision(revision => revision + 1))

const cpuStats = createPoll<CpuStats>(
    { usage: 0, temperature: readCpuTemperature() },
    CPU_POLL_INTERVAL,
    readCpuStats
)

const memoryStats = createPoll<MemoryStats>(
    readMemoryStats(),
    RAM_POLL_INTERVAL,
    readMemoryStats
)

const networkAddress = createComputed(() => {
    networkRevision()
    return networkAvailable() ? readIpAddress() : "No IP"
})
const [networkExpanded, setNetworkExpanded] = createState(false)

const toGiB = (bytes: number) => (bytes / GIBIBYTE).toFixed(2)
const formatTemperature = (value: number | null) => value === null ? "Unavailable" : `${value.toFixed(1)}°C`

function toggleSysWorkspace() {
    hyprland.dispatch('hl.dsp.workspace.toggle_special("sys")', "")
}

function toggleNetwork() {
    setNetworkExpanded(expanded => !expanded)
}

export default function SystemWidget() {
    const cpu = cpuStats(({ usage }) => `${Math.round(usage)}%`)
    const memory = memoryStats(({ used }) => `${toGiB(used)}G`)
    const cpuTooltip = cpuStats(({ usage, temperature }) =>
        `CPU: ${Math.round(usage)}% · ${formatTemperature(temperature)}`
    )
    const memoryTooltip = memoryStats(({ used, total }) => {
        const percentage = 100 * used / total

        return `RAM: ${Math.round(percentage)}% · ${toGiB(used)} / ${toGiB(total)} GiB`
    })

    return (
        <box class="system-widget" spacing={4}>
            <button class="system-section" tooltipText={cpuTooltip} onClicked={toggleSysWorkspace}>
                <box spacing={4}>
                    <label class="icon" label={systemIcons.cpu}/>
                    <Gtk.Inscription
                        minChars={CPU_VALUE_CHARS}
                        natChars={CPU_VALUE_CHARS}
                        xalign={1}
                        text={cpu}
                    />
                </box>
            </button>

            <button class="system-section" tooltipText={memoryTooltip} onClicked={toggleSysWorkspace}>
                <box spacing={4}>
                    <label class="icon" label={systemIcons.memory}/>
                    <Gtk.Inscription
                        minChars={MEMORY_VALUE_CHARS}
                        natChars={MEMORY_VALUE_CHARS}
                        xalign={1}
                        text={memory}
                    />
                </box>
            </button>

            <button class="system-section" tooltipText={networkAddress} onClicked={toggleNetwork}>
                <box spacing={4}>
                    <label class="icon" label={networkIcon}/>
                    <Gtk.Revealer
                        revealChild={networkExpanded}
                        transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
                    >
                        <label label={networkAddress}/>
                    </Gtk.Revealer>
                </box>
            </button>
        </box>
    )
}
