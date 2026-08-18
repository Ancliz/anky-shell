import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"

import DateTimeWidget from "./DateTimeWidget"
import LeftSection from "./LeftSection"
import RightSection from "./right/RightSection"

export default function Bar(gdkmonitor: Gdk.Monitor) {
    const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

    return (
        <window visible name="bar" class="Bar" gdkmonitor={gdkmonitor} exclusivity={Astal.Exclusivity.EXCLUSIVE}
            anchor={TOP | LEFT | RIGHT} application={app}>

            <centerbox class="bar-layout">
                <box class="bar-pill bar-left" $type="start">
                    <LeftSection/>
                </box>

                <box class="bar-date" $type="center">
                    <DateTimeWidget/>
                </box>

                <box class="bar-pill bar-right" $type="end">
                    <RightSection/>
                </box>
            </centerbox>
        </window>
    )
}
