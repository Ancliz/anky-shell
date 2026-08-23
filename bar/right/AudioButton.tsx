import Wp from "gi://AstalWp"
import { Gtk } from "ags/gtk4"
import {
    type Accessor,
    createBinding,
    createComputed,
    createMemo,
    createState,
    For,
    With,
} from "ags"
import { execAsync } from "ags/process"
import { audio as icons } from "../../util/icons"
import { handleClick } from "../../util/util"
import { MediaPlayerVolumeSection } from "../../osd/MediaPlayer"
import { VOLUME_MULTIPLIER, VolumeSlider } from "../../widgets/audio"


const wp = Wp.get_default()!
const audio = wp.audio
const POPOVER_WIDTH = 480

// Output devices

const defaultSpeaker = createBinding(audio, "defaultSpeaker")
.as((speaker): Wp.Endpoint | null => speaker ?? null)

const speakers = createBinding(audio, "speakers")
    .as((items): Wp.Endpoint[] => items ?? [])

const otherSpeakers = createComputed<Wp.Endpoint[]>(() => {
    const current = defaultSpeaker()

    return speakers().filter(speaker => speaker.id !== current?.id)
})


// Input devices

const defaultMicrophone = createBinding(audio, "defaultMicrophone")
    .as((microphone): Wp.Endpoint | null => microphone ?? null)

const microphones = createBinding(audio, "microphones")
    .as((items): Wp.Endpoint[] => items ?? [])

const otherMicrophones = createComputed<Wp.Endpoint[]>(() => {
    const current = defaultMicrophone()

    return microphones().filter(microphone =>
        microphone.id !== current?.id
    )
})


// Default output volume

const volume = createBinding(audio, "defaultSpeaker", "volume")
const mute = createBinding(audio, "defaultSpeaker", "mute")
const outputLevel = volume(v => Math.round((v / VOLUME_MULTIPLIER) * 100))

const icon = createMemo(() => {
    if(mute())
        return icons["volume-mute"]

    const vol = volume()

    if(vol == null || vol <= 0) return icons["volume-off"]
    if(vol < 1 / 3)             return icons["volume-low"]
    if(vol < 2 / 3)             return icons["volume-medium"]

    return icons["volume-high"]
})


// Application streams

const streams = createBinding(audio, "streams")
    .as((items): Wp.Stream[] => items ?? [])

const hasStreams = streams(items => items.length > 0)

function isSpotify(stream: Wp.Stream) {
    return stream.get_pw_property("application.name") === "Spotify"
}

const musicStream = createMemo<Wp.Stream | null>(() =>
    streams().find(isSpotify) ?? null
)

const otherStreams = createComputed<Wp.Stream[]>(() =>
    streams().filter(stream => !isSpotify(stream))
)


function toggleMute() {
    const speaker = audio.defaultSpeaker
    speaker.set_mute(!speaker.mute)
}

function changeDefaultVolume(delta: number) {
    const speaker = audio.defaultSpeaker
    speaker.set_volume(speaker.volume + delta)
}

function openPAV() {
    void execAsync("pavucontrol")
}


type Disclosure = {
    expanded: Accessor<boolean>
    iconName: Accessor<string>
    toggle: () => void
    collapse: () => void
}

function createDisclosure(): Disclosure {
    const [expanded, setExpanded] = createState(false)
    const iconName = expanded(open => `pan-${open ? "down" : "end"}-symbolic`)
    return {
        expanded,
        iconName,
        toggle: () => setExpanded(open => !open),
        collapse: () => setExpanded(false),
    }
}


export default function AudioButton({ class: className = "" }) {
    const outputs = createDisclosure()
    const applications = createDisclosure()
    const inputs = createDisclosure()

    function collapseAll() {
        outputs.collapse()
        applications.collapse()
        inputs.collapse()
    }

    return (
        <menubutton class={className}>
            <Gtk.GestureClick
                button={0}
                onPressed={ gesture =>
                    handleClick(gesture, {
                        right: toggleMute,
                        middle: openPAV,
                    })
                }
            />

            <Gtk.EventControllerScroll
                flags={Gtk.EventControllerScrollFlags.VERTICAL}
                onScroll={(_controller, _dx, dy) => {
                    changeDefaultVolume(-dy * 0.01)
                    return true
                }}
            />

            <label class="icon" label={icon} tooltipText={outputLevel(v => `${v}%`)}/>

            <popover class="audio-popover" onClosed={collapseAll}>
                <box widthRequest={POPOVER_WIDTH} orientation={Gtk.Orientation.VERTICAL}>
                    <DeviceSection
                        title="Output device"
                        selected={defaultSpeaker}
                        others={otherSpeakers}
                        emptyLabel="No output device"
                        disclosure={outputs}
                    />

                    <VolumeSection
                        visible={hasStreams}
                        title="Applications"
                        pinned={musicStream}
                        others={otherStreams}
                        disclosure={applications}
                    />

                    <DeviceSection
                        title="Input device"
                        selected={defaultMicrophone}
                        others={otherMicrophones}
                        emptyLabel="No input device"
                        disclosure={inputs}
                    />
                </box>
            </popover>
        </menubutton>
    )
}


type DeviceSectionProps = {
    title: string
    selected: Accessor<Wp.Endpoint | null>
    others: Accessor<Wp.Endpoint[]>
    emptyLabel: string
    disclosure: Disclosure
}

function DeviceSection({ title, selected, others, emptyLabel, disclosure }: DeviceSectionProps) {
    const hasOthers = others(items => items.length > 0)

    function selectDevice(endpoint: Wp.Endpoint) {
        endpoint.set_is_default(true)
        disclosure.collapse()
    }

    return (
        <box class="audio-section" orientation={Gtk.Orientation.VERTICAL}>

            <SectionDisclosureButton label={title} hasOptions={hasOthers} disclosure={disclosure}/>

            <With value={selected}>
                { endpoint => endpoint
                    ? <SelectedVolumeRow node={endpoint}/>
                    : <AudioLabelRow label={emptyLabel}/>
                }
            </With>

            <Gtk.Revealer revealChild={disclosure.expanded} transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}>
                <box class="audio-dropdown" orientation={Gtk.Orientation.VERTICAL}>
                    <For each={others}>
                        {endpoint => <DeviceChoice endpoint={endpoint} onSelect={selectDevice}/>}
                    </For>
                </box>
            </Gtk.Revealer>
        </box>
    )
}


type DeviceChoiceProps = {
    endpoint: Wp.Endpoint
    onSelect: (endpoint: Wp.Endpoint) => void
}

function DeviceChoice({ endpoint, onSelect }: DeviceChoiceProps) {
    const label = createNodeLabel(endpoint, "Device")

    return (
        <button class="device-option" onClicked={() => onSelect(endpoint)}>
            <Gtk.Inscription
                hexpand
                minChars={0}
                textOverflow={Gtk.InscriptionOverflow.ELLIPSIZE_END}
                tooltipText={label}
                text={label}
            />
        </button>
    )
}


type VolumeSectionProps<T extends Wp.Node> = {
    visible: Accessor<boolean>
    title: string
    pinned: Accessor<T | null>
    others: Accessor<T[]>
    disclosure: Disclosure
}

function VolumeSection<T extends Wp.Node>({ visible, title, pinned, others, disclosure }: VolumeSectionProps<T>) {
    const hasOthers = others(items => items.length > 0)

    return (
        <box class="audio-section" visible={visible} orientation={Gtk.Orientation.VERTICAL}>

            <box orientation={Gtk.Orientation.VERTICAL}>
                <label class="audio-section-title" label="Media"/>
                <MediaPlayerVolumeSection/>
                <SectionDisclosureButton label={title} hasOptions={hasOthers} disclosure={disclosure}/>
            </box>

            <Gtk.Revealer revealChild={disclosure.expanded} transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}>
                <box class="audio-dropdown" orientation={Gtk.Orientation.VERTICAL}>
                    <For each={others}>
                        {node => <VolumeRow node={node}/>}
                    </For>
                </box>
            </Gtk.Revealer>
        </box>
    )
}


type SectionDisclosureButtonProps = {
    label: string
    hasOptions: Accessor<boolean>
    disclosure: Disclosure
}

function SectionDisclosureButton({ label, hasOptions, disclosure }: SectionDisclosureButtonProps) {
    return (
        <button class="audio-section-title-button" hexpand sensitive={hasOptions}
            onClicked={disclosure.toggle}>
            <overlay hexpand>
                <label class="audio-section-title" label={label}/>
                <image $type="overlay" visible={hasOptions} halign={Gtk.Align.END}
                    valign={Gtk.Align.CENTER} iconName={disclosure.iconName}/>
            </overlay>
        </button>
    )
}

function AudioLabelRow({ label }: { label: string | Accessor<string> }) {
    return (
        <box class="audio-disclosure-row" hexpand>
            <Gtk.Inscription hexpand minChars={0}
                textOverflow={Gtk.InscriptionOverflow.ELLIPSIZE_END}
                tooltipText={label} text={label}/>
        </box>
    )
}

function createNodeLabel(node: Wp.Node, fallback: string) {
    const description = createBinding(node, "description")
    const name = createBinding(node, "name")
    return createComputed(() => `${description() ?? name() ?? fallback}`)
}

function SelectedVolumeRow({ node }: { node: Wp.Node }) {
    const label = createNodeLabel(node, "Node")

    return (
        <box class="audio-selected-row" hexpand orientation={Gtk.Orientation.VERTICAL} spacing={2}>
            <AudioLabelRow label={label}/>
            <VolumeSlider node={node}/>
        </box>
    )
}

function VolumeRow({ node }: { node: Wp.Node }) {
    const label = createNodeLabel(node, "Node")

    return (
        <box class="audio-volume-row" hexpand spacing={8}>
            <Gtk.Inscription
                hexpand
                minChars={0}
                textOverflow={Gtk.InscriptionOverflow.ELLIPSIZE_END}
                tooltipText={label}
                text={label}
            />

            <VolumeSlider node={node}/>
        </box>
    )
}