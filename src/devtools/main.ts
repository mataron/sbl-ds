function handleShown() {
}

function handleHidden() {
}

chrome.devtools.panels.create(
    "Siebel DeStupidifier",
    "/images/logo96.png",
    "/devtools/panel.html",
    (panel: chrome.devtools.panels.ExtensionPanel) => {
        panel.onShown.addListener(handleShown);
        panel.onHidden.addListener(handleHidden);
    }
);
