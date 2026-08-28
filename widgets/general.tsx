import { Gtk } from "ags/gtk4";
import type { Accessor, CCProps } from "ags"


type EllipsisedTextProps = Omit<
    CCProps<Gtk.Inscription, Partial<Gtk.Inscription.ConstructorProps>>, "textOverflow" | "hexpand"
>

export function EllipsisedText({ text, tooltipText = text, ...props }: EllipsisedTextProps) {
    return (
        <Gtk.Inscription
            minChars={0}
            text={text}
            tooltipText={tooltipText}
            {...props}
            textOverflow={Gtk.InscriptionOverflow.ELLIPSIZE_END}
            hexpand
        />
    )
}


type SystemMetricProps = {
    icon: string,
    value: Accessor<string>,
    valueChars: Accessor<number>,
    tooltip: Accessor<string>,
    onClicked: () => void
}

export function SystemMetricButton({ icon, value, valueChars, tooltip, onClicked }: SystemMetricProps) {
    return (
        <button class="system-section" tooltipText={tooltip} onClicked={onClicked}>
            <box spacing={4}>
                <label class="icon" label={icon}/>
                <Gtk.Inscription
                    minChars={valueChars}
                    natChars={valueChars}
                    xalign={1}
                    text={value}
                />
            </box>
        </button>
    )
}