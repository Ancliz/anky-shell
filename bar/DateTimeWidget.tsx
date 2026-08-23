import { Gtk } from "ags/gtk4"
import { createMemo, createState, onCleanup } from "ags"

import { setting } from "../config/settings"
import { formatDate, hasSeconds, formatTime } from "../util/dateFormat"
import { CENTER, VERTICAL } from "../util/gtkutil"

const dateFormat = setting("dateFormat")
const timeFormat = setting("timeFormat")

const baseTimeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
} satisfies Intl.DateTimeFormatOptions

const formatters = {
    longTime: new Intl.DateTimeFormat(undefined, {
        ...baseTimeOptions,
        second: "2-digit",
    }),

    longDate: new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
    }),
}

function formatLongDate(date: Date): string {
    return formatters.longDate
        .formatToParts(date)
        .filter((part) => part.type !== "literal")
        .map((part) => part.value)
        .join(" ")
}

export default function DateTimeWidget() {
    const [calendarOpen, setCalendarOpen] = createState(false)
    const [now, setNow] = createState(new Date())
    const tickEverySecond = createMemo(() =>
        calendarOpen() || hasSeconds(timeFormat())
    )

    let timer: ReturnType<typeof setTimeout> | undefined
    let interval = 0

    function stopTimer() {
        if(timer !== undefined) {
            clearTimeout(timer)
            timer = undefined
        }
    }

    function tick() {
        const current = new Date()

        // Align to the next exact second or minute boundary
        const delay = interval - (current.getTime() % interval)

        // Schedule before notifying reactive subscribers
        timer = setTimeout(tick, delay)
        setNow(current)
    }

    function restartTimer(force = false) {
        const next = tickEverySecond.peek() ? 1_000 : 60_000
        if(!force && next === interval)
            return

        interval = next
        stopTimer()
        tick()
    }

    const unsubscribe = tickEverySecond.subscribe(restartTimer)

    onCleanup(() => {
        unsubscribe()
        stopTimer()
    })

    restartTimer(true)

    const shortTime = createMemo(() => formatTime(now(), timeFormat()))
    const date = createMemo(() => formatDate(now(), dateFormat()))
    const longDate = createMemo(() => formatLongDate(now()))
    /*
     * When closed, this does not even read `now()`, so it stops
     * depending on the per-second value
     */
    const longTime = createMemo(() => calendarOpen() ? formatters.longTime.format(now()) : "")

    return (
        <menubutton class="date-button" $type="end" halign={CENTER}>
            <box class="date-content" orientation={VERTICAL}>
                <label class="date-label" label={date}/>
                <label class="time-label" label={shortTime}/>
            </box>
            <popover
                onNotifyVisible={(self) => setCalendarOpen(self.visible)}>
                <box orientation={VERTICAL} spacing={3}>
                    <label label={longDate}/>
                    <label label={longTime}/>
                    <Gtk.Calendar/>
                </box>
            </popover>
        </menubutton>
    )
}
