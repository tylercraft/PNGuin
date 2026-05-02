chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "capture-visible",
    title: "🐧 Just the Tip (Visible)",
    contexts: ["page"],
  });
  chrome.contextMenus.create({
    id: "capture-full",
    title: "🐧 The Whole Iceberg (Full Page)",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "capture-visible") {
    chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        console.error("Capture failed:", chrome.runtime.lastError?.message);
        return;
      }
      downloadImage(dataUrl, "visible-shot.png");
    });
  } else if (info.menuItemId === "capture-full") {
    captureFullPage(tab);
  }
});

async function captureFullPage(tab) {
  const target = { tabId: tab.id };
  try {
    await chrome.debugger.attach(target, "1.3");
    const metrics = await chrome.debugger.sendCommand(target, "Page.getLayoutMetrics");
    const width = Math.ceil(metrics.cssContentSize?.width ?? metrics.contentSize.width);
    const height = Math.ceil(metrics.cssContentSize?.height ?? metrics.contentSize.height);

    await chrome.debugger.sendCommand(target, "Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const { data } = await chrome.debugger.sendCommand(target, "Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });

    await chrome.debugger.sendCommand(target, "Emulation.clearDeviceMetricsOverride");
    await chrome.debugger.detach(target);
    downloadImage(`data:image/png;base64,${data}`, "full-iceberg.png");
  } catch (e) {
    console.error("Full page capture failed:", e);
    chrome.debugger.sendCommand(target, "Emulation.clearDeviceMetricsOverride").catch(() => {});
    chrome.debugger.detach(target).catch(() => {});
  }
}

function downloadImage(url, name) {
  chrome.downloads.download({ url, filename: `PNGuin-${Date.now()}-${name}` });
}
