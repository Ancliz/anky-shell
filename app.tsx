import app from "ags/gtk4/app"

import { initStyles } from "./config/styleManager"
import SettingsOSD from "./osd/settings/Settings"
import Bar from "./bar/Bar"
import AppLauncher from "./osd/applauncher/AppLauncher"

app.start({
    main() {
        initStyles()
        SettingsOSD()
        AppLauncher()
        app.get_monitors().forEach(Bar)
    }
})