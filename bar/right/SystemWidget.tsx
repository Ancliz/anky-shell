import { createState } from "ags"
import { Gtk } from "ags/gtk4"

import { network as networkIcons, system as systemIcons } from "../../util/icons"
import { toggleSpecialWorkspace } from "../../util/hyprutil"
import { SystemMetricButton } from "../../widgets/general"
import { SLIDE_RIGHT } from "../../util/gtkutil"
import { cpuStats, GIBIBYTE, memoryStats, networkAddress, networkAvailable } from "../../global/services/systemStats"
import { setting } from "../../config/settings"

const cpuValueChars = setting("cpuValueChars")
const memoryValueChars = setting("memoryValueChars")

const [networkExpanded, setNetworkExpanded] = createState(false)
const networkIcon = networkAvailable(available => available ? networkIcons.wired : networkIcons["wired-off"])

const toGiB = (bytes: number) => (bytes / GIBIBYTE).toFixed(2)
const formatTemperature = (value: number | null) => value === null ? "Unavailable" : `${value.toFixed(1)}°C`

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

            <SystemMetricButton
                icon={systemIcons.cpu}
                value={cpu}
                valueChars={cpuValueChars}
                tooltip={cpuTooltip}
                onClicked={() => toggleSpecialWorkspace("sys")}
            />

            <SystemMetricButton
                icon={systemIcons.memory}
                value={memory}
                valueChars={memoryValueChars}
                tooltip={memoryTooltip}
                onClicked={() => toggleSpecialWorkspace("sys")}
            />

            <button class="system-section" tooltipText={networkAddress} onClicked={toggleNetwork}>
                <box spacing={4}>
                    <label class="icon" label={networkIcon}/>
                    <Gtk.Revealer revealChild={networkExpanded} transitionType={SLIDE_RIGHT}>
                        <label label={networkAddress}/>
                    </Gtk.Revealer>
                </box>
            </button>
        </box>
    )
}