
export function xmlEscape(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function toggleClass(el: HTMLElement, cls: string) {
    if (el.classList.contains(cls)) {
        el.classList.remove(cls);
    } else {
        el.classList.add(cls);
    }
}

export function humanReadableDuration(n: number) {
    return `${n || 0}ms`;
}
