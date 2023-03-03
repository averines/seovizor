document.getElementById("action-test").addEventListener("click", () => {
    // смена иконки
    // chrome.action.setIcon({
    //     path: { "16": "icons/16-2.png" }
    // })

    // смена тайтла (показывается при наведении на иконку в панели)
    chrome.action.setTitle({ title: "123" });

    // добавление мелкой подписи к иконке
    chrome.action.setBadgeText({ text: "200" });
    chrome.action.setBadgeBackgroundColor({ color: "black" });
    chrome.action.setBadgeTextColor({ color: "#fff" });
})


document.querySelector('#go-to-options').addEventListener('click', function () {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('options/options.html'));
    }
});

function tabsToggle() {
    const tabs = document.querySelectorAll('[role="tab"]');
    const tabpanels = document.querySelectorAll('[role="tabpanel"]');
    tabs.forEach(t => {
        t.addEventListener('click', () => {
            tabs.forEach(t => { t.setAttribute('aria-selected', false); });
            t.setAttribute('aria-selected', true);

            tabpanels.forEach(p => {
                p.setAttribute('aria-hidden', true);
                if (p.id == t.getAttribute('aria-controls')) {
                    p.setAttribute('aria-hidden', false);
                }
            })
        })
    })
}

tabsToggle()


const urlEl = document.getElementById("url");
const canonicalEl = document.getElementById("canonical");
const h1El = document.getElementById("h1");
const h1counterEl = document.getElementById("h1counter");
const toolSpeedEl = document.getElementById("tool-speed");
const toolMobileEl = document.getElementById("tool-mobile");
const toolArchiveEl = document.getElementById("tool-archive");
const toolSslEl = document.getElementById("tool-ssl");
const toolWhoisEl = document.getElementById("tool-whois");
const toolCmsEl = document.getElementById("tool-cms");
const toolResponseEl = document.getElementById("tool-response");
const toolDuplicateEl = document.getElementById("tool-duplicate");
const toolTrustEl = document.getElementById("tool-trust");

function getData() {
    // TODO: возвращат не массив с текстом заголовка, а объект со всеми нужными полями
    return Array.from(document.querySelectorAll("h1")).map(h => h.innerText);
};

function getDataResult(frames) {
    // TODO: принимать объект полей и обрабатывать из значения
    console.log(frames[0].result);
    h1El.innerText = frames[0].result[0];
    h1counterEl.innerText = frames[0].result[0].length;
};

document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
        if (tabs) {
            const url = new URL(tabs[0].url);
            urlEl.innerText = url.href;
            urlEl.href = url.href;
            toolSpeedEl.href = `https://pagespeed.web.dev/report?url=${url.href}`;
            toolMobileEl.href = `https://search.google.com/test/mobile-friendly?url=${url.href}`;
            toolArchiveEl.href = `https://web.archive.org/web/*/${url.href}`;
            toolSslEl.href = `https://www.sslshopper.com/ssl-checker.html#hostname=${url.hostname}`;
            toolWhoisEl.href = `https://www.webnames.ru/whois?domname=${url.hostname}`;
            toolCmsEl.href = `https://be1.ru/cms/?url=${url.hostname}`;
            toolResponseEl.href = `https://www.bertal.ru/?url=${url.href}`;
            toolDuplicateEl.href = `https://be1.ru/dubli-stranic/?url=${url.hostname}`;
            toolTrustEl.href = `https://checktrust.ru/analyze/${url.hostname}`;


            chrome.scripting.executeScript({ target: { tabId: tabs[0].id, allFrames: false }, func: getData }, getDataResult)

        } else {
            return;
        }
    })
});