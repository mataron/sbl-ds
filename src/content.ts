import { CommandMessage, ContentToPageEvent, PageToContentEvent } from "./common/comms";


function loadPageScript() {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('page.js');
    s.onload = function() { s.remove(); };
    (document.head || document.documentElement).appendChild(s);
}

loadPageScript();

chrome.runtime.onMessage.addListener(async (message: any) => {
    if (!(typeof message === 'object')) return;
    const cmd = message as CommandMessage;

    if (message.beginTrack) {
        setupPageApiOverride(true);
    }
});

document.addEventListener(PageToContentEvent, (e) => {
    const ce = e as CustomEvent;
    chrome.runtime.sendMessage(ce.detail);
});

function setupPageApiOverride(force: boolean) {
    document.dispatchEvent(new CustomEvent(ContentToPageEvent, {
        detail: true
    }));
}

setTimeout(() => {
    setupPageApiOverride(false);
}, 0);
