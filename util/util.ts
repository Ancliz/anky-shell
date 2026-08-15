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