const pad = (value: number) => value.toString().padStart(2, "0")
const month = new Intl.DateTimeFormat(undefined, { month: "short" })
const longMonth = new Intl.DateTimeFormat(undefined, { month: "long" })
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" })
const longWeekday = new Intl.DateTimeFormat(undefined, { weekday: "long" })

const tokenPattern = /\[([^\]]*)\]|YYYY|MMMM|MMM|dddd|ddd|YY|MM|DD|HH|hh|mm|ss|M|D|H|h|m|s|A|a/g

export function formatDateTime(date: Date, pattern: string): string {
    const hours = date.getHours()
    const hour12 = hours % 12 || 12
    const tokens: Record<string, string> = {
        YYYY: date.getFullYear().toString(),
        YY: pad(date.getFullYear() % 100),
        MMMM: longMonth.format(date),
        MMM: month.format(date),
        MM: pad(date.getMonth() + 1),
        M: (date.getMonth() + 1).toString(),
        DD: pad(date.getDate()),
        D: date.getDate().toString(),
        dddd: longWeekday.format(date),
        ddd: weekday.format(date),
        HH: pad(hours),
        H: hours.toString(),
        hh: pad(hour12),
        h: hour12.toString(),
        mm: pad(date.getMinutes()),
        m: date.getMinutes().toString(),
        ss: pad(date.getSeconds()),
        s: date.getSeconds().toString(),
        A: hours < 12 ? "AM" : "PM",
        a: hours < 12 ? "am" : "pm",
    }

    return pattern.replace(tokenPattern, (token, literal: string | undefined) => literal ?? tokens[token])
}

export const formatDate = formatDateTime
export const formatTime = formatDateTime

export function hasSeconds(pattern: string): boolean {
    let hasSeconds = false
    pattern.replace(tokenPattern, (token, literal: string | undefined) => {
        if(literal === undefined && (token === "s" || token === "ss"))
            hasSeconds = true
        return token
    })
    return hasSeconds
}