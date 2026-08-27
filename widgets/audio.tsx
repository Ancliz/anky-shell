import { createBinding, onCleanup } from "ags"
import { Astal, Gtk } from "ags/gtk4"
import Wp from "gi://AstalWp"
import Mpris from "gi://AstalMpris"
import { START } from "../util/gtkutil"
import { createTimeoutScope } from "../util/util"

export const VOLUME_MULTIPLIER = 1.5
export const MAX_VOLUME_DISPLAY = 1

export function VolumeSlider({ node }: { node: Wp.Node | Mpris.Player }) {
    const level = createBinding(node, "volume")(volume => volume / VOLUME_MULTIPLIER)
    let slider: Astal.Slider
    let label: Gtk.Inscription | undefined
    let timer = createTimeoutScope()

    onCleanup(timer.cancelAll)

    function positionLabel() {
        if(!label)
            return true

        label.text = `${Math.round(slider.value * 100)}`
        const labelWidth = label.get_width()
        const trough = slider.get_range_rect()

        if(!labelWidth || !trough.width)
            return true

        const end = trough.x + slider.value / slider.max * trough.width
        label.marginStart = Math.min(end + 4, trough.x + trough.width - labelWidth)

        return false
    }

    function adjustVolume(slider: Astal.Slider, value: number) {
        slider.add_css_class("adjust-volume")
        timer.cancelAll()
        timer.schedule(() => { slider.remove_css_class("adjust-volume") }, 150)
        node.set_volume(value * VOLUME_MULTIPLIER)
        return false
    }

    return (
        <overlay class="volume-slider-container">
            <slider
                $={(self) => { slider = self }}
                class="volume-slider"
                hexpand
                min={0}
                max={MAX_VOLUME_DISPLAY}
                step={0.01}
                value={level}
                onValueChanged={positionLabel}
                onChangeValue={(slider, _type, value) => adjustVolume(slider, value)}
            />
            <Gtk.Inscription
                $={(self) => { label = self }}
                $type="overlay"
                class="volume-label"
                canTarget={false}
                halign={START}
                onMap={self => self.add_tick_callback(positionLabel)}
            />
        </overlay>
    )
}