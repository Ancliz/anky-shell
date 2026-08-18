export type Theme = {
    label: string
    className: string
}

export const THEMES = {
    "mocha-mauve": {
        label: "Mocha Mauve",
        className: "theme-mocha-mauve"
    },
    "mocha-lavender": {
        label: "Mocha Lavender",
        className: "theme-mocha-lavender"
    }
} as const satisfies Record<string, Theme>

export type ThemeName = keyof typeof THEMES

export function getTheme(name: string): Theme {
    return THEMES[name as ThemeName] ?? THEMES["mocha-mauve"]
}