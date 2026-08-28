import { Gtk } from "ags/gtk4";
import type { CCProps } from "ags"

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