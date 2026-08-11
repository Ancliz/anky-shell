export function handleClick(gesture: { get_current_button: () => number },
                            handlers: {
                                left?: () => void
                                middle?: () => void
                                right?: () => void
                            }) {
    switch (gesture.get_current_button()) {
        case 1:
            handlers.left?.()
            break
        case 2:
            handlers.middle?.()
            break
        case 3:
            handlers.right?.()
            break
    }
}