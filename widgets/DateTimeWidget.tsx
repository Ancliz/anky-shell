import { Gtk } from "ags/gtk4"
import { createMemo, createState, onCleanup } from "ags"

const baseTimeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
} satisfies Intl.DateTimeFormatOptions

const formatters = {
    shortTime: new Intl.DateTimeFormat(
        undefined,
        baseTimeOptions,
    ),

    longTime: new Intl.DateTimeFormat(undefined, {
        ...baseTimeOptions,
        second: "2-digit",
    }),

    date: new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
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

    let timer: ReturnType<typeof setTimeout> | undefined

    function stopTimer() {
        if(timer !== undefined) {
            clearTimeout(timer)
            timer = undefined
        }
    }

    function tick() {
        const current = new Date()
        const interval = calendarOpen.peek() ? 1_000 : 60_000

        // Align to the next exact second or minute boundary
        const delay = interval - (current.getTime() % interval)

        // Schedule before notifying reactive subscribers
        timer = setTimeout(tick, delay)
        setNow(current)
    }

    function restartTimer() {
        stopTimer()
        tick()
    }

    const unsubscribe = calendarOpen.subscribe(restartTimer)

    onCleanup(() => {
        unsubscribe()
        stopTimer()
    })

    restartTimer()

    /*
     * shortTime only changes once per minute, even while `now`
     * updates every second with the popover open
     */
    const shortTime = createMemo(() => formatters.shortTime.format(now()))
    const date = createMemo(() => formatters.date.format(now()))
    const longDate = createMemo(() => formatLongDate(now()))
    /*
     * When closed, this does not even read `now()`, so it stops
     * depending on the per-second value
     */
    const longTime = createMemo(() => calendarOpen() ? formatters.longTime.format(now()) : "")

    return (
        <menubutton class="date-button" $type="end" halign={Gtk.Align.CENTER}>
            <box class="date-content" orientation={Gtk.Orientation.VERTICAL}>
                <label class="date-label" label={date}/>
                <label class="time-label" label={shortTime}/>
            </box>
            <popover
                onNotifyVisible={(self) => setCalendarOpen(self.visible)}>
                <box orientation={Gtk.Orientation.VERTICAL} spacing={3}>
                    <label label={longDate}/>
                    <label label={longTime}/>
                    <Gtk.Calendar/>
                </box>
            </popover>
        </menubutton>
    )
}