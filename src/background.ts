import { CommandMessage, PageMessage } from "./common/comms";


interface TabInfo {
    messages: PageMessage[];
};
const TAB_LIST: { [key: number]: TabInfo } = {};
const PORTS_LIST: { [key: number]: chrome.runtime.Port } = {};


initialize();


async function initialize() {
    chrome.tabs.onActivated.addListener(onTabActivatedCb);
    chrome.tabs.onRemoved.addListener(onTabRemovedCb);
    // from content script:
    chrome.runtime.onMessage.addListener(onTabMessageCb);
    // from devtools panel:
    chrome.runtime.onConnect.addListener(onDevtoolsConnectCb);

    const webRequestFilter = {
        urls: [ "http://*/*", "https://*/*" ],
    };
    chrome.webRequest.onCompleted.addListener(onWebRequestCompletedCb, webRequestFilter);
    chrome.webNavigation.onCompleted.addListener(setupTabAfterNavigationCb);

    const tab_list = await chrome.tabs.query({ active: true });
    tab_list
        .filter(tab => !!tab.id)
        .forEach(tab => initializeTab(tab.id as number, true));
}


async function onTabMessageCb(message: any, sender: chrome.runtime.MessageSender) {
    const tab = sender.tab;
    if (!tab) return;

    const id = tab.id;
    if (!id || !(id in TAB_LIST)) return;

    const data = TAB_LIST[id];
    data.messages.push(message);

    const port = PORTS_LIST[id];
    if (port) {
        port.postMessage({ message });
    }

    console.log(id, message);
}


async function onTabRemovedCb(tabId: number) {
    // console.log('tab removed', tabId);
    delete TAB_LIST[tabId];
    const port = PORTS_LIST[tabId];
    if (port) {
        port.disconnect;
        delete PORTS_LIST[tabId];
    }
}


async function onTabActivatedCb(tabInfo: chrome.tabs.TabActiveInfo) {
    initializeTab(tabInfo.tabId, false);
}


async function setupTabAfterNavigationCb(details: chrome.webNavigation.WebNavigationFramedCallbackDetails) {
    if (details.url.includes('/siebel')) {
        initializeTab(details.tabId, true);
    }
}


async function initializeTab(id: number, forceInject: boolean) {
    let shouldInject = forceInject;
    if (!(id in TAB_LIST)) {
        // console.log('new tab activated', id);
        shouldInject = true;
        TAB_LIST[id] = {
            messages: [],
        };
    }

    if (!shouldInject) {
        return;
    }

    // console.log('tab injecting content', id);
    await chrome.scripting.executeScript({
        target: { tabId: id },
        files: ['content.js'],
    });
}


async function onWebRequestCompletedCb(details: chrome.webRequest.WebResponseCacheDetails) {
    // console.log(details.tabId, TAB_LIST[details.tabId], details.url);

    if (!(details.tabId in TAB_LIST)) return;
    const data = TAB_LIST[details.tabId];

    if (!urlMatchesSiebelSetupJsFiles(details.url)) return;

    // console.warn('TRACKING REQUEST');

    const msg: CommandMessage = {
        beginTrack: true,
    };

    try {
        await chrome.tabs.sendMessage(details.tabId, msg);
    } catch(x) {
        await initializeTab(details.tabId, true);
        await chrome.tabs.sendMessage(details.tabId, msg);
    }
}


function urlMatchesSiebelSetupJsFiles(url: string): boolean {
    return url.includes('/siebel.js');
}


async function onDevtoolsConnectCb(port: chrome.runtime.Port) {
    // console.log('devtools connect');

    port.onMessage.addListener((message) => {
        const id = message.setup;
        if (!id || !TAB_LIST[id]) return;

        // console.log('devtools setup', id);

        PORTS_LIST[id] = port;
    
        port.postMessage({ history: TAB_LIST[id].messages });
    });

    // port.onDisconnect.addListener(() => console.log('devtools disconnected'));
}
