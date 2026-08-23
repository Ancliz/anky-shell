import { createBinding, createEffect, createMemo, With } from "ags"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import app from "ags/gtk4/app"
import Mpris from "gi://AstalMpris"
import { playback as icons } from "../util/icons"
import GdkPixbuf from "gi://GdkPixbuf"
import { VolumeSlider } from "../widgets/audio"
import { clamp } from "../util/util"
import { getClientByClass, toggleClient } from "../util/hyprutil"
import { CENTER, HORIZONTAL, START, VERTICAL } from "../util/gtkutil"

const WINDOW_NAME = "media-player-overlay"
const spotify = Mpris.Player.new("org.mpris.MediaPlayer2.spotify")
const available = createBinding(spotify, "available")
const title = createBinding(spotify, "title")
const artist = createBinding(spotify, "artist")
const coverArtBinding = createBinding(spotify, "cover_art")
const playbackStatus = createBinding(spotify, "playbackStatus")
const playerClient = getClientByClass("Spotify");

const icon = playbackStatus.as(status =>
    status === Mpris.PlaybackStatus.PLAYING ? icons["pause"] : icons["play"]
)

function MediaPlayer({ artSize }: { artSize?: number }) {
    return (
        <With value={available}>
                {ready => ready && (
                    <box orientation={VERTICAL}>
                        <box orientation={HORIZONTAL}>

                            <button onClicked={() => toggleClient(playerClient)}>
                                <CoverArt size={artSize ?? 128}/>
                            </button>

                            <box orientation={VERTICAL}>
                                <box class="song-details" orientation={VERTICAL}>
                                    <label class="song-title" halign={START} label={title}/>
                                    <label class="song-artist" halign={START} label={artist}/>
                                </box>

                                <ProgressBar/>

                                <box class="media-controls" halign={CENTER} >
                                    <button onClicked={() => spotify.previous()}>
                                        <label label={icons["skip-previous-outline"]}/>
                                    </button>
                                    <button onClicked={() => spotify.play_pause()}>
                                        <label label={icon}/>
                                    </button>
                                    <button onClicked={() => spotify.next()}>
                                        <label label={icons["skip-next-outline"]}/>
                                    </button>
                                </box>
                            </box>
                        </box>
                    </box>
                )}
        </With>
    )
}

export function MediaPlayerVolumeSection() {
    return (
        <box class="media-player-audio-menu">
            <With value={available}>
                {ready => ready && (
                    <box orientation={VERTICAL}>
                        <box orientation={HORIZONTAL}>
                            <box class="media-player-track-row" hexpand spacing={4}>
                                <label class="song-artist" label={artist}/>
                                <label label="-"/>
                                <label class="song-title" label={title}/>
                            </box>
                        </box>
                        <VolumeSlider node={spotify}/>
                    </box>
                )}
            </With>
        </box>
    )
}

export function MediaPlayerDocked() {
    return (
        <box class="media-player-docked">
            <MediaPlayer artSize={128}/>
        </box>
    )
}

export default function MediaPlayerOverlay() {
    return (
        <window name={WINDOW_NAME} namespace={WINDOW_NAME} application={app} layer={Astal.Layer.OVERLAY}
          keymode={Astal.Keymode.NONE} exclusivity={Astal.Exclusivity.IGNORE}
           defaultHeight={100} defaultWidth={400} resizable={false}>
            <MediaPlayer/>
        </window>
    )
}

function CoverArt({ size }: { size: number }) {
    const picture = new Gtk.Picture({
        content_fit: Gtk.ContentFit.SCALE_DOWN,
        css_classes: ["cover-art"]
    })

    createEffect(() => {
        const path = coverArtBinding()

        if(!path)
            return

        try {
            const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, size, size, true)
            picture.set_paintable(Gdk.Texture.new_for_pixbuf(pixbuf))
        } catch(error) {
            console.error(`Failed to load cover art: ${path}`, error)
            picture.set_paintable(null)
        }
    })

    return picture
}

function ProgressBar() {
    const position = createBinding(spotify, "position")
    const duration = createBinding(spotify, "length")
    const progress = createMemo(() => {
        const p = position()
        const l = duration()
        return p >= 0 && l > 0
            ? clamp(p / l, 0, 1)
            : 0
    })

    return (
        <slider class="media-player-progress"
            hexpand
            min={0}
            value={progress()}
        />
    )
}