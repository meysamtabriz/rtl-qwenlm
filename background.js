// تابع برای چک کردن URL تب
function isTargetURL(url) {
    return url && typeof url === 'string' && url.includes('chat.deepseek.com');
}

// مدیریت وضعیت isRTL
const DirectionState = {
    get(callback) {
        chrome.storage.local.get(['isRTL'], (result) => {
            callback(result.isRTL || false);
        });
    },
    set(isRTL) {
        chrome.storage.local.set({ isRTL });
    },
};

// تنظیم آیکون بر اساس وضعیت
function updateIcon(isRTL) {
    const iconPath = isRTL
        ? { "16": "icons/icon_rtl16.png", "48": "icons/icon_rtl48.png", "128": "icons/icon_rtl128.png" }
        : { "16": "icons/icon_ltr16.png", "48": "icons/icon_ltr48.png", "128": "icons/icon_ltr128.png" };
    chrome.action.setIcon({ path: iconPath });
}

// اعمال جهت RTL یا LTR به DOM
function setRTLDirection(isRTL) {
    document.documentElement.style.direction = isRTL ? 'rtl' : 'ltr';
    const codeBlocks = document.querySelectorAll('.md-code-block');
    codeBlocks.forEach((block) => (block.style.direction = 'ltr'));

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.classList.contains('md-code-block')) {
                    node.style.direction = 'ltr';
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    // ذخیره observer برای مدیریت‌های آتی
    window._rtlObserver = observer;
}

// توقف MutationObserver در صورت نیاز
function stopObserver() {
    if (window._rtlObserver) {
        window._rtlObserver.disconnect();
        delete window._rtlObserver;
    }
}

// اعمال وضعیت ذخیره‌شده هنگام بارگذاری
function applyStoredDirection(tab) {
    if (isTargetURL(tab.url)) {
        DirectionState.get((isRTL) => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: setRTLDirection,
                args: [isRTL],
            });
            updateIcon(isRTL);
        });
    }
}

// مدیریت کلیک آیکون افزونه
chrome.action.onClicked.addListener((tab) => {
    if (isTargetURL(tab.url)) {
        DirectionState.get((isRTL) => {
            const newState = !isRTL;
            DirectionState.set(newState);
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: setRTLDirection,
                args: [newState],
            });
            updateIcon(newState);
        });
    } else {
        chrome.tabs.update(tab.id, { url: 'https://chat.deepseek.com' });
    }
});

// مدیریت تغییر تب یا به‌روزرسانی تب
function handleTabChange(tab) {
    if (isTargetURL(tab.url)) {
        applyStoredDirection(tab);
    }
}

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, handleTabChange);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && isTargetURL(tab.url)) {
        handleTabChange(tab);
    }
});

// مدیریت تغییرات در storage
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.isRTL) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            applyStoredDirection(tab);
        });
    }
});

// تنظیم حالت پیش‌فرض RTL در زمان نصب افزونه
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['isRTL'], (result) => {
        if (result.isRTL === undefined) { // اگر مقدار isRTL تنظیم نشده باشد
            chrome.storage.local.set({ isRTL: true }); // حالت پیش‌فرض RTL
        }
    });
});