import { type Accessor, createComputed, onCleanup } from "ags"
import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import { createPoll } from "ags/time"
import { CLIENT_ANIMATIONS, type ClientAnimationName } from "../../config/bar/animations"
import { resetSettings, setting, settings, setSetting } from "../../config/settings"
import { getTheme, THEMES, type ThemeName } from "../../config/themes"
import { formatDateTime } from "../../util/dateFormat"
import { END, VERTICAL } from "../../util/gtkutil"


const WINDOW_NAME = "settings-osd"
const themes = (Object.keys(THEMES) as ThemeName[])
    .map(name => [name, THEMES[name].label] as const)
const animations = (Object.keys(CLIENT_ANIMATIONS) as ClientAnimationName[])
    .map(name => [name, CLIENT_ANIMATIONS[name].label] as const)

type Option<T extends string> = readonly [value: T, label: string]

type SettingRowProps = {
    title: string
    description: string
    control: JSX.Element
}

type NumberControlProps = {
    value: Accessor<number>
    min: number
    max: number
    step: number
    digits?: number
    onChange: (value: number) => void
}

type ChoiceControlProps<T extends string> = {
    value: Accessor<T>
    options: readonly Option<T>[]
    onChange: (value: T) => void
}

let settingsWindow: Astal.Window | undefined


export function openSettings(gdkmonitor: Gdk.Monitor) {
    if(!settingsWindow)
        return

    settingsWindow.hide()
    settingsWindow.gdkmonitor = gdkmonitor
    settingsWindow.present()
}

function closeSettings() {
    settingsWindow?.hide()
}

function SettingRow({ title, description, control }: SettingRowProps) {
    return (
        <box class="settings-row" spacing={16}>
            <box hexpand orientation={VERTICAL}>
                <label class="settings-row-label" xalign={0} label={title}/>
                <label class="settings-description" xalign={0} wrap label={description}/>
            </box>
            {control}
        </box>
    )
}

function NumberControl({ value, min, max, step, digits = 0, onChange }: NumberControlProps) {
    const control = Gtk.SpinButton.new_with_range(min, max, step)
    const sync = () => {
        if(control.value !== value.peek())
            control.value = value.peek()
    }

    control.add_css_class("settings-control")
    control.digits = digits
    control.numeric = true
    control.widthChars = 6

    sync()

    const changed = control.connect("value-changed", () => onChange(control.value))
    const dispose = value.subscribe(sync)
    onCleanup(() => {
        control.disconnect(changed)
        dispose()
    })

    return control
}

function ChoiceControl<T extends string>({ value, options, onChange }: ChoiceControlProps<T>) {
    const control = Gtk.DropDown.new_from_strings(options.map(([, label]) => label))
    const sync = () => control.selected = Math.max(0,
        options.findIndex(([option]) => option === value.peek()))

    control.add_css_class("settings-control")

    sync()

    const changed = control.connect("notify::selected", () => {
        const selected = options[control.selected]?.[0]
        if(selected !== undefined && selected !== value.peek())
            onChange(selected)
    })

    const dispose = value.subscribe(sync)

    onCleanup(() => {
        control.disconnect(changed)
        dispose()
    })

    return control
}

function FormatControl({ name }: { name: "dateFormat" | "timeFormat" }) {
    const value = setting(name)

    return (
        <entry class="settings-control settings-format" widthChars={16} text={value}
            onNotifyText={entry => {
                if(entry.text !== settings.peek()[name])
                    setSetting(name, entry.text)
            }}/>
    )
}

export default function SettingsOSD() {
    const now = createPoll(new Date(), 1_000, () => new Date())
    const dateFormat = setting("dateFormat")
    const timeFormat = setting("timeFormat")
    const cpuPollInterval = setting("cpuPollInterval")(value => value / 1_000)
    const ramPollInterval = setting("ramPollInterval")(value => value / 1_000)
    const className = setting("theme")(theme => `SettingsOSD ${getTheme(theme).className}`)
    const previewDate = createComputed(() => formatDateTime(now(), dateFormat()))
    const previewTime = createComputed(() => formatDateTime(now(), timeFormat()))

    return (
        <window $={self => { settingsWindow = self }}
            name={WINDOW_NAME} class={className} namespace={WINDOW_NAME} visible={false}
            application={app} layer={Astal.Layer.OVERLAY} keymode={Astal.Keymode.ON_DEMAND}
            exclusivity={Astal.Exclusivity.IGNORE} hideOnClose resizable={false}>
            <Gtk.EventControllerKey onKeyPressed={(_controller, keyval) => {
                if(keyval !== Gdk.KEY_Escape)
                    return false

                closeSettings()
                return true
            }}/>

            <box class="settings-panel" widthRequest={820}
                orientation={VERTICAL} spacing={18}>
                <box class="settings-header" spacing={12}>
                    <box hexpand orientation={VERTICAL}>
                        <label class="settings-title" xalign={0} label="Bar settings"/>
                        <label class="settings-description" xalign={0}
                            label="Changes are previewed and saved automatically."/>
                    </box>
                    <button class="settings-close settings-close-icon" tooltipText="Close"
                        onClicked={closeSettings}>
                        <label label="×"/>
                    </button>
                </box>

                <box class="settings-preview" orientation={VERTICAL}>
                    <label class="settings-preview-date" xalign={0} label={previewDate}/>
                    <label class="settings-preview-clock" xalign={0} label={previewTime}/>
                </box>

                <box class="settings-grid" spacing={24}>
                    <box class="settings-column" hexpand orientation={VERTICAL} spacing={10}>

                        <label class="settings-section-title" xalign={0} label="Appearance"/>

                        <SettingRow title="Theme" description="Colour palette and accent"
                            control={<ChoiceControl value={setting("theme")}
                                options={themes} onChange={value => setSetting("theme", value)}/>}/>

                        <SettingRow title="Bar font size" description="Base size in pixels"
                            control={<NumberControl value={setting("barFontSize")}
                                min={9} max={24} step={0.5} digits={1}
                                onChange={value => setSetting("barFontSize", value)}/>}/>

                        <SettingRow title="Apps animation" description="Open, close and move preset"
                            control={<ChoiceControl value={setting("clientAnimation")}
                                options={animations}
                                onChange={value => setSetting("clientAnimation", value)}/>}/>

                        <label class="settings-section-title" xalign={0} label="Clock"/>

                        <SettingRow title="Date format"
                            description="YYYY, MMM, MM, DD and ddd; [text] stays literal"
                            control={<FormatControl name="dateFormat"/>}/>

                        <SettingRow title="Time format"
                            description="HH or hh, mm, ss and A; [text] stays literal"
                            control={<FormatControl name="timeFormat"/>}/>
                    </box>

                    <box class="settings-column" hexpand orientation={VERTICAL} spacing={10}>

                        <label class="settings-section-title" xalign={0} label="Monitoring"/>

                        <SettingRow title="CPU refresh" description="Seconds between samples"
                            control={<NumberControl value={cpuPollInterval}
                                min={0.25} max={60} step={0.25} digits={2}
                                onChange={value => setSetting("cpuPollInterval", value * 1_000)}/>}/>

                        <SettingRow title="RAM refresh" description="Seconds between samples"
                            control={<NumberControl value={ramPollInterval}
                                min={0.25} max={60} step={0.25} digits={2}
                                onChange={value => setSetting("ramPollInterval", value * 1_000)}/>}/>

                        <SettingRow title="CPU width" description="Reserved value characters"
                            control={<NumberControl value={setting("cpuValueChars")}
                                min={2} max={10} step={1}
                                onChange={value => setSetting("cpuValueChars", value)}/>}/>

                        <SettingRow title="RAM width" description="Reserved value characters"
                            control={<NumberControl value={setting("memoryValueChars")}
                                min={2} max={10} step={1}
                                onChange={value => setSetting("memoryValueChars", value)}/>}/>
                    </box>
                </box>

                <box class="settings-actions" halign={END} spacing={8}>
                    <button class="settings-reset" onClicked={resetSettings}>
                        <label label="Reset defaults"/>
                    </button>
                </box>
            </box>
        </window>
    )
}