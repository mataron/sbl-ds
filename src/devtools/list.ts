import { DevToolsMessage, PageApiInfo, PageMessage } from "../common/comms";
import { toStatusBarData } from "./action-data";
import { DetailsController } from "./details";
import { Filter } from "./filter";

export class ListController {
    private list = document.querySelector('#list') as HTMLDivElement;
    private deleteBtn = document.querySelector('#deleteBtn') as HTMLButtonElement;
    private filterStr = document.querySelector('#filterStr') as HTMLInputElement;
    private attrChk = document.querySelector('#attrChk') as HTMLInputElement;
    private methodChk = document.querySelector('#methodChk') as HTMLInputElement;
    private attrChkLbl = document.querySelector('#attrChkLbl') as HTMLSpanElement;
    private methodChkLbl = document.querySelector('#methodChkLbl') as HTMLSpanElement;
    private scrollToTopBtn = document.querySelector('#scrollToTopBtn') as HTMLButtonElement;
    
    private messages: PageMessage[] = [];
    private filter?: Filter;
    private details = new DetailsController();

    constructor(port: chrome.runtime.Port) {
        this.deleteBtn.onclick = () => {
            port.postMessage({ clear: true });
            this.messages.splice(0, this.messages.length);
            this.clearListView();
        };
        
        this.filterStr.oninput = () => {
            this.updateFilter();
            this.onHistoryReplace();
        }
        this.attrChk.oninput = () => this.onHistoryReplace();
        this.methodChk.oninput = () => this.onHistoryReplace();
        this.attrChkLbl.onclick = () => {
            this.attrChk.checked = !this.attrChk.checked;
            this.onHistoryReplace();
        };
        this.methodChkLbl.onclick = () => {
            this.methodChk.checked = !this.methodChk.checked;
            this.onHistoryReplace();
        };
        this.scrollToTopBtn.onclick = () => this.list?.scrollTo(0, 0);
    }

    onPageMessage(msg: DevToolsMessage): void {
        try {
            if (msg.history) {
                // console.log('dt-h')
                this.messages.splice(0, this.messages.length, ...msg.history);
                this.onHistoryReplace();
            }
            if (msg.message) {
                // console.log('dt-m')
                if (msg.message.api) {
                    const id = msg.message.api.id;
                    const idx = this.messages.findIndex(x => x.api && x.api.id == id);
                    if (msg.message.api.response) {
                        if (idx > -1) {
                            this.messages.splice(idx, 1);
                        }
                    } else if (idx > -1) { // we already have shown the response
                        return;
                    }
                }
                this.messages.push(msg.message);
                this.onHistoryAppend();
            }
            this.list?.scrollTo(0, this.list.scrollHeight);
        } catch(x) {
            console.error(x);
        }    
    }

    clearListView(): void {
        while (this.list?.children.length) {
            this.list.removeChild(this.list.children[0]);
        }
    }

    private onHistoryReplace(): void {
        this.clearListView();
        let selectedItemFound = false;
        for (const item of this.messages) {
            if (!this.itemMatchesFilter(item)) {
                continue;
            }
            if (!selectedItemFound && this.isSelectedItem(item)) {
                selectedItemFound = true;
            }
            this.list?.appendChild(this.createListItem(item));
        }
        if (!selectedItemFound) {
            this.details.deselectItem();
        }
    }

    private onHistoryAppend(): void {
        const item = this.messages[this.messages.length - 1];
        if (item.api && item.api.response) {
            const prev = document.querySelector('#method' + item.api.id);
            if (prev) {
                prev.remove();
            }
        }

        if (!this.itemMatchesFilter(item)) {
            return;
        }

        this.list?.appendChild(this.createListItem(item));

        if (this.isSelectedItem(item)) {
            this.details.refreshView();
        }
    }


    private createListItem(item: PageMessage): HTMLElement {
        // console.log(item);
        const data = toStatusBarData(item);
        const icon = data.pending ? '&#x021bb;'/* ↻ */ : data.status ? '&#x02713;'/* ✓ */ : '&#x02717;'/* ✗ */;
        let cls = '';
        if (this.isSelectedItem(item)) {
            cls = 'class="selected"';
        }
        // console.log(data);
        const template = `
            <div id="${data.id}" ${cls}>
                <span class="status ${data.pending ? 'pending' : data.status ? 'success' : 'error'}">${icon}</span>
                <div class="label">${data.label}</div>
                <div class="duration">${data.duration}</div>
            </div>
        `;
        const doc = new DOMParser().parseFromString(template, "text/xml");
        const node = doc.childNodes[0] as HTMLElement;
        if (item.api) {
            const api = item.api;
            node.addEventListener('click', () => this.details.selectItem(api));
        } else {
            node.addEventListener('click', () => this.details.deselectItem());
        }
        return node;
    }

    private updateFilter(): void {
        this.filter = new Filter(this.filterStr.value);
    }

    private itemMatchesFilter(item: PageMessage): boolean {
        if (item.attribute) {
            if (!this.attrChk.checked) {
                return false;
            }
            return !this.filter || this.filter.matchesAny([
                item.attribute?.name, item.attribute?.value
            ]);
        }
        if (item.visit) {
            return !this.filter || this.filter.matches(item.visit?.view);
        }
        if (item.api) {
            if (!this.methodChk.checked) {
                return false;
            }
            return !this.filter || this.filter.matchesAny([
                item.api?.service,
                item.api?.method,
                item.api?.request.ProcessName || '',
            ]);
        }
        return true;
    }

    private isSelectedItem(item: PageMessage): boolean {
        if (!item.api) return false;
        if (!this.details.item) return false;
        return item.api.id == this.details.item.id;
    }
}
