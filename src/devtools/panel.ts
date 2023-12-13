import { DevToolsMessage, PageApiInfo, PageMessage, PageProfileAttributeInfo, PageVisitInfo } from "../common/comms";


const main = document.querySelector('#main') as HTMLDivElement;
const details = document.querySelector('#details') as HTMLDivElement;
const resizeHandle = document.querySelector('#resize') as HTMLDivElement;
const list = document.querySelector('#list') as HTMLDivElement;
const deleteBtn = document.querySelector('#deleteBtn') as HTMLButtonElement;
const filterStr = document.querySelector('#filterStr') as HTMLInputElement;
const attrChk = document.querySelector('#attrChk') as HTMLInputElement;
const methodChk = document.querySelector('#methodChk') as HTMLInputElement;
const attrChkLbl = document.querySelector('#attrChkLbl') as HTMLSpanElement;
const methodChkLbl = document.querySelector('#methodChkLbl') as HTMLSpanElement;
const scrollToTopBtn = document.querySelector('#scrollToTopBtn') as HTMLButtonElement;
const hideDetailsBtn = document.querySelector('#hideDetailsBtn') as HTMLButtonElement;
const detailsLabel = document.querySelector('#detailsLabel') as HTMLSpanElement;
const requestHeader = document.querySelector('#requestHeader') as HTMLDivElement;
const request = document.querySelector('#request') as HTMLDivElement;
const responseHeader = document.querySelector('#responseHeader') as HTMLDivElement;
const response = document.querySelector('#response') as HTMLDivElement;
const requestFilterStr = document.querySelector('#requestFilterStr') as HTMLInputElement;
const responseFilterStr = document.querySelector('#responseFilterStr') as HTMLInputElement;
const copyRequestBtn = document.querySelector('#copyRequestBtn') as HTMLInputElement;
const copyResponseBtn = document.querySelector('#copyResponseBtn') as HTMLInputElement;


let attrId = 0;
let visitId = 0;


const FULL_LIST: PageMessage[] = [];
let selectedItemId = '';

const port = chrome.runtime.connect();
port.postMessage({ setup: chrome.devtools.inspectedWindow.tabId });

port.onMessage.addListener((msg: DevToolsMessage) => {
    try {
        if (msg.history) {
            // console.log('dt-h')
            FULL_LIST.splice(0, FULL_LIST.length, ...msg.history);
            onHistoryReplace();
        }
        if (msg.message) {
            // console.log('dt-m')
            if (msg.message.api && msg.message.api.response) {
                const id = msg.message.api.id;
                const idx = FULL_LIST.findIndex(x => x.api && x.api.id == id);
                if (idx > -1) {
                    FULL_LIST.splice(idx, 1);
                }
            }
            FULL_LIST.push(msg.message);
            onHistoryAppend();
        }
        list?.scrollTo(0, list.scrollHeight);
    } catch(x) {
        console.error(x);
    }
});


deleteBtn.onclick = () => {
    port.postMessage({ clear: true });
    FULL_LIST.splice(0, FULL_LIST.length);
    clearListView();
};

filterStr.oninput = () => onHistoryReplace();
attrChk.oninput = () => onHistoryReplace();
methodChk.oninput = () => onHistoryReplace();
attrChkLbl.onclick = () => {
    attrChk.checked = !attrChk.checked;
    onHistoryReplace();
};
methodChkLbl.onclick = () => {
    methodChk.checked = !methodChk.checked;
    onHistoryReplace();
};
scrollToTopBtn.onclick = () => list?.scrollTo(0, 0);
hideDetailsBtn.onclick = () => deselectItem();
requestHeader.onclick = () => togglePanel(requestHeader, request);
responseHeader.onclick = () => togglePanel(responseHeader, response);
requestFilterStr.oninput = () => renderSelectedItem();
responseFilterStr.oninput = () => renderSelectedItem();
requestFilterStr.onclick = (e) => e.stopPropagation();
responseFilterStr.onclick = (e) => e.stopPropagation();
copyRequestBtn.onclick = (e) => {
    e.stopPropagation();
    copyFromSelectedItem('request');
}
copyResponseBtn.onclick = (e) => {
    e.stopPropagation();
    copyFromSelectedItem('response');
}

function togglePanel(header: HTMLElement, panel: HTMLElement) {
    const closed = isDisplayNone(panel);
    if (closed) {
        header.classList.add('open');
    } else {
        header.classList.remove('open');
    }
    
    panel.style.display = closed ? 'flex' : 'none';
}

function isDisplayNone(el: HTMLElement): boolean {
    return el.style.display == 'none' || !el.style.display;
}

function copyFromSelectedItem(field: string) {
    const item = FULL_LIST.find(x => x.api && x.api.id == selectedItemId);
    if (item && item.api) {
        navigator.clipboard.writeText(JSON.stringify((item.api as any)[field]));
    }
}



let is_mouse_down = false;
resizeHandle.addEventListener('mousedown', on_resize_mousedown);
function on_resize_mousedown() {
    is_mouse_down = true;
    document.body.addEventListener('mousemove', on_resize_mousemove);
    document.body.addEventListener('mouseup', on_resize_end);
}
function on_resize_mousemove(event: MouseEvent) {
    if (is_mouse_down) {
        const w = main.clientWidth + details.clientWidth;
        main.style.flexBasis = event.clientX + "px";
        details.style.flexBasis = (w - event.clientX) + 'px';
    } else {
        on_resize_end();
    }
}
const on_resize_end = () => {
    is_mouse_down = false;
    document.body.removeEventListener('mouseup', on_resize_end);
    resizeHandle.removeEventListener('mousemove', on_resize_mousemove);
}



function selectItem(item: PageApiInfo) {
    if (selectedItemId == item.id) {
        deselectItem();
        return;
    }
    selectedItemId = item.id;

    details.style.display = 'flex';
    resizeHandle.style.display = 'block';

    const w = main.clientWidth + details.clientWidth;
    const dw = Math.ceil(Math.max(details.clientWidth, .4 * w));
    main.style.flexBasis = (w - dw) + "px";
    details.style.flexBasis = dw + 'px';

    renderItem(item);
}

function renderSelectedItem() {
    const item = FULL_LIST.find(x => x.api && x.api.id == selectedItemId);
    if (item && item.api) {
        renderItem(item.api);
    }
}

function renderItem(item: PageApiInfo) {
    const data = apiToStatusBarData(item);
    detailsLabel.innerHTML = data.label;

    const requestFilters = requestFilterStr.value.split(/\s+/).filter(x => !!x).map(x => x.toLowerCase());
    renderJSON(item.request, request, requestFilters);

    const responseFilters = responseFilterStr.value.split(/\s+/).filter(x => !!x).map(x => x.toLowerCase());
    renderJSON(item.response, response, responseFilters);

    document.querySelectorAll('#details .panel .entry .name').forEach(node => {
        const el = node as HTMLElement;
        const parent = el.parentElement as HTMLElement;
        if (parent.classList.contains('long') || parent.classList.contains('array')) {
            el.addEventListener('click', () => toggleClass(parent, 'collapsed'));
        }
    });
}

function toggleClass(el: HTMLElement, cls: string) {
    if (el.classList.contains(cls)) {
        el.classList.remove(cls);
    } else {
        el.classList.add(cls);
    }
}

function renderJSON(object: unknown, el: HTMLElement, filters: string[]) {
    if (el.children.length) {
        el.children[0].remove();
    }
    if (!object) {
        el.classList.add('empty');
        return;
    }
    el.classList.remove('empty');
    const template = makeObjectViewTemplate(object, filters) || '<div>&lt;empty&gt;</div>';
    // console.log(template);
    const doc = new DOMParser().parseFromString(template, "text/xml");
    const node = doc.childNodes[0] as HTMLElement;
    el.appendChild(node);
}

function makeObjectViewTemplate(object: any, filters: string[]): string {
    if (Array.isArray(object)) {
        const inner = object
            .map((x, index) => ({ tmpl: makeObjectViewTemplate(x, filters), index }))
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
        const matches = matchesAnyFilter(object || 'null', filters);
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
        let child = makeObjectViewTemplate(object[k], filters);
        const matches = !!child || matchesAnyFilter(k, filters);
        if (!matches) {
            return '';
        }
        const longEntry = Array.isArray(object[k]) || (!!object[k] && typeof object[k] === 'object');
        if (!child && !longEntry) {
            child = makeObjectViewTemplate(object[k], []);
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

function xmlEscape(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function matchesAnyFilter(str: string, filters: string[]): boolean {
    if (!filters.length) {
        return true;
    }
    const s = str.toLowerCase();
    return !!filters.find(f => s.includes(f));
}

function deselectItem() {
    selectedItemId = '';
    details.style.display = 'none';
    resizeHandle.style.display = 'none';
}



function clearListView() {
    while (list?.children.length) {
        list.removeChild(list.children[0]);
    }
}


function onHistoryReplace() {
    clearListView();
    let selectedItemFound = false;
    for (const item of FULL_LIST) {
        if (!itemMatchesFilter(item)) {
            continue;
        }
        if (!selectedItemFound && item.api && item.api.id == selectedItemId) {
            selectedItemFound = true;
        }
        list?.appendChild(createListItem(item));
    }
    if (!selectedItemFound) {
        deselectItem();
    }
}


function onHistoryAppend() {
    const item = FULL_LIST[FULL_LIST.length - 1];
    if (item.api) {
        const prev = document.querySelector('#method' + item.api.id);
        if (prev) {
            prev.remove();
        }
    }

    if (!itemMatchesFilter(item)) {
        return;
    }

    list?.appendChild(createListItem(item));

    if (item.api && selectedItemId == item.api.id) {
        renderItem(item.api);
    }
}


function createListItem(item: PageMessage) {
    // console.log(item);
    const data = toStatusBarData(item);
    const icon = data.pending ? '&#x021bb;'/* ↻ */ : data.status ? '&#x02713;'/* ✓ */ : '&#x02717;'/* ✗ */;
    // console.log(data);
    const template = `
        <div id="${data.id}">
            <span class="status ${data.pending ? 'pending' : data.status ? 'success' : 'error'}">${icon}</span>
            <div class="label">${data.label}</div>
            <div class="duration">${data.duration}</div>
        </div>
    `;
    const doc = new DOMParser().parseFromString(template, "text/xml");
    const node = doc.childNodes[0] as HTMLElement;
    if (item.api) {
        const api = item.api;
        node.addEventListener('click', () => selectItem(api));
    } else {
        node.addEventListener('click', deselectItem);
    }
    return node;
}

function toStatusBarData(item: PageMessage) {
    if (item.api) {
        return apiToStatusBarData(item.api);
    }
    if (item.attribute) {
        return attributeToStatusBarData(item.attribute);
    }
    return visitToStatusBarData(item.visit as PageVisitInfo);
}

function apiToStatusBarData(item: PageApiInfo) {
    let method = item.method;
    if (item.method === 'RunProcess' && item.request.ProcessName) {
        method = item.request.ProcessName;
    }

    return {
        id: 'method' + item.id,
        status: item.success,
        pending: !item.response,
        label: `[${item.async ? '&#x021c4;'/* ⇄ */ : '&#x027f7;' /* ⟷ */}] ${item.service} / ${method}`,
        duration: humanReadableDuration(item.delay),
    };
}

function visitToStatusBarData(item: PageVisitInfo) {
    return {
        id: 'visit' + ++visitId,
        status: true,
        pending: false,
        label: `GOTO [${item.view}]`,
        duration: '-',
    };
}

function attributeToStatusBarData(item: PageProfileAttributeInfo) {
    const action = item.retrieve ? 'GET' : 'SET';
    return {
        id: 'attr' + ++attrId,
        status: true,
        pending: false,
        label: `[${action}] Profile Attribute [${item.name}] :: [${item.value}]`,
        duration: humanReadableDuration(item.delay),
    };
}

function humanReadableDuration(n: number) {
    return `${n || 0}ms`;
}

function itemMatchesFilter(item: PageMessage) {
    const strings = filterStr.value.split(/\s+/).filter(x => !!x).map(x => x.toLowerCase());
    if (item.attribute) {
        if (!attrChk.checked) {
            return false;
        }
        if (strings.length) {
            const match = strings.find(s => item.attribute?.name.toLowerCase().includes(s) || item.attribute?.value.toLowerCase().includes(s));
            return !!match;
        }
        return true;
    }
    if (item.visit) {
        if (strings.length) {
            const match = strings.find(s => item.visit?.view);
            return !!match;
        }
        return true;
    }
    if (item.api) {
        if (!methodChk.checked) {
            return false;
        }
        if (strings.length) {
            const match = strings.find(s =>
                    item.api?.service.toLowerCase().includes(s) ||
                    item.api?.method.toLowerCase().includes(s) ||
                    (item.api?.request.ProcessName && item.api?.request.ProcessName.toLowerCase().includes(s))
            );
            return !!match;
        }
    }
    return true;
}
