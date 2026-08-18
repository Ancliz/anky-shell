export type TimingMode = "sequential" | "simultaneous"

export type ClientAnimationTiming = {
    iconTime: number
    revealTime: number
    timing: TimingMode
}

export type ClientAnimation = {
    label: string
    className: string
    open: ClientAnimationTiming
    close: ClientAnimationTiming
    move: ClientAnimationTiming
}

export const CLIENT_ANIMATIONS = {
    "grow-shake": {
        label: "Grow + shake",
        className: "client-animation-grow-shake",
        open:  { iconTime: 350, revealTime: 180, timing: "sequential"   },
        close: { iconTime: 350, revealTime: 180, timing: "sequential"   },
        move:  { iconTime: 200, revealTime: 110, timing: "simultaneous" },
    },
    none: {
        label: "None",
        className: "client-animation-none",
        open:  { iconTime: 0, revealTime: 0, timing: "simultaneous" },
        close: { iconTime: 0, revealTime: 0, timing: "simultaneous" },
        move:  { iconTime: 0, revealTime: 0, timing: "simultaneous" },
    }
} as const satisfies Record<string, ClientAnimation>

export type ClientAnimationName = keyof typeof CLIENT_ANIMATIONS

export function getClientAnimation(name: string): ClientAnimation {
    return CLIENT_ANIMATIONS[name as ClientAnimationName] ?? CLIENT_ANIMATIONS["grow-shake"]
}