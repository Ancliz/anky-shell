import { Accessor, createExternal } from "ags"

export function createDynamicPoll<T>(
    initial: T,
    interval: Accessor<number>,
    poll: (previous: T) => T | Promise<T>,
): Accessor<T> {
    let current = initial

    return createExternal(initial, set => {
        let timer: ReturnType<typeof setInterval> | undefined
        let delay = interval.peek()
        let active = true
        let polling = false

        function run() {
            if(polling)
                return

            polling = true
            Promise.resolve(poll(current)).then(value => {
                if(active) {
                    current = value
                    set(value)
                }
            }).catch(error => console.error("Polling failed:", error)).finally(() => polling = false)
        }

        function restart(force = false) {
            const next = interval.peek()
            if(!force && next === delay)
                return

            delay = next
            if(timer !== undefined)
                clearInterval(timer)

            run()
            timer = setInterval(run, delay)
        }

        const unsubscribe = interval.subscribe(restart)
        restart(true)

        return () => {
            active = false
            unsubscribe()
            if(timer !== undefined)
                clearInterval(timer)
        }
    })
}