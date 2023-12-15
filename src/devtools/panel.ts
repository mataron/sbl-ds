import { ListController } from "./list";

const main = document.querySelector('#main') as HTMLDivElement;
const details = document.querySelector('#details') as HTMLDivElement;
const resizeHandle = document.querySelector('#resize') as HTMLDivElement;


const port = chrome.runtime.connect();
const listCtrl = new ListController(port);

port.postMessage({
    setup: true,
    tabId: chrome.devtools.inspectedWindow.tabId
});
port.onMessage.addListener(msg => listCtrl.onPageMessage(msg));


let is_mouse_down = false;
resizeHandle.addEventListener('mousedown', on_resize_mousedown);
function on_resize_mousedown() {
    is_mouse_down = true;
    document.body.addEventListener('mousemove', on_resize_mousemove);
    document.body.addEventListener('mouseup', on_resize_end);
    document.body.style.userSelect = 'none';
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
    document.body.style.userSelect = 'initial';
}
