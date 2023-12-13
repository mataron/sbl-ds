import { CommandMessage, ContentToPageEvent, PageToContentEvent } from "./common/comms";


function loadPageScript() {
    // console.log('tab injecting page');
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('page.js');
    s.onload = function() { s.remove(); };
    (document.head || document.documentElement).appendChild(s);
}

loadPageScript();

// console.log('cs2')
chrome.runtime.onMessage.addListener(async (message: any) => {
    // console.log('cs3')
    // console.log('COMMAND', message);
    if (!(typeof message === 'object')) return;
    const cmd = message as CommandMessage;

    if (message.beginTrack) {
        setupPageApiOverride(true);
    }
});

// console.log('cs4')
document.addEventListener(PageToContentEvent, (e) => {
    // console.log('c2b');
    const ce = e as CustomEvent;
    chrome.runtime.sendMessage(ce.detail);
});

function setupPageApiOverride(force: boolean) {
    document.dispatchEvent(new CustomEvent(ContentToPageEvent, {
        detail: true
    }));
}

// console.log('cs5')
setTimeout(() => {
    // console.log('c2p>>');
    setupPageApiOverride(false);
}, 0);
// console.log('content-script')
