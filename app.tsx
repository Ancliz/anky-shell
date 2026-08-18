import app from "ags/gtk4/app"

import { initStyles } from "./config/styleManager"
import Bar from "./widgets/Bar"

app.start({
    main() {
        initStyles()
        app.get_monitors().forEach(Bar)
    },
})
