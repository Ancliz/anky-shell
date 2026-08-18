import app from "ags/gtk4/app"

import { initStyles } from "./config/styleManager"
import SettingsOSD from "./osd/settings/SettingsOSD"
import Bar from "./widgets/Bar"

app.start({
    main() {
        initStyles()
        SettingsOSD()
        app.get_monitors().forEach(Bar)
    },
})
