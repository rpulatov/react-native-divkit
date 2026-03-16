/**
 * Maps DivKit content_alignment_horizontal to React Native flex alignment.
 * Analogous to web's correctImagePosition utility.
 */
export function alignHToFlex(align: string): 'flex-start' | 'center' | 'flex-end' {
    switch (align) {
        case 'left':
        case 'start': return 'flex-start';
        case 'right':
        case 'end': return 'flex-end';
        default: return 'center';
    }
}

/**
 * Maps DivKit content_alignment_vertical to React Native flex alignment.
 */
export function alignVToFlex(align: string): 'flex-start' | 'center' | 'flex-end' {
    switch (align) {
        case 'top': return 'flex-start';
        case 'bottom': return 'flex-end';
        default: return 'center';
    }
}
