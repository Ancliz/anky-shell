import type { Node } from "ags"

import { VERTICAL } from "../../../util/gtkutil"


export type SettingRowProps = {
    title: string
    description: string
    control: JSX.Element
}

export function SettingRow({ title, description, control }: SettingRowProps) {
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

export function SettingsSection({ title, children }: { title: string; children: Node }) {
    return (
        <box hexpand orientation={VERTICAL} spacing={10}>
            <label class="settings-section-title" xalign={0} label={title}/>
            {children}
        </box>
    )
}