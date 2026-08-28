export function handleClick(
        gesture: { get_current_button: () => number },
        handlers: { left?: () => void, middle?: () => void, right?: () => void}) {

    switch(gesture.get_current_button()) {
        case 1: handlers.left?.();   break
        case 2: handlers.middle?.(); break
        case 3: handlers.right?.();  break
    }
}

export function groupBy<T, K extends PropertyKey>(array: T[], callback: (item: T) => K): Map<K, T[]> {
    const map = new Map<K, T[]>()

    for(const item of array) {
        const key = callback(item)

        if(!map.has(key))
            map.set(key, [])

        map.get(key)!.push(item)
    }
    return map
}

export function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    const chunkSize = Math.max(1, Math.floor(size))

    for(let i = 0; i < array.length; i += chunkSize)
        chunks.push(array.slice(i, i + chunkSize))

    return chunks
}

export function clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
}

export type Timeout = ReturnType<typeof setTimeout>
export type TimeoutSlot = PropertyKey

export function createTimeoutScope() {
    const timers = new Set<Timeout>()
    const slots = new Map<TimeoutSlot, Timeout>()

    function forget(timer: Timeout) {
        timers.delete(timer)

        for(const [slot, current] of slots) {
            if(current === timer)
                slots.delete(slot)
        }
    }

    function schedule(callback: () => void, delay = 0) {
        const timer = setTimeout(() => {
            forget(timer)
            callback()
        }, delay)

        timers.add(timer)
        return timer
    }

    function cancel(timer?: Timeout) {
        if(timer === undefined)
            return

        clearTimeout(timer)
        forget(timer)
    }

    function replace(slot: TimeoutSlot, callback: () => void, delay = 0) {
        cancel(slots.get(slot))

        const timer = schedule(callback, delay)
        slots.set(slot, timer)
        return timer
    }

    function cancelAll() {
        timers.forEach(clearTimeout)
        timers.clear()
        slots.clear()
    }

    return { schedule, replace, cancel, cancelAll }
}