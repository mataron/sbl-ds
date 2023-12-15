import { DevToolsMessage, PageMessage, PageVisitInfo } from "../common/comms";
import { toStatusBarData } from "./action-data";
import { DetailsController } from "./details";
import { Filter } from "./filter";

interface SaveObject {
    type: 'session';
    list: PageMessage[];
};

export class ListController {
    private list = document.querySelector('#list') as HTMLDivElement;
    private deleteBtn = document.querySelector('#deleteBtn') as HTMLButtonElement;
    private filterStr = document.querySelector('#filterStr') as HTMLInputElement;
    private attrChk = document.querySelector('#attrChk') as HTMLInputElement;
    private methodChk = document.querySelector('#methodChk') as HTMLInputElement;
    private attrChkLbl = document.querySelector('#attrChkLbl') as HTMLSpanElement;
    private methodChkLbl = document.querySelector('#methodChkLbl') as HTMLSpanElement;
    private scrollToTopBtn = document.querySelector('#scrollToTopBtn') as HTMLButtonElement;
    private copySessionBtn = document.querySelector('#copySessionBtn') as HTMLButtonElement;
    private viewsCountLbl = document.querySelector('#statusbar .views') as HTMLSpanElement;
    private attributesCountLbl = document.querySelector('#statusbar .attributes') as HTMLSpanElement;
    private callsCountLbl = document.querySelector('#statusbar .calls') as HTMLSpanElement;
    private totalCountLbl = document.querySelector('#statusbar .total') as HTMLSpanElement;
    private visibleCountLbl = document.querySelector('#statusbar .visible') as HTMLSpanElement;
    
    private messages: PageMessage[] = [];
    private filter?: Filter;
    private details = new DetailsController();

    private viewCount = 0;
    private attributeCount = 0;
    private callsCount = 0;

    constructor(private port: chrome.runtime.Port) {
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
        this.copySessionBtn.onclick = (e) => {
            e.stopPropagation();
            this.copySessionToJSON();
        };
    }

    onPageMessage(msg: DevToolsMessage): void {
        try {
            if (msg.history) {
                this.messages.splice(0, this.messages.length, ...msg.history);
                this.onHistoryReplace();
            }
            if (msg.message) {
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
        this.refreshCounts();
    }

    private onHistoryAppend(): void {
        const item = this.messages[this.messages.length - 1];
        this.onItemAdded(item);

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

        this.refreshVisibleCount();
    }

    private createListItem(item: PageMessage): HTMLElement {
        const data = toStatusBarData(item);
        const icon = data.pending ? '&#x021bb;'/* ↻ */ : data.status ? '&#x02713;'/* ✓ */ : '&#x02717;'/* ✗ */;
        let cls = '';
        if (this.isSelectedItem(item)) {
            cls = 'class="selected"';
        }
        let tail = `<div class="duration">${data.duration}</div>`;
        if (item.visit) {
            tail = '<button>{J}</button>';
        } else {
            tail += '<button class="replay">&#x022b3;</button>'; /* ⊳ */
        }

        const template = `
            <div id="${data.id}" ${cls}>
                <span class="status ${data.pending ? 'pending' : data.status ? 'success' : 'error'}">${icon}</span>
                <div class="label">${data.label}</div>
                ${tail}
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

        const btn = node.querySelector('button') as HTMLButtonElement;
        if (item.visit) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyPageSession(item.visit as PageVisitInfo);
            });
        } else {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.replay(item);
            });
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

    private copySessionToJSON() {
        navigator.clipboard.writeText(JSON.stringify(this.toSessionData(this.messages)));
    }

    private copyPageSession(item: PageVisitInfo) {
        const beginIdx = this.messages.findIndex(x => x.visit && x.visit.id == item.id);
        if (beginIdx < 0) {
            return;
        }

        let endIdx = beginIdx + 1;
        while (endIdx < this.messages.length) {
            if (this.messages[endIdx].visit) {
                break;
            }
            endIdx++;
        }
        
        const data = this.messages.slice(beginIdx, endIdx);
        navigator.clipboard.writeText(JSON.stringify(this.toSessionData(data)));
    }

    private toSessionData(list: PageMessage[]): SaveObject {
        return { type: 'session', list };
    }

    private onItemAdded(item: PageMessage): void {
        if (item.api) {
            this.callsCount++;
            this.callsCountLbl.textContent = '' + this.callsCount;
        } else if (item.attribute) {
            this.attributeCount++;
            this.attributesCountLbl.textContent = '' + this.attributeCount;
        }
        else {
            this.viewCount++;
            this.viewsCountLbl.textContent = '' + this.viewCount;
        }
        this.totalCountLbl.textContent = '' + this.messages.length;
    }

    private refreshCounts(): void {
        this.callsCount = this.messages.filter(m => !!m.api).length;
        this.attributeCount = this.messages.filter(m => !!m.attribute).length;
        this.viewCount = this.messages.filter(m => !!m.visit).length;

        this.callsCountLbl.textContent = '' + this.callsCount;
        this.attributesCountLbl.textContent = '' + this.attributeCount;
        this.viewsCountLbl.textContent = '' + this.viewCount;

        this.totalCountLbl.textContent = '' + this.messages.length;
        this.refreshVisibleCount();
    }

    private refreshVisibleCount(): void {
        this.visibleCountLbl.textContent = '' + document.querySelectorAll('#list>div').length;
    }

    private replay(item: PageMessage): void {
        this.port.postMessage({
            tabId: chrome.devtools.inspectedWindow.tabId,
            replay: true,
            item
        });
    }
}
