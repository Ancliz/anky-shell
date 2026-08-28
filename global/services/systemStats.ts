import { readFile } from "ags/file"
import Gio from "gi://Gio"
import { clamp } from "../../util/util"
import { setting } from "../../config/settings"
import { createDynamicPoll } from "../../util/agsutil"
import { createBinding, createComputed, createState } from "ags"

type CpuSample = { idle: number, total: number }
type CpuStats = { usage: number, temperature: number | null }
type MemoryStats = { used: number, total: number }

const CPU_SENSOR_NAMES = ["k10temp", "coretemp", "zenpower"]
const cpuPollInterval = setting("cpuPollInterval")
const ramPollInterval = setting("ramPollInterval")
const cpuTemperatureFile = findCpuTemperatureFile()
const networkMonitor = Gio.NetworkMonitor.get_default()
const [networkRevision, setNetworkRevision] = createState(0)

/**************************************************************************************************
 *                                                                                                *
 *                                              Exports                                           * 
 *                                                                                                *
 **************************************************************************************************/

export const KIBIBYTE = 1_024
export const GIBIBYTE = KIBIBYTE ** 3
export const networkAvailable = createBinding(networkMonitor, "networkAvailable")

export const networkAddress = createComputed(() => {
    networkRevision()
    return networkAvailable() ? readIpAddress() : "No IP"
})

export const cpuStats = createDynamicPoll<CpuStats>(
    { usage: 0, temperature: readCpuTemperature() },
    cpuPollInterval,
    readCpuStats
)

export const memoryStats = createDynamicPoll<MemoryStats>(
    readMemoryStats(),
    ramPollInterval,
    readMemoryStats
)

/**************************************************************************************************/

let previousCpu = readCpuSample()
networkMonitor.connect("network-changed", () => setNetworkRevision(revision => revision + 1))

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

function readCpuUsage(): number {
    const current = readCpuSample()
    const idle = current.idle - previousCpu.idle
    const total = current.total - previousCpu.total

    previousCpu = current
    return clamp(100 * (1 - idle / total), 0, 100)
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