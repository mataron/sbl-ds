import { PageApiInfo } from "../common/comms";
import { apiToStatusBarData } from "./action-data";
import { ALWAYS_MATCH, Filter } from "./filter";
import { toggleClass, xmlEscape } from "./tools";

export class DetailsController {
    private main = document.querySelector('#main') as HTMLDivElement;
    private details = document.querySelector('#details') as HTMLDivElement;
    private resizeHandle = document.querySelector('#resize') as HTMLDivElement;
    private hideDetailsBtn = document.querySelector('#hideDetailsBtn') as HTMLButtonElement;
    private detailsLabel = document.querySelector('#detailsLabel') as HTMLSpanElement;
    private requestHeader = document.querySelector('#requestHeader') as HTMLDivElement;
    private request = document.querySelector('#request') as HTMLDivElement;
    private responseHeader = document.querySelector('#responseHeader') as HTMLDivElement;
    private response = document.querySelector('#response') as HTMLDivElement;
    private requestFilterStr = document.querySelector('#requestFilterStr') as HTMLInputElement;
    private responseFilterStr = document.querySelector('#responseFilterStr') as HTMLInputElement;
    private copyRequestBtn = document.querySelector('#copyRequestBtn') as HTMLInputElement;
    private copyResponseBtn = document.querySelector('#copyResponseBtn') as HTMLInputElement;

    public item?: PageApiInfo;

    constructor() {
        this.hideDetailsBtn.onclick = () => this.deselectItem();
        this.requestHeader.onclick = () => this.togglePanel(this.requestHeader, this.request);
        this.responseHeader.onclick = () => this.togglePanel(this.responseHeader, this.response);
        this.requestFilterStr.oninput = () => this.refreshView();
        this.responseFilterStr.oninput = () => this.refreshView();
        this.requestFilterStr.onclick = (e) => e.stopPropagation();
        this.responseFilterStr.onclick = (e) => e.stopPropagation();
        this.copyRequestBtn.onclick = (e) => {
            e.stopPropagation();
            this.copyFromSelectedItem('request');
        }
        this.copyResponseBtn.onclick = (e) => {
            e.stopPropagation();
            this.copyFromSelectedItem('response');
        }
    }

    public selectItem(item: PageApiInfo): void {
        if (this.item && this.item.id == item.id) {
            this.deselectItem();
            return;
        }
        this.unmarkSelectedItems();
        this.item = item;

        this.details.style.display = 'flex';
        this.resizeHandle.style.display = 'block';

        const w = this.main.clientWidth + this.details.clientWidth;
        const dw = Math.ceil(Math.max(this.details.clientWidth, .4 * w));
        this.main.style.flexBasis = (w - dw) + "px";
        this.details.style.flexBasis = dw + 'px';

        const node = document.querySelector('#method' + item.id);
        if (node) {
            const n = node as HTMLElement;
            n.classList.add('selected');
        }

        this.refreshView();
    }

    public deselectItem(): void {
        this.unmarkSelectedItems();
        this.item = undefined;
        this.details.style.display = 'none';
        this.resizeHandle.style.display = 'none';
    }

    public refreshView(): void {
        if (!this.item) return;
        
        const data = apiToStatusBarData(this.item);
        this.detailsLabel.innerHTML = data.label;

        const requestFilter = new Filter(this.requestFilterStr.value);
        this.renderJSON(this.item.request, this.request, requestFilter);

        const responseFilter = new Filter(this.responseFilterStr.value);
        this.renderJSON(this.item.response, this.response, responseFilter);

        document.querySelectorAll('#details .panel .entry .name').forEach(node => {
            const el = node as HTMLElement;
            const parent = el.parentElement as HTMLElement;
            if (parent.classList.contains('long') || parent.classList.contains('array')) {
                el.addEventListener('click', () => toggleClass(parent, 'collapsed'));
            }
        });
    }

    private renderJSON(object: unknown, el: HTMLElement, filter: Filter): void {
        if (el.children.length) {
            el.children[0].remove();
        }
        if (!object) {
            el.classList.add('empty');
            return;
        }
        el.classList.remove('empty');
        const template = this.makeObjectViewTemplate(object, filter) || '<div>&lt;empty&gt;</div>';
        // console.log(template);
        const doc = new DOMParser().parseFromString(template, "text/xml");
        const node = doc.childNodes[0] as HTMLElement;
        el.appendChild(node);
    }

    private makeObjectViewTemplate(object: any, filter: Filter): string {
        if (Array.isArray(object)) {
            const inner = object
                .map((x, index) => ({ tmpl: this.makeObjectViewTemplate(x, filter), index }))
                .filter(t => !!t.tmpl)
                .map(t => `
                    <div class="entry array">
                        <span class="name">[${t.index}]</span>
                        ${t.tmpl}
                    </div>
                `);
            return `
                <div class="indent array">
                    ${inner.join('')}
                </div>
            `;
        }
        
        if (typeof object !== 'object' || object == null) {
            const matches = filter.matches(object || 'null');
            if (!matches) {
                return '';
            }
            const type = object === null || object === 'undefined' ? 'null'
                : !isNaN(object) ? 'number'
                : object == 'true' || object == 'false' ? 'boolean'
                : '';
            return `<span class="value ${type}">${xmlEscape(object)}</span>`;
        }
        
        const inner = Object.keys(object).map(k => {
            let child = this.makeObjectViewTemplate(object[k], filter);
            const matches = !!child || filter.matches(k);
            if (!matches) {
                return '';
            }
            const longEntry = Array.isArray(object[k]) || (!!object[k] && typeof object[k] === 'object');
            if (!child && !longEntry) {
                child = this.makeObjectViewTemplate(object[k], ALWAYS_MATCH);
            }
            return `
                <div class="entry ${longEntry ? 'long' : ''}">
                    <span class="name">
                        ${k}
                        ${Array.isArray(object[k]) ? `<span class="array">[${object[k].length}]</span>` : ''}
                    </span>
                    ${child}
                </div>
            `}
        ).filter(x => !!x);
        if (!inner.length) {
            return '';
        }
        return `
            <div class="indent object">
                ${inner.join('')}
            </div>
        `;
    }

    private unmarkSelectedItems(): void {
        document.querySelectorAll('div.selected').forEach(node => {
            const n = node as HTMLElement;
            n.classList.remove('selected');
        });
    }

    private togglePanel(header: HTMLElement, panel: HTMLElement): void {
        const closed = this.isDisplayNone(panel);
        if (closed) {
            header.classList.add('open');
        } else {
            header.classList.remove('open');
        }
        
        panel.style.display = closed ? 'flex' : 'none';
    }
    
    private isDisplayNone(el: HTMLElement): boolean {
        return el.style.display == 'none' || !el.style.display;
    }
    
    private copyFromSelectedItem(field: string): void {
        navigator.clipboard.writeText(JSON.stringify((this.item as any)[field]));
    }
}
