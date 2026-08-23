export function handleClick(
        gesture: { get_current_button: () => number },
        handlers: { left?: () => void, middle?: () => void, right?: () => void}){

    switch(gesture.get_current_button()) {
        case 1: handlers.left?.(); break
        case 2: handlers.middle?.(); break
        case 3: handlers.right?.(); break
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

export function clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
}