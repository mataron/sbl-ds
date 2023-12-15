import { PropertySet } from "../common/siebel";

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

export function xmlify(p: PropertySet): string {
    let tag = (p.__type || 'PropertySet').replace(/ /g, '_spc');

    const attributes = Object.keys(p)
        .filter(k => k != '__type' && k != '__children')
        .map(k => `${k}="${xmlEscape(p[k])}"`)
        .join(' ');
    
    if (!attributes) {
        return `<${tag} ${attributes} />`;
    }
    
    const contents = (p.__children || [])
        .map(ch => xmlify(ch))
        .map(text => text.split('\n').map(ln => `\t${ln}`).join('\n'))
        .join('\n');
    
    return `<${tag} ${attributes}>\n${contents}\n</${tag}>\n`;
}
