// console.log("1. Активирован Popup. В консоли расширения");

// document.getElementById("action-test").addEventListener("click", () => {
//     // смена иконки
//     // chrome.action.setIcon({
//     //     path: { "16": "icons/16-2.png" }
//     // })

//     // смена тайтла (показывается при наведении на иконку в панели)
//     chrome.action.setTitle({ title: "123" });

//     // добавление мелкой подписи к иконке
//     chrome.action.setBadgeText({ text: "200" });
//     chrome.action.setBadgeBackgroundColor({ color: "black" });
//     chrome.action.setBadgeTextColor({ color: "#fff" });
// })

// document.querySelector('#go-to-options').addEventListener('click', function () {
//     if (chrome.runtime.openOptionsPage) {
//         chrome.runtime.openOptionsPage();
//     } else {
//         window.open(chrome.runtime.getURL('options/options.html'));
//     }
// });

// url.protocol;  // "http:"
// url.hostname;  // "127.0.0.1"
// url.hostname;  // "127.0.0.1:5502"
// url.origin;  // "http://127.0.0.1:5502"
// url.href;  // "http://127.0.0.1:5502/popup/popup.html"
// url.pathname;  // "/popup/popup.html"
// url.search;    // "?blah"

import { punycode } from '/libs/punycode.js';

// функционал переключения вкладок в попапе
(function () {
    const tabTitles = document.querySelectorAll('[role="tab"]');
    const tabPanels = document.querySelectorAll('[role="tabpanel"]');
    tabTitles.forEach(t => {
        t.addEventListener('click', () => {
            tabTitles.forEach(t => { t.setAttribute('aria-selected', false); });
            t.setAttribute('aria-selected', true);

            tabPanels.forEach(p => {
                p.setAttribute('aria-hidden', true);
                if (p.id == t.getAttribute('aria-controls')) { p.setAttribute('aria-hidden', false); }
            })
        })
    })
}());


// функционал фильтра
function setFilter() {
    const filterTitles = document.querySelectorAll('[data-filter-title]');
    const filterRows = document.querySelectorAll('[data-filter]');

    filterTitles.forEach(t => {
        t.addEventListener('click', () => {
            filterTitles.forEach(btn => {
                if (btn.dataset.filterTitle == t.dataset.filterTitle) {
                    btn.classList.remove("filter__btn--active");
                }
            });
            t.classList.add("filter__btn--active");

            if (t.dataset.filterQuery.includes("all")) {
                filterRows.forEach(r => {
                    if (r.dataset.filter.includes(t.dataset.filterTitle)) {
                        r.classList.remove("is-hidden");
                    }
                })
            } else {
                filterRows.forEach(r => {
                    if (r.dataset.filter.includes(t.dataset.filterTitle)) {
                        if (r.dataset.filter.includes(t.dataset.filterQuery)) {
                            r.classList.remove("is-hidden");
                        } else {
                            r.classList.add("is-hidden");
                        }
                    }
                })
            }
        })
    })
};

// получаем сохраненные настройки пользователя
const userOptions = await chrome.storage.sync.get("options");
console.log(userOptions);


// отслеживание кликов через window
window.addEventListener('click', (e) => {
    // отслеживаем клик по кнопке Копировать
    if (e.target.classList.contains("field__copy")) {
        let parentField = e.target.closest(".field");
        let parentFieldContent = parentField.querySelector(".field__content");

        //находим текст поля и пишем его в буфер обмена
        navigator.clipboard.writeText(parentFieldContent.innerText)
            .then(() => {
                e.target.innerText = "Copied!";
                setTimeout(() => { e.target.innerText = "Copy"; }, 2000);
            })
            .catch(err => { console.log('Копирование не пашет', err); })
    }
})


// определение функциональных элементов попапа
const tablistEl = document.getElementById("tablist");
if (userOptions.hasOwnProperty("options") && userOptions.options.tabcompact) {
    tablistEl.classList.add("tablist--compact")
}

const bodyEl = document.querySelector("body");
if (userOptions.hasOwnProperty("options") && userOptions.options.theme) {
    bodyEl.classList.add(userOptions.options.theme)
}

// вкладка Main
const urlEl = document.getElementById("url");
const titleEl = document.getElementById("title");
const titleLengthEl = document.getElementById("title-length");
const titleAlertEl = document.getElementById("title-alert");
const descriptionEl = document.getElementById("description");
const descriptionLengthEl = document.getElementById("description-length");
const descriptionAlertEl = document.getElementById("description-alert");
const h1El = document.getElementById("h1");
const h1LengthEl = document.getElementById("h1-length");
const h1AlertEl = document.getElementById("h1-alert");
const canonicalEl = document.getElementById("canonical");
const canonicalStatusEl = document.getElementById("canonical-status");
const metaRobotsEl = document.getElementById("meta-robots");
const metaRobotsStatusEl = document.getElementById("meta-robots-status");
const dataYandexXGEl = document.getElementById("data-yandex-x");
const dataLangEl = document.getElementById("data-lang");
const dataLinksCounterEl = document.getElementById("data-links-counter");
const dataImagesCounterEl = document.getElementById("data-images-counter");
const fadeEl = document.getElementById("fade");
const fadeUrlEl = document.getElementById("fade-url");
const robotsUrlEl = document.getElementById("robots-url");
const robotsUrlTextEl = document.getElementById("robots-url-text");
const robotsUrlStatusEl = document.getElementById("robots-url-status");
const robotsEl = document.getElementById("robots");
const sitemapsEl = document.getElementById("sitemaps");
const sitemapsUrlEl = document.getElementById("sitemaps-url");
const sitemapsStatusEl = document.getElementById("sitemaps-status");
const h1CounterEl = document.getElementById("h1-counter");
const h2CounterEl = document.getElementById("h2-counter");
const h3CounterEl = document.getElementById("h3-counter");
const h4CounterEl = document.getElementById("h4-counter");
const h5CounterEl = document.getElementById("h5-counter");
const h6CounterEl = document.getElementById("h6-counter");
const hAllCounterEl = document.getElementById("h-all-counter");

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

// вкладка Page
const toolCacheGEl = document.getElementById("tool-cache-g");
const toolWebmasterEl = document.getElementById("tool-webmaster");

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

// вкладка Images
const imagesAllCounterEl = document.getElementById("images-all-counter");
const imagesWithAltCounterEl = document.getElementById("images-with-alt-counter");
const imagesWithoutAltCounterEl = document.getElementById("images-without-alt-counter");
const dataImagesEl = document.getElementById("data-images");

// вкладка Scheme
const toolSchemePcEl = document.getElementById("tool-scheme-pc");
const toolSchemeMobileEl = document.getElementById("tool-scheme-mobile");
const toolSchemeCheckEl = document.getElementById("tool-scheme-check");
const ogTable = document.getElementById("og-table");
const ogPreview = document.getElementById("og-preview");


// получаем активную вкладку браузера
(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    // console.log(url);

    if (url.protocol == "http:" || url.protocol == "https:") {
        // заполняем некоторые данные в попапе на основании ссылки, полученной из вкладки браузера
        const hostnameNoWww = url.hostname.replace(/^www\d*./, ""); //www23.site.com -> site.com
        const urlNoWww = `${hostnameNoWww}${url.pathname}`;
        const urlNoProtocol = `${url.hostname}${url.pathname}`;

        // вкладка Main
        urlEl.innerText = url.href;
        urlEl.href = url.href;
        dataYandexXGEl.src = `https://webmaster.yandex.ru/sqicounter?theme=light&host=${url.hostname}`


        // вкладка Search
        toolSearchGEl.href = `https://www.google.ru/search?q=site:${url.href}`;
        toolSearchYEl.href = `https://yandex.ru/search/?text=url:${urlNoWww} | url:${urlNoProtocol}`;
        toolDuplicateYEl.href = `https://yandex.ru/search/?text=title:("${tab.title}") site:${url.hostname}`;
        toolDomainYEl.href = `https://yandex.ru/search/?text=url:${url.hostname}/* | url:${hostnameNoWww}/* | url:${url.hostname} | url:${hostnameNoWww}`;
        toolSiteGEl.href = `https://www.google.ru/search?q=site:${url.hostname}`;
        toolSiteYEl.href = `https://yandex.ru/search/?text=site:${url.hostname}`;
        toolHostYEl.href = `https://yandex.ru/search/?text=host:${url.hostname}`;
        toolOrgGEl.href = `https://www.google.com/maps/search/${punycode.toUnicode(url.hostname)}`;
        toolOrgYEl.href = `https://yandex.ru/maps/?mode=search&text=${punycode.toUnicode(url.hostname)}`;

        // получаем ссылки со страницы поисковой выдачи
        if (url.href.match(/yandex.\w+\/search\//) || url.href.match(/google.\w+\/search/)) {
            toolCopyResultsEl.disabled = false;

            toolCopyResultsEl.addEventListener("click", async (e) => {
                let platform = "";
                if (url.hostname.includes("yandex")) { platform = "yandex" }
                if (url.hostname.includes("google")) { platform = "google" }
                let searchLinks = await chrome.tabs.sendMessage(tab.id, { action: "GET-SEARCHLINKS", platform: platform });
                if (searchLinks.length) {
                    navigator.clipboard.writeText(searchLinks.join("\n"))
                        .then(() => {
                            let toolAlertEl = e.target.querySelector(".tool__alert")
                            toolAlertEl.innerText = "Copied!";
                            setTimeout(() => { toolAlertEl.innerText = ""; }, 2000);
                        })
                        .catch(err => { console.log('Копирование не пашет', err); })
                }
            })
        }


        // вкладка Page
        toolCacheGEl.href = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url.href)}`;


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


        // вкладка Scheme
        toolSchemePcEl.href = `https://search.google.com/test/rich-results?url=${url.href}&user_agent=2`;
        toolSchemeMobileEl.href = `https://search.google.com/test/rich-results?url=${url.href}&user_agent=1`;
        toolSchemeCheckEl.href = `https://validator.schema.org/#url=${url.href}`;



        // запрашиваем данные из вкладки браузера
        const seodata = await chrome.tabs.sendMessage(tab.id, { action: "GET-SEODATA" });
        // console.log("3. Получен ответ от контент скрипта. В консоли расширения");
        console.log(seodata);

        if (Object.keys(seodata).length) {

            // обработка title
            if (seodata.titles.length) {
                if (seodata.titles.length > 1) { titleAlertEl.classList.add("is-active") }
                titleLengthEl.innerText = seodata.titles[0].length;

                if (seodata.titles[0].length) {
                    titleEl.innerText = seodata.titles[0];
                } else { titleEl.classList.add("is-empty") }
            } else { titleEl.classList.add("is-missing") }


            // обработка description
            if (seodata.descriptions.length) {
                if (seodata.descriptions.length > 1) { descriptionAlertEl.classList.add("is-active") }
                descriptionLengthEl.innerText = seodata.descriptions[0].length;

                if (seodata.descriptions[0].length) {
                    descriptionEl.innerText = seodata.descriptions[0];
                } else { descriptionEl.classList.add("is-empty") }
            } else { descriptionEl.classList.add("is-missing") }


            // обработка h1
            if (seodata.h1s.length) {
                if (seodata.h1s.length > 1) { h1AlertEl.classList.add("is-active") }
                if (seodata.h1s[0].length) {
                    h1El.innerText = seodata.h1s[0];
                    h1LengthEl.innerText = seodata.h1s[0].length;
                } else { h1El.classList.add("is-empty") }
            } else { h1El.classList.add("is-missing") }


            // обработка остальных заголовков
            let hAllCounter = 0;
            if (seodata.h1s.length) { h1CounterEl.innerText = seodata.h1s.length; h1CounterEl.classList.remove("data-counter__content--inactive"); hAllCounter += seodata.h1s.length; }
            if (seodata.h2s.length) { h2CounterEl.innerText = seodata.h2s.length; h2CounterEl.classList.remove("data-counter__content--inactive"); hAllCounter += seodata.h2s.length; }
            if (seodata.h3s.length) { h3CounterEl.innerText = seodata.h3s.length; h3CounterEl.classList.remove("data-counter__content--inactive"); hAllCounter += seodata.h3s.length; }
            if (seodata.h4s.length) { h4CounterEl.innerText = seodata.h4s.length; h4CounterEl.classList.remove("data-counter__content--inactive"); hAllCounter += seodata.h4s.length; }
            if (seodata.h5s.length) { h5CounterEl.innerText = seodata.h5s.length; h5CounterEl.classList.remove("data-counter__content--inactive"); hAllCounter += seodata.h5s.length; }
            if (seodata.h6s.length) { h6CounterEl.innerText = seodata.h6s.length; h6CounterEl.classList.remove("data-counter__content--inactive"); hAllCounter += seodata.h6s.length; }
            hAllCounterEl.innerText = hAllCounter;


            // обработка canonical
            if (seodata.canonicals.length) {
                canonicalEl.innerText = seodata.canonicals[0];
                canonicalEl.href = seodata.canonicals[0];

                if (seodata.canonicals.length > 1) {
                    canonicalStatusEl.classList.add("is-active");
                    canonicalStatusEl.querySelector(".status__icon").classList.add("icon", "icon--warning");
                    canonicalStatusEl.querySelector(".status__content").innerText = "Обнаружено несколько тегов Сanonical.";
                } else {
                    if (seodata.canonicals[0].length) {
                        if (new URL(seodata.canonicals[0]).href == url.href) {
                            canonicalStatusEl.classList.add("is-active");
                            canonicalStatusEl.querySelector(".status__icon").classList.add("icon", "icon--good");
                            canonicalStatusEl.querySelector(".status__content").innerText = "Индексация страницы разрешена. Эта страница назначена канонической.";
                        } else {
                            canonicalStatusEl.classList.add("is-active");
                            canonicalStatusEl.querySelector(".status__icon").classList.add("icon", "icon--warning");
                            canonicalStatusEl.querySelector(".status__content").innerText = "Индексация страницы запрещена, так как канонический url отличается от url этой страницы. Это не является ошибкой, но требует внимания.";
                        }
                    } else {
                        canonicalEl.classList.add("is-empty");
                    }
                }
            } else {
                canonicalEl.classList.add("is-missing");
                canonicalStatusEl.classList.add("is-active");
                canonicalStatusEl.querySelector(".status__icon").classList.add("icon", "icon--good");
                canonicalStatusEl.querySelector(".status__content").innerText = "Индексация страницы разрешена, так как канонический url не указан.";
            }


            // обработка lang
            if (seodata.langs.length) {
                if (seodata.langs[0]) {
                    if (seodata.langs[0].length) {
                        dataLangEl.innerText = seodata.langs[0];
                    } else { dataLangEl.classList.add("is-empty") }
                } else { dataLangEl.classList.add("is-missing") }
            } else { dataLangEl.classList.add("is-missing") }


            // подсчет ссылок
            if (seodata.links.length) {
                dataLinksCounterEl.innerHTML = seodata.links.length;
            }


            // обработка metarobots
            if (seodata.metarobots.length) {
                if (seodata.metarobots.length > 1) {
                    metaRobotsStatusEl.classList.add("is-active");
                    metaRobotsStatusEl.querySelector(".status__icon").classList.add("icon", "icon--warning");
                    metaRobotsStatusEl.querySelector(".status__content").innerText = "Обнаружено несколько тегов Robots.";
                } else {
                    metaRobotsEl.innerText = seodata.metarobots[0];

                    if (seodata.metarobots[0].length) {
                        // TODO: потенциальная ошибка. переделать в массив по разделителю и проверять целиком слово, а не вхождение подстроки в строку
                        if (seodata.metarobots[0].toLowerCase().includes("noindex")) {
                            metaRobotsStatusEl.classList.add("is-active");
                            metaRobotsStatusEl.querySelector(".status__icon").classList.add("icon", "icon--bad");
                            metaRobotsStatusEl.querySelector(".status__content").innerText = "Индексация страницы запрещена.";
                        } else if (seodata.metarobots[0].toLowerCase().includes("index")) {
                            metaRobotsStatusEl.classList.add("is-active");
                            metaRobotsStatusEl.querySelector(".status__icon").classList.add("icon", "icon--good");
                            metaRobotsStatusEl.querySelector(".status__content").innerText = "Индексация страницы разрешена.";
                        }
                        else {
                            metaRobotsStatusEl.classList.add("is-active");
                            metaRobotsStatusEl.querySelector(".status__icon").classList.add("icon", "icon--good");
                            metaRobotsStatusEl.querySelector(".status__content").innerText = "Запрет индексации страницы не обнаружен.";
                        }
                    } else {
                        metaRobotsEl.classList.add("is-empty");
                        metaRobotsStatusEl.classList.add("is-active");
                        metaRobotsStatusEl.querySelector(".status__icon").classList.add("icon", "icon--good");
                        metaRobotsStatusEl.querySelector(".status__content").innerText = "Запрет индексации страницы не обнаружен, так как тег Robots пустой.";
                    }
                }
            } else {
                metaRobotsEl.classList.add("is-missing");
                metaRobotsStatusEl.classList.add("is-active");
                metaRobotsStatusEl.querySelector(".status__icon").classList.add("icon", "icon--good");
                metaRobotsStatusEl.querySelector(".status__content").innerText = "Запрет индексации страницы не обнаружен, так как тег Robots не обнаружен.";
            }

            // обработка og
            if (Object.keys(seodata.ogdata).length) {
                Object.entries(seodata.ogdata).forEach(([key, value]) => {
                    let ogRow = document.createElement('tr');

                    let ogDataTitle = document.createElement('td');
                    ogDataTitle.classList.add("row-title");
                    ogDataTitle.innerText = key
                    ogRow.append(ogDataTitle)

                    let ogDataContent = document.createElement('td');
                    ogDataContent.classList.add("row-content");
                    ogDataContent.innerText = value;
                    ogRow.append(ogDataContent);

                    ogTable.append(ogRow);
                })

                if (seodata.ogdata['og:image']) {
                    let ogPic = document.createElement('div');
                    ogPic.classList.add("og__pic");

                    let ogImg = document.createElement('img');
                    ogImg.src = seodata.ogdata['og:image'];
                    ogPic.appendChild(ogImg);

                    ogPreview.appendChild(ogPic);
                }

                let ogContent = document.createElement('div');
                ogContent.classList.add("og__content");

                if (seodata.ogdata['og:title']) {
                    let ogTitle = document.createElement('div');
                    ogTitle.classList.add("og__title");
                    ogTitle.innerText = seodata.ogdata['og:title'];
                    ogContent.appendChild(ogTitle);
                }

                if (seodata.ogdata['og:description']) {
                    let ogSubtitle = document.createElement('div');
                    ogSubtitle.classList.add("og__subtitle");
                    ogSubtitle.innerText = seodata.ogdata['og:description'];
                    ogContent.appendChild(ogSubtitle);
                }

                if (seodata.ogdata['og:site_name']) {
                    let ogLink = document.createElement('div');
                    ogLink.classList.add("og__link");
                    ogLink.innerText = seodata.ogdata['og:site_name'];
                    ogContent.appendChild(ogLink);
                }

                ogPreview.appendChild(ogContent);
            } else {
                ogTable.classList.add('is-hidden');
            }


            // проверка наличия sitemap
            let isSitemapFileAviable = false;
            (async function () {
                const sitemapResponse = await fetch(`${url.origin}/sitemap.xml`, { mode: 'no-cors' }).catch(err => console.log("Ошибка при скачивании файла sitemap.xml"));
                if (sitemapResponse.status == 200) {
                    let sitemapText = await sitemapResponse.text();
                    sitemapText = sitemapText.trim();
                    if (sitemapText.startsWith("<?xml")) {
                        sitemapsUrlEl.href = `${url.origin}/sitemap.xml`;
                        isSitemapFileAviable = true;
                    }
                }
            }());


            // парсинг файла robots.txt
            (async function () {
                const robotsResponse = await fetch(`${url.origin}/robots.txt`, { mode: 'no-cors' }).catch(err => console.log("Ошибка при скачивании файла robots.txt"));
                if (robotsResponse.status == 200) {
                    robotsUrlEl.href = `${url.origin}/robots.txt`;
                    let robotsText = await robotsResponse.text();
                    // console.log(robotsText);

                    if (robotsText.trim().length) {
                        // прячем текст статуса, так как файл найден и в нем есть текст
                        robotsUrlTextEl.classList.add("is-hidden");

                        // получаем массив с агентами и их правилами
                        let robotsAgents = robotsText.split(/(?=user-agent:)/gi);
                        robotsAgents = robotsAgents.filter(row => !row.includes("#"));
                        robotsAgents = robotsAgents.map(row => row.split(/\r?\n/));
                        robotsAgents = robotsAgents.map(agent => agent.filter(row => row.includes(":")));
                        // console.log(robotsAgents);

                        let robotsData = robotsAgents.map(agent => {
                            if (agent.length > 1) {
                                let agentObj = {};
                                agentObj["title"] = agent[0].split(":")[1].trim();
                                agentObj["data"] = agent.slice(1);
                                return agentObj;
                            }
                        });
                        // console.log(robotsData);

                        // перебираем и показываем агентов
                        // ищем sitemap
                        let sitemapLinks = [];
                        let robotsHtml = "";
                        robotsData.forEach(agent => {
                            if (agent["title"] == "*") {
                                let sitemapRows = agent["data"].filter(row => row.toLowerCase().includes("sitemap:"));
                                if (sitemapRows.length) {
                                    sitemapLinks = sitemapRows.map(row => row.toLowerCase().replace("sitemap:", "").trim())
                                }
                            }

                            if (agent["title"].toLowerCase() == "yandex" || agent["title"].toLowerCase() == "googlebot" || agent["title"] == "*") {
                                // TODO: добавить проверку запрета обхода страницы
                                robotsHtml += `<li><span class="status-dot"></span> User-agent: ${agent["title"]}</li>`;
                            }
                        });

                        robotsEl.innerHTML = robotsHtml;

                        if (sitemapLinks.length) {
                            let sitemapsHtml = "";
                            sitemapLinks.forEach(i => sitemapsHtml += `<li><a href="${i}" target="_blank">${i}</a></li>`);
                            sitemapsEl.innerHTML = sitemapsHtml;
                        } else {
                            if (isSitemapFileAviable) {
                                sitemapsStatusEl.classList.add("is-active");
                                sitemapsStatusEl.querySelector(".status__icon").classList.add("icon", "icon--warning");
                                sitemapsStatusEl.querySelector(".status__content").innerText = "Файл sitemap.xml обнаружен, но отсутствуют директивы sitemap в файле robots.txt. Это требует внимания.";
                            } else {
                                sitemapsEl.classList.add("is-missing");
                                sitemapsStatusEl.classList.add("is-active");
                                sitemapsStatusEl.querySelector(".status__icon").classList.add("icon", "icon--warning");
                                sitemapsStatusEl.querySelector(".status__content").innerText = "В файле robots.txt не обнаружены директивы sitemap. Это требует внимания.";
                            }
                        }
                    } else {
                        robotsUrlTextEl.classList.add("is-empty");
                        robotsUrlStatusEl.classList.add("is-active");
                        robotsUrlStatusEl.querySelector(".status__icon").classList.add("icon", "icon--warning");
                        robotsUrlStatusEl.querySelector(".status__content").innerText = "Запрет индексации страницы не обнаружен, так как файл robots.txt пустой. Это требует внимания.";

                        if (isSitemapFileAviable) {
                            sitemapsStatusEl.classList.add("is-active");
                            sitemapsStatusEl.querySelector(".status__icon").classList.add("icon", "icon--warning");
                            sitemapsStatusEl.querySelector(".status__content").innerText = "Файл sitemap.xml обнаружен, но отсутствуют директивы sitemap, так robots.txt пустой. Это требует внимания.";
                        } else {
                            sitemapsEl.classList.add("is-missing");
                            sitemapsStatusEl.classList.add("is-active");
                            sitemapsStatusEl.querySelector(".status__icon").classList.add("icon", "icon--warning");
                            sitemapsStatusEl.querySelector(".status__content").innerText = "Не обнаружен файл sitemap.xml. Отсутствуют директивы sitemap, так как файл robots.txt пустой. Это требует внимания.";
                        }
                    }


                } else {
                    robotsUrlTextEl.classList.add("is-missing");
                    robotsUrlStatusEl.classList.add("is-active");
                    robotsUrlStatusEl.querySelector(".status__icon").classList.add("icon", "icon--warning");
                    robotsUrlStatusEl.querySelector(".status__content").innerText = "Запрет индексации страницы не обнаружен, так как файл robots.txt не обнаружен. Это требует внимания.";

                    if (isSitemapFileAviable) {
                        sitemapsStatusEl.classList.add("is-active");
                        sitemapsStatusEl.querySelector(".status__icon").classList.add("icon", "icon--warning");
                        sitemapsStatusEl.querySelector(".status__content").innerText = "Файл sitemap.xml обнаружен, но отсутствуют директивы sitemap, так как не обнаружен файл robots.txt. Это требует внимания.";
                    } else {
                        sitemapsEl.classList.add("is-missing");
                        sitemapsStatusEl.classList.add("is-active");
                        sitemapsStatusEl.querySelector(".status__icon").classList.add("icon", "icon--warning");
                        sitemapsStatusEl.querySelector(".status__content").innerText = "Не обнаружен файл sitemap.xml. Отсутствуют директивы sitemap, так как не обнаружен файл robots.txt. Это требует внимания.";
                    }
                }
            }());


            // обработка картинок
            if (seodata.images.length) {
                dataImagesCounterEl.innerHTML = seodata.images.length;

                imagesAllCounterEl.innerText = seodata.images.length
                imagesWithAltCounterEl.innerText = seodata.images.filter(i => i["alt"]).length;
                imagesWithoutAltCounterEl.innerText = seodata.images.filter(i => !i["alt"]).length;

                let dataImages = "";
                seodata.images.forEach(i => {

                    let filterQuery = "alt-true";
                    let titleStatusClass = "";
                    let altStatusClass = "";
                    if (!i.title) { i.title = "", titleStatusClass = "data-info--inactive" };
                    if (!i.alt) { i.alt = ""; filterQuery = "alt-false"; altStatusClass = "data-info--inactive" };
                    if (i.src.length && i.src[0] != "h") { i.src = `${url.origin}${i.src}` };

                    let description = "";
                    if (i.width == 0 || i.height == 0) {
                        description = "lazy";
                    } else {
                        description = `${i.width}x${i.height}`;
                    }

                    dataImages += `
                        <div class="data-row" data-filter="img-${filterQuery}">
                            <div class="data-row__pic">
                                <img src="${i.src}">
                                <div class="data-row__description">${description}</div>
                            </div>
                            <div class="data-row__content">
                                <div class="data-row__info data-info">
                                    <span class="data-info__content"><a href="${i.src}" target="_blank">${i.src}</a></span>
                                </div>
                                <div class="data-row__info data-info ${altStatusClass}">
                                    <span class="data-info__title">Alt:</span>
                                    <span class="data-info__content">${i.alt}</span>
                                </div>
                                <div class="data-row__info data-info ${titleStatusClass}">
                                    <span class="data-info__title">Title:</span>
                                    <span class="data-info__content">${i.title}</span>
                                </div>
                            </div>
                        </div>
                    `
                })
                dataImagesEl.innerHTML = dataImages;

            }

            setFilter()
        } else {
            console.log("Не получен ответ от контент скрипта");
        }

    } else {
        fadeEl.classList.add("is-active");
        fadeUrlEl.innerText = url.href;
    }
})();
