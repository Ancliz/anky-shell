import { createState, For, Node } from "ags"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import app from "ags/gtk4/app"
import Apps from "gi://AstalApps"
import { CENTER, HORIZONTAL, VERTICAL } from "../../util/gtkutil"
const WINDOW_NAME = "app-launcher"
const apps = new Apps.Apps()

let applauncher: Astal.Window | undefined
let entryElement: Gtk.Entry
let iconSize = 120

const gdkmonitor = app.get_monitors()[1]
const geometry = gdkmonitor.get_geometry()
const width = Math.round(geometry.width * 0.5)
const height = Math.round(geometry.height * 0.75)
const [query, setQuery] = createState("")
const results = query((q) => apps.fuzzy_query(q))

const rows = results((apps) => {
    const margin = 50;
    const perRow = Math.floor(width / (iconSize + margin))
    const result: Apps.Application[][] = []
    for(let i = 0; i < apps.length; i += perRow) {
        result.push(apps.slice(i, i + perRow))
    }
    return result
})

function launch(app: Apps.Application) {
    app.launch()
    applauncher?.hide()
}

export default function AppLauncher() {
    return ( 
        <window name={WINDOW_NAME} $={self => { applauncher = self }}
            application={app}
            namespace={WINDOW_NAME}
            gdkmonitor={gdkmonitor}
            defaultWidth={width}
            defaultHeight={height}
            visible={false}
            layer={Astal.Layer.OVERLAY}
            keymode={Astal.Keymode.ON_DEMAND}
            resizable={false}
            class="applauncher-window"
            hideOnClose
            onNotifyVisible={self => {
                if(self.visible)
                    entryElement?.set_text("")
            }}
            onShow={() => entryElement.grab_focus()}>

            <Gtk.EventControllerKey propagationPhase={Gtk.PropagationPhase.CAPTURE}
                onKeyPressed={(_controller, keyval) => {
                    if(keyval === Gdk.KEY_Escape) {
                        applauncher?.hide()
                        return true
                    } else if(keyval === Gdk.KEY_Return) {
                        launch(rows()?.[0]?.[0])
                        return true
                    }
                    return false
            }}/>

            <box widthRequest={width} heightRequest={height} orientation={VERTICAL}>
                <entry $={self => entryElement = self} class="entry" halign={CENTER}
                    onNotifyText={({ text }) => setQuery(text)}
                />

                <box class="applauncher" widthRequest={width} heightRequest={height} orientation={VERTICAL}>

                    <Gtk.ScrolledWindow hexpand vexpand
                        vscrollbarPolicy={Gtk.PolicyType.EXTERNAL}
                        hscrollbarPolicy={Gtk.PolicyType.NEVER}>

                        <box orientation={VERTICAL} halign={Gtk.Align.FILL}>
                            <For each={rows}>
                                { row => (
                                    <box orientation={HORIZONTAL} halign={Gtk.Align.FILL}>
                                        {row.map(app => (
                                                <box orientation={VERTICAL}class="launcher-app-box">
                                                    <button
                                                        widthRequest={iconSize}
                                                        heightRequest={iconSize}
                                                        onClicked={() => launch(app)}>
                                                        <image iconName={app.get_icon_name()}
                                                            pixelSize={iconSize}
                                                            tooltipText={app.get_name()}
                                                        />
                                                    </button>
                                                </box>
                                            ))}
                                    </box>
                                )}
                            </For>
                        </box>
                    </Gtk.ScrolledWindow>
                </box>
            </box>
        </window>
    )
}