import { onCleanup } from "ags"
import { monitorFile } from "ags/file"
import { exec } from "ags/process"
import Gdk from "gi://Gdk?version=4.0"
import GLib from "gi://GLib?version=2.0"
import Gtk from "gi://Gtk?version=4.0"

import { getClientAnimation } from "./bar/animations"
import { settings } from "./settings"


const STYLE_DIR = `${SRC}/styles`
const SOURCE_STYLE = `${STYLE_DIR}/bar.scss`
const GLOBAL_STYLE_DIR = `${SRC}/global/css`
const CACHE_DIR = GLib.build_filenamev([GLib.get_user_cache_dir(), "ags", "bar"])
const COMPILED_STYLE = `${CACHE_DIR}/bar.css`
const TEMP_STYLE = `${CACHE_DIR}/bar.tmp.css`
const LOCAL_SASS = `${SRC}/node_modules/.bin/sass`
const SASS = GLib.file_test(LOCAL_SASS, GLib.FileTest.EXISTS) ? LOCAL_SASS : "sass"
const RELOAD_DELAY = 100

let activeDispose: (() => void) | undefined


function validateStyle(path: string) {
    const provider = new Gtk.CssProvider()
    let errorMessage = ""

    provider.connect("parsing-error", (_provider, section, error) => {
        if(errorMessage)
            return

        const line = section.get_start_location().lines + 1
        const column = section.get_start_location().line_chars + 1
        errorMessage = `CSS Error ${path}:${line}:${column} ${error.message}`
    })

    try          { provider.load_from_path(path)                           }
    catch(error) { errorMessage ||= `Could not load CSS ${path}: ${error}` }

    if(errorMessage)
        console.error(errorMessage)

    return !errorMessage
}

function compileStyle() {
    GLib.mkdir_with_parents(CACHE_DIR, 0o755)
    GLib.unlink(TEMP_STYLE)

    try {
        exec([SASS, "--no-source-map", "--no-error-css", SOURCE_STYLE, TEMP_STYLE])
    } catch(error) {
        console.error(`Sass Error:\n${String(error).trim()}`)
        return false
    }

    if(!validateStyle(TEMP_STYLE))
        return false

    if(GLib.rename(TEMP_STYLE, COMPILED_STYLE) !== 0) {
        console.error(`Could not replace compiled CSS at ${COMPILED_STYLE}`)
        return false
    }

    return true
}

function runtimeCss() {
    const current = settings.peek()
    const animation = getClientAnimation(current.clientAnimation)

    return `
        window.Bar,
        window.SettingsOSD {
            --bar-font-size: ${current.barFontSize}px;
        }

        .apps-bar {
            --client-open-time: ${animation.open.iconTime}ms;
            --client-close-time: ${animation.close.iconTime}ms;
            --client-move-time: ${animation.move.iconTime}ms;
        }
    `
}

export function initStyles() {
    activeDispose?.()
    const display = Gdk.Display.get_default()

    if(!display)
        throw Error("Could not load styles without a display")

    const styleProvider = new Gtk.CssProvider()
    const runtimeProvider = new Gtk.CssProvider()
    const providers = [styleProvider, runtimeProvider]
    let runtimeStyle = runtimeCss()
    let reload = 0
    let disposed = false

    if(compileStyle() || GLib.file_test(COMPILED_STYLE, GLib.FileTest.IS_REGULAR))
        styleProvider.load_from_path(COMPILED_STYLE)

    runtimeProvider.load_from_string(runtimeStyle)
    providers.forEach(provider => Gtk.StyleContext.add_provider_for_display(
        display, provider, Gtk.STYLE_PROVIDER_PRIORITY_USER
    ))

    const queueReload = () => {
        if(reload)
            GLib.Source.remove(reload)

        reload = GLib.timeout_add(GLib.PRIORITY_DEFAULT, RELOAD_DELAY, () => {
            reload = 0
            if(compileStyle())
                styleProvider.load_from_path(COMPILED_STYLE)
            return GLib.SOURCE_REMOVE
        })
    }

    const styleMonitor = monitorFile(STYLE_DIR, path => {
        if(path.endsWith(".scss"))
            queueReload()
    })

    const globalMonitor = monitorFile(GLOBAL_STYLE_DIR, queueReload)

    const unsubscribe = settings.subscribe(() => {
        const nextRuntimeStyle = runtimeCss()
        if(nextRuntimeStyle !== runtimeStyle) {
            runtimeStyle = nextRuntimeStyle
            runtimeProvider.load_from_string(runtimeStyle)
        }
    })

    const dispose = () => {
        if(disposed)
            return

        disposed = true
        unsubscribe()
        styleMonitor.cancel()
        globalMonitor.cancel()
        if(reload)
            GLib.Source.remove(reload)
        providers.forEach(provider => Gtk.StyleContext.remove_provider_for_display(display, provider))
        if(activeDispose === dispose)
            activeDispose = undefined
    }

    activeDispose = dispose
    onCleanup(dispose)
    return dispose
}