import { punycode } from '/libs/punycode.js';

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

// вкладка Main
const dataYandexXGEl = document.getElementById("data-yandex-x");


// вкладка Search
const toolSearchGEl = document.getElementById("tool-search-g");
const toolSearchYEl = document.getElementById("tool-search-y");
const toolDuplicateYEl = document.getElementById("tool-duplicate-y");
const toolDomainYEl = document.getElementById("tool-domain-y");
const toolSiteGEl = document.getElementById("tool-site-g");
const toolSiteYEl = document.getElementById("tool-site-y");
const toolHostYEl = document.getElementById("tool-host-y");
const toolOrgGEl = document.getElementById("tool-org-g");
const toolOrgYEl = document.getElementById("tool-org-y");
const toolCopyResultsEl = document.getElementById("tool-copy-results");


// вкладка Tools
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
    // TODO: возвращать не массив с текстом заголовка, а объект со всеми нужными полями
    return Array.from(document.querySelectorAll("h1")).map(h => h.innerText);
};

function getDataResult(frames) {
    // TODO: принимать объект полей и обрабатывать из значения
    // console.log(frames[0].result);
    h1El.innerText = frames[0].result[0];
    h1counterEl.innerText = frames[0].result[0].length;
};

document.addEventListener('DOMContentLoaded', async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true, active: true });

    if (tabs) {
        const tabId = tabs[0].id;
        const url = new URL(tabs[0].url);

        console.log(tabs[0]);

        // url.protocol;  // "http:"
        // url.hostname;  // "aaa.bbb.ccc.com"
        // url.pathname;  // "/asdf/asdf/sadf.aspx"
        // url.search;    // "?blah"


        const urlNoProtocol = `${url.hostname}${url.pathname}`;
        // TODO: заменить регуляркой
        const hostnameNoWww = url.hostname.replace("www.", "").replace("www2.", "");
        const urlNoWww = `${hostnameNoWww}${url.pathname}`;
        urlEl.innerText = url.href;
        urlEl.href = url.href;

        // вкладка Main
        dataYandexXGEl.src = `https://webmaster.yandex.ru/sqicounter?theme=light&host=${url.hostname}`


        // вкладка Search
        toolSearchGEl.href = `https://www.google.ru/search?q=site:${url.href}`;
        toolSearchYEl.href = `https://yandex.ru/search/?text=url:${urlNoWww} | url:${urlNoProtocol}`;
        toolDuplicateYEl.href = `https://yandex.ru/search/?text=title:("${tabs[0].title}") site:${url.hostname}`;
        toolDomainYEl.href = `https://yandex.ru/search/?text=url:${url.hostname}/* | url:${hostnameNoWww}/* | url:${url.hostname} | url:${hostnameNoWww}`;
        toolSiteGEl.href = `https://www.google.ru/search?q=site:${url.hostname}`;
        toolSiteYEl.href = `https://yandex.ru/search/?text=site:${url.hostname}`;
        toolHostYEl.href = `https://yandex.ru/search/?text=host:${url.hostname}`;
        toolOrgGEl.href = `https://www.google.com/maps/search/${punycode.toUnicode(url.hostname)}`;
        toolOrgYEl.href = `https://yandex.ru/maps/?mode=search&text=${punycode.toUnicode(url.hostname)}`;

        if (url.hostname.includes("yandex.") || url.hostname.includes("google.")) {
            toolCopyResultsEl.disabled = false;
        }


        // вкладка Tools
        toolSpeedEl.href = `https://pagespeed.web.dev/report?url=${url.href}`;
        toolMobileEl.href = `https://search.google.com/test/mobile-friendly?url=${url.href}`;
        toolArchiveEl.href = `https://web.archive.org/web/*/${url.href}`;
        toolSslEl.href = `https://www.sslshopper.com/ssl-checker.html#hostname=${url.hostname}`;
        toolWhoisEl.href = `https://www.webnames.ru/whois?domname=${url.hostname}`;
        toolCmsEl.href = `https://be1.ru/cms/?url=${url.hostname}`;
        toolResponseEl.href = `https://www.bertal.ru/?url=${url.href}`;
        toolDuplicateEl.href = `https://be1.ru/dubli-stranic/?url=${url.hostname}`;
        toolTrustEl.href = `https://checktrust.ru/analyze/${url.hostname}`;


        chrome.scripting.executeScript({ target: { tabId, allFrames: false }, func: getData }, getDataResult)

        // const initReviewTabResponse = await chrome.tabs.sendMessage(tabId, { action: 'init_review_tab' });
        // const { titles, metaTags, canonicals = [], hreflangs = [] } = initReviewTabResponse.head;
        // console.log(initReviewTabResponse.head);

    } else {
        return;
    }
});