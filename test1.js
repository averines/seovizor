import Tools from './script/commonTools.js';
import { punycode } from '/script/punycode.js';
import { getString, tabsSwitcher } from './helpers.js';
import parseUrl from './utils/parseUrl.js';
import Robots from './script/Robots.js';
import fetchTextInfo from './services/textInfo.js';
import exportCSV from './popup/exportCSV.js';

const clipboard = async (value) => {
    if (!navigator.clipboard) {
        throw Error('error: navigator.clipboard');
    }

    return navigator.clipboard.writeText(value);
};


const CANONICAL_STATUS = {
    none: 'none',
    eq: 'eq',
    noHref: 'noHref',
    emptyHref: 'emptyHref',
    relativeHref: 'relativeHref',
    notEq: 'notEq',
    many: 'many',
};

const getCanonicalStatus = (canonicals, url) => {
    const getStatus = (canonical) => {
        let href = canonical.href;
        if (href === null) {
            return CANONICAL_STATUS.noHref;
        }

        href = href.trim();
        if (!href) {
            return CANONICAL_STATUS.emptyHref;
        }

        let hrefUrl = parseUrl(href);
        if (!hrefUrl) {
            return CANONICAL_STATUS.relativeHref;
        }

        hrefUrl.hash = '';
        url.hash = '';

        if (hrefUrl.href === url.href) {
            return CANONICAL_STATUS.eq;
        }

        return CANONICAL_STATUS.notEq;
    };

    if (!canonicals.length) {
        return CANONICAL_STATUS.none;
    }

    if (canonicals.length === 1) {
        return getStatus(canonicals[0]);
    }

    return CANONICAL_STATUS.many;
};

const getDescriptionByCanonicalStatus = (canonicalStatus, canonicals) => {
    if (canonicalStatus === CANONICAL_STATUS.none) {
        return '<span class="indexing-item__value">Тег отсутствует</span><br><p>Индексирование страницы разрешено</p> <i class="fa fa-circle-check ball ball__success"></i>';
    }

    if (canonicalStatus === CANONICAL_STATUS.eq) {
        return `<span class="indexing-item__value">${canonicals[0].href}</span><br><p>Текущая страница является канонической</p> <i class="fa fa-circle-check ball ball__success"></i>`;
    }

    if (canonicalStatus === CANONICAL_STATUS.noHref) {
        return 'Параметр href отсутствует<br><p>Содержимое тега указано некорректно, но индексирование страницы не запрещено</p><i class="ball ball__warning fa-solid fa-circle-exclamation"></i>';
    }

    if (canonicalStatus === CANONICAL_STATUS.emptyHref) {
        return 'Параметр href пустой<br><p>Содержимое тега указано некорректно, но индексирование страницы не запрещено</p><i class="ball ball__warning fa-solid fa-circle-exclamation"></i>';
    }

    if (canonicalStatus === CANONICAL_STATUS.relativeHref) {
        return `<span class="indexing-item__value">href="${canonicals[0].href}"</span><br><p>Содержимое тега указано некорректно, но индексирование страницы не запрещено</p> <i class="ball ball__warning fa-solid fa-circle-exclamation"></i>`;
    }

    if (canonicalStatus === CANONICAL_STATUS.notEq) {
        return `<span class="indexing-item__value">${canonicals[0].href}</span><br><p>Канонической является другая страница</p> <i class="ball ball__error fa-solid fa-circle-xmark"></i>`;
    }

    if (canonicalStatus === CANONICAL_STATUS.many) {
        const canonicalsWithBr = canonicals.map((canonical) => canonical.href).join('<br>');
        return `<span class="indexing-item__value">${canonicalsWithBr}</span><br><p>На странице одновременно указаны несколько тегов - это недопустимо, но индексирование страницы не запрещено</p><i class="ball ball__warning fa-solid fa-circle-exclamation"></i>`;
    }
};


const META_ROBOTS = ['robots', 'yandex', 'googlebot'];

const getMetaRobotStatus = (metaTags) => {
    const robots = Object.keys(metaTags).filter((key) => META_ROBOTS.includes(key));
    if (!robots.length) {
        return '<span class="indexing-item__value empty-value">Метатег отсутствует</span><br><p>Индексирование страницы разрешено</p><i class="fa fa-circle-check ball ball__success"></i>';
    }

    const isRobots = robots.length === 1 && robots[0] === 'robots';

    return robots
        .map((robot) => {
            if (!metaTags[robot].map((rule) => rule.content).filter(Boolean).length) {
                return `${!isRobots ? `${robot}<br>` : ''
                    }<p>На странице присутствует метатег ${robot}, но он пустой</p><i class="ball ball__warning fa-solid fa-circle-exclamation"></i>`;
            }

            const contents = metaTags[robot].map((rule) => rule.content).join();
            let content = contents;
            content = content.trim();
            if (!content) {
                return `${!isRobots ? `${robot}<br>` : ''
                    }<p>На странице присутствует метатег ${robot}, но он пустой</p><i class="ball ball__warning fa-solid fa-circle-exclamation"></i>`;
            }

            const ruleArr = content.split(',').map((contentArr) => contentArr.trim().toLowerCase());
            if (ruleArr.includes('none') || ruleArr.includes('noindex')) {
                return `${!isRobots ? `${robot}<br>` : ''
                    } <span class="indexing-item__value">${content}</span><br><p>Индексирование страницы запрещено</p><i class="ball ball__error fa-solid fa-circle-xmark"></i>`;
            }

            return `${!isRobots ? `${robot}<br>` : ''
                } <span class="indexing-item__value">${content}</span><br><p>Индексирование страницы разрешено</p><i class="ball ball__success fa fa-circle-check"></i>`;
        })
        .join('<br>');
};

const getRobotsMessage = (lines, rule) =>
    rule.isDisallowed
        ? `<p>Сканирование страницы запрещено правилом на строке ${rule.disallowLine}:<br>${lines[
            rule.disallowLine - 1
        ].join(': ')}</p><i class="ball ball__error fa-solid fa-circle-xmark"></i>`
        : '<p>Сканирование страницы разрешено</p><i class="ball ball__success fa fa-circle-check"></i>';

const getRobotsStatus = (statusCode, lines, meta) => {
    if (statusCode === 404) {
        return '<span class="indexing-item__value">Файл robots.txt отсутствует</span><br>Сканирование страницы разрешено</p><i class="ball ball__warning fa-solid fa-circle-exclamation"></i>';
    }

    if (statusCode !== 200) {
        return '<span class="indexing-item__value">Файл robots.txt недоступен</span><p>Сканирование страницы разрешено</p><i class="ball ball__warning fa-solid fa-circle-exclamation"></i>';
    }

    if (!lines.length) {
        return '<span class="indexing-item__value">Файл robots.txt пустой</span><br><p>Сканирование страницы разрешено</p><i class="ball ball__warning fa-solid fa-circle-exclamation"></i>';
    }

    if (!lines.filter(Boolean).length) {
        return '<span class="indexing-item__value">Файл robots.txt не содержит директив</span><br><p>Сканирование страницы разрешено</p><i class="ball ball__warning fa-solid fa-circle-exclamation"></i>';
    }

    const userAGents = Object.keys(meta);
    if (!userAGents.length) {
        return '<span class="indexing-item__value">В файл robots.txt отсутствует User-agent</span><br><p>Сканирование страницы разрешено</p><i class="ball ball__success fa fa-circle-check"></i>';
    }

    return userAGents
        .map(
            (userAgent) =>
                `<div style="position:relative"><span class="indexing-item__value">User-agent: ${userAgent}</span><br>${getRobotsMessage(
                    lines,
                    meta[userAgent],
                )}</div>`,
        )
        .join('<hr>');
};



const getPromise = (callback) => new Promise(callback);

const getJSDetails = (tab) =>
    getPromise((resolve) => {
        chrome.contentSettings.javascript.get(
            {
                incognito: tab.incognito,
                primaryUrl: tab.url,
            },
            resolve,
        );
    });

const checkIsExternal = (tag) => tag.isExternal && tag.hrefURL && ['http:', 'https:'].includes(tag.hrefURL.protocol);

const hrefFilter = (href) => (tag) => {
    if (href === 'external') {
        return checkIsExternal(tag);
    }

    return !tag.isExternal;
};

const protocolFilter = (protocol) => (tag) => {
    if (protocol === 'other') {
        return !tag.isAbsolutePath && !['http:', 'https:'].includes(tag.hrefURL.protocol);
    }

    return tag.href && tag.hrefURL.protocol === `${protocol}:`;
};

const relFilter = (rel) => (tag) => {
    if (rel === 'nofollow') {
        return tag.isNoFollow;
    }

    if (rel === 'other') {
        // не пустой и где не только nofollow
        let relContent = tag.rel;
        if (!relContent) {
            return false;
        }

        relContent = relContent.trim();
        if (!relContent) {
            return false;
        }

        return relContent !== 'nofollow';
    }

    return !tag.isNoFollow;
};

const statusCodeFilter = (statusCode) => (tag) => {
    const statusCodeIsNumber = typeof tag.statusCode === 'number';
    if (statusCode === '2xx') {
        return statusCodeIsNumber && tag.statusCode >= 200 && tag.statusCode <= 299;
    }

    if (statusCode === '3xx') {
        return statusCodeIsNumber && tag.statusCode >= 300 && tag.statusCode <= 399;
    }

    if (statusCode === '4xx') {
        return statusCodeIsNumber && tag.statusCode >= 400 && tag.statusCode <= 499;
    }

    if (statusCode === '5xx') {
        return statusCodeIsNumber && tag.statusCode >= 500 && tag.statusCode <= 599;
    }

    if (statusCode === 'other') {
        return !tag.isNeedCheck || tag.error || (statusCodeIsNumber && (statusCode < 200 || statusCode > 599));
    }

    return true;
};

const $createRedirect = (url) => {
    const $redirectTo = document.createElement('span');
    $redirectTo.innerHTML = `<span class="empty-value">� едирект: </span><a href="${url}" target="_blank">${url}</a>`;
    return $redirectTo;
};

const $createStatusCode = (statusCode) => {
    const $statusCode = document.createElement('b');
    $statusCode.classList.add('status-code');
    if (statusCode >= 200 && statusCode <= 299) {
        $statusCode.classList.add('status-code__success');
    } else if (statusCode >= 300 && statusCode <= 399) {
        $statusCode.classList.add('status-code__warning');
    } else {
        $statusCode.classList.add('status-code__error');
    }

    $statusCode.setAttribute('data-status-code', statusCode);
    $statusCode.innerHTML = statusCode;
    Object.assign($statusCode.style, {
        float: 'right',
    });

    return $statusCode;
};


const toggleJS = (tab) =>
    async function () {
        this.classList.toggle('active');
        this.firstElementChild.classList.toggle('fa-close');
        this.firstElementChild.classList.toggle('fa-check');

        try {
            const details = await getJSDetails(tab);
            const url = parseUrl(tab.url);
            await getPromise((resolve) => {
                chrome.contentSettings.javascript.set(
                    {
                        primaryPattern: `${url.origin}/*`,
                        setting: details.setting == 'allow' ? 'block' : 'allow',
                        scope: tab.incognito ? 'incognito_session_only' : 'regular',
                    },
                    resolve,
                );
            });
            chrome.tabs.reload(tab.id, { bypassCache: false });
            // Нужно очистить т.к. страница обновилась и все нашли настройки слетают
            const $showHeaderLightingButton = document.getElementById('showHeaderLighting');
            const $showHeaderLightingButtonIcon = $showHeaderLightingButton.querySelector('i');
            $showHeaderLightingButtonIcon.classList.add('fa-check');
            $showHeaderLightingButtonIcon.classList.remove('fa-close');
            $showHeaderLightingButton.classList.remove('active');

            const $showImageAtlButton = document.getElementById('showImageAtl');
            const $showImageAtlButtonIcon = $showImageAtlButton.querySelector('i');
            $showImageAtlButtonIcon.classList.add('fa-check');
            $showImageAtlButtonIcon.classList.remove('fa-close');
            $showImageAtlButton.classList.remove('active');

            const $showNoindexButton = document.getElementById('showNoindex');
            const $showNoindexButtonIcon = $showNoindexButton.querySelector('i');
            $showNoindexButtonIcon.classList.add('fa-check');
            $showNoindexButtonIcon.classList.remove('fa-close');
            $showNoindexButton.classList.remove('active');
        } catch (error) {
            console.log(error);
        }
    };

tabsSwitcher();

const executeScriptById = (tabId, id, func) =>
    document.getElementById(id).addEventListener('click', () => {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func,
        });
    });

const addDiv = (propClass, id, valueProp, items) => {
    if (!items.length) {
        Tools.addDiv(id, null, propClass);
        return;
    }

    if (items.length === 1) {
        Tools.addDiv(id, valueProp ? items[0][valueProp] : items[0], propClass, true);
        return;
    }

    Tools.addDiv(
        id,
        items
            .map((heading, i) => `<span style="color:#999;">${i + 1}:</span> ${valueProp ? heading[valueProp] : heading}`)
            .join('</br>'),
        propClass,
    );
};

const propClass = 'tabs-content__row_prop';
const resultClass = 'dropdown__item_result';
const btnClass = 'btn btn_arrow';

const fetchRobotsTXT = async (url) => {
    const response = await fetch(url, {
        mode: 'no-cors',
    });
    const statusCode = response.status;
    if (!response.ok) {
        return { statusCode, text: null };
    }

    const text = await response.text();

    return { statusCode, text };
};


const parseRobotsTXT = async (url, checkURL) => {
    const { statusCode, text } = await fetchRobotsTXT(url);
    const result = {
        url,
        statusCode,
    };
    if (statusCode !== 200) {
        return result;
    }

    const robotsParseResult = new Robots(url, text);
    result.sitemaps = robotsParseResult.getSitemaps();
    result.lines = robotsParseResult.getLines();
    result.meta = {};
    const userAgents = robotsParseResult.getUserAgents();
    for (const userAgent of userAgents) {
        result.meta[userAgent] = {};
        result.meta[userAgent].isDisallowed = robotsParseResult.isDisallowed(checkURL.href, userAgent);
        result.meta[userAgent].disallowLine = robotsParseResult.getMatchingLineNumber(checkURL.href, userAgent);
    }

    return result;
};

const checkSitemapXML = async (url) => {
    const response = await fetch(url);
    return response;
};

const onCopyElement = ($element, copyText) => async () => {
    try {
        await clipboard(copyText);
        const icon = $element.querySelector('i');
        const initialClass = icon.className;
        icon.className = 'fas fa-check';

        const tooltip = $element.querySelector('.copy-tooltip');
        const text = tooltip.innerHTML;
        tooltip.innerHTML = 'Скопировано';

        setTimeout(() => {
            tooltip.innerHTML = text;
            icon.className = initialClass;
        }, 1500);
    } catch (error) {
        console.log(error);
    }
};

const createOpenDropdown = (title, items, metaTags) => {
    const $div = document.createElement('div');
    $div.classList.add('tabs-content__row', 'tabs-content__row_dropdown');
    $div.innerHTML = `
      <div class="d-flex alst-column">
        <div class="tabs-content__row_name">${title}</div>
      </div>
      <div class="dropdown active">
        ${items
            .map(
                (name) => `
        <div class="dropdown__item">
          <div class="dropdown__item_name">${name}</div>
          <div class="dropdown__item_result">
            ${metaTags[name]
                        .map(({ content }) => {
                            const $div = document.createElement('div');
                            $div.innerText = content
                                ? content
                                : content
                                    ? null
                                    : content == ''
                                        ? `<span class="empty-value">Пустой</span>`
                                        : 'Отсутствует';
                            return `${$div.outerHTML}`;
                        })
                        .join('')}
          </div>
        </div>
        `,
            )
            .join('')}
      </div>`;
    return $div;
};

document.addEventListener('DOMContentLoaded', async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true, active: true });
    if (!tabs.length) {
        return;
    }

    const tab = tabs[0];
    const details = await getJSDetails(tab);
    if (details.setting == 'block') {
        const $buttonDisableJS = document.querySelectorAll('#page .btn_arrow#disableJS:not(.active)')[0];
        $buttonDisableJS.classList.add('active');
        $buttonDisableJS.firstElementChild.classList.toggle('fa-close');
        $buttonDisableJS.firstElementChild.classList.toggle('fa-check');
    }

    const tabId = tab.id;
    const url = new URL(tab.url);
    let encodedPunyCodeUrl = url.hostname.indexOf('xn--') === -1 ? url.hostname : punycode.toUnicode(url.hostname);

    Tools.addLink('url', url.href, propClass);
    Tools.addLink('cms', 'https://be1.ru/cms/?url=' + url.hostname, btnClass);
    Tools.addLink('searchAtYaMaps', 'https://yandex.ru/maps/?mode=search&text=' + url.hostname, btnClass);
    Tools.addLink('searchAtGoogleMaps', 'https://www.google.com/maps/search/' + encodedPunyCodeUrl, btnClass);
    Tools.createLinkListener('checkSiteYandexSite', 'https://yandex.ru/search/?text=site%3A' + url.hostname);
    Tools.createLinkListener('checkHostYandexSite', 'https://yandex.ru/search/?text=host%3A' + url.hostname);
    Tools.createLinkListener('checkSiteGoogleSite', 'https://www.google.ru/search?q=site%3A' + url.hostname);
    Tools.createLinkListener('openGooglePageSpeed', 'https://developers.google.com/speed/pagespeed/insights/?url=' + url);
    Tools.createLinkListener('openGoogleMobileFriendlyTest', 'https://search.google.com/test/mobile-friendly?url=' + url);
    Tools.createLinkListener('checkSSL', 'https://www.sslshopper.com/ssl-checker.html#hostname=' + url.hostname);
    Tools.createLinkListener('checkWhoisInfoRegRU', 'https://www.webnames.ru/whois?domname=' + url.hostname);
    Tools.createLinkListener(
        'showPageInGoogleCache',
        'https://webcache.googleusercontent.com/search?q=cache:' + encodeURIComponent(url),
    );
    Tools.createLinkListener('checkDoublesBe1', 'https://be1.ru/dubli-stranic/?url=' + url.hostname);
    Tools.createLinkListener(
        'openSchemaOrgMicrodataValidator',
        'https://validator.schema.org/#url=' + encodeURIComponent(url),
    );
    Tools.createLinkListener(
        'openGoogleRichResultMobileTest',
        'https://search.google.com/test/rich-results?url=' + encodeURIComponent(url) + '&user_agent=1',
    );
    Tools.createLinkListener(
        'openGoogleRichResultPCTest',
        'https://search.google.com/test/rich-results?url=' + encodeURIComponent(url) + '&user_agent=2',
    );
    Tools.createLinkListener('openWebarchive', 'https://web.archive.org/web/*/' + url);
    Tools.createLinkListener(
        'yandexCheckDuplicate',
        'https://yandex.ru/search/?text=title%3A(%22' + tabs[0].title + '%22)%20site%3A' + url.hostname,
    );

    const initReviewTabResponse = await chrome.tabs.sendMessage(tabId, { action: 'init_review_tab' });
    const { titles, metaTags, canonicals = [], hreflangs = [] } = initReviewTabResponse.head;
    const { description = [], keywords = [] } = metaTags;
    const { headings = [], aTags = [], imgTags = [] } = initReviewTabResponse.body;

    const preparedATags = aTags.map((tag) => ({
        ...tag,
        hrefURL: tag.hrefFull ? new URL(tag.hrefFull) : null,
    }));

    const $microdata = document.getElementById('microdata');
    const ogMetaTags = Object.keys(metaTags).filter((name) => name.indexOf('og') === 0);
    if (ogMetaTags.length) {
        $microdata
            .querySelector('.tabs-content__col')
            .append(createOpenDropdown('� азметка open graph', ogMetaTags, metaTags));
    } else {
        const $container = document.createElement('div');
        $container.innerHTML = `<div class="tabs-content__row alst-column">
    <div class="tabs-content__row_name">� азметка open graph</div>
    <div class="tabs-content__row_prop empty-value">
      <div class="result">Отсутствует</div>
    </div>
  </div>
  `;
        $microdata.querySelector('.tabs-content__col').append($container);
    }

    const twitterMetaTags = Object.keys(metaTags).filter((name) => name.indexOf('twitter') === 0);
    if (twitterMetaTags.length) {
        $microdata
            .querySelector('.tabs-content__col')
            .append(createOpenDropdown('� азметка Twitter', twitterMetaTags, metaTags));
    } else {
        const $container = document.createElement('div');
        $container.innerHTML = `<div class="tabs-content__row alst-column">
    <div class="tabs-content__row_name">� азметка Twitter</div>
    <div class="tabs-content__row_prop empty-value">
      <div class="result">Отсутствует</div>
    </div>
  </div>
  `;
        $microdata.querySelector('.tabs-content__col').append($container);
    }

    const dropdownWrapper = document.createElement('div');
    dropdownWrapper.className = 'dropdown__wrapper';

    const dropdownScrollContainer = document.createElement('div');
    dropdownScrollContainer.className = 'dropdown__scroll_container';

    Tools.setData('allTitles', headings.length);

    const $allTitlesCopy = document.querySelector('#allTitles .copy-icon');
    const headingCounters = {
        H1: [],
        H2: [],
        H3: [],
        H4: [],
        H5: [],
        H6: [],
    };

    let headingsStr = '';
    const el = document.createElement('div');
    const elContent = document.createElement('div');
    for (const heading of headings) {
        const $heading = document.createElement('span');
        headingCounters[heading.nodeName].push(heading);
        $heading.className = `dropdown__title heading-${heading.nodeName}`;
        const headingStr = `<${heading.nodeName}> ${heading.innerText}`;
        $heading.innerText = headingStr;
        const tabs = Array(parseInt(heading.nodeName.at(-1)) - 1)
            .fill(0)
            .reduce((acc) => (acc += '\t'), '');
        headingsStr += `${tabs}${headingStr}\n`;
        elContent.appendChild($heading);
    }

    $allTitlesCopy.addEventListener('click', onCopyElement($allTitlesCopy, headingsStr));

    addDiv(propClass, 'h1', 'innerText', headingCounters.H1);

    for (const tagName in headingCounters) {
        const tagNameLoweCase = tagName.toLowerCase();
        const $headingLength = document.getElementById(`${tagNameLoweCase}Length`);

        const headings = headingCounters[tagName];
        const length = headings.length;

        Tools.setData(`${tagNameLoweCase}Length`, length);

        if (!length) {
            continue;
        }

        const dropdownWrapper = document.createElement('div');
        dropdownWrapper.className = 'dropdown__wrapper';
        const dropdownScrollContainer = document.createElement('div');
        dropdownScrollContainer.className = 'dropdown__scroll_container';
        for (const i of headings) {
            let elem = document.createElement('p');
            elem.innerHTML = i.innerText;
            dropdownScrollContainer.appendChild(elem);
        }

        dropdownWrapper.appendChild(dropdownScrollContainer);
        $headingLength.querySelector('.dropdown').appendChild(dropdownWrapper);
    }

    el.appendChild(elContent);
    dropdownScrollContainer.appendChild(el);
    dropdownWrapper.appendChild(dropdownScrollContainer);

    document.querySelector('#allTitles').querySelector('.dropdown').appendChild(dropdownWrapper);

    if (hreflangs.length) {
        const $hreflangsContainer = document.createElement('div');
        $hreflangsContainer.classList.add('tabs-content__row', 'tabs-content__row_dropdown');

        const $hreflangsButton = document.createElement('button');
        const $icon = document.createElement('i');
        $icon.classList.add('fa', 'fa-chevron-down');
        $hreflangsButton.append($icon);

        $hreflangsButton.classList.add('btn', 'btn_arrow');
        $hreflangsButton.setAttribute('type', 'button');

        $hreflangsButton.addEventListener('click', () => {
            $hreflangsContainer.querySelector('.dropdown').classList.toggle('active');
            $icon.classList.toggle('fa-chevron-down');
            $icon.classList.toggle('fa-chevron-up');
        });

        const $container = document.createElement('div');
        $container.classList.add('d-flex', 'alst-column');

        const $containerName = document.createElement('div');
        $containerName.classList.add('tabs-content__row_name');
        $containerName.textContent = 'Hreflang';

        const $containerProp = document.createElement('div');
        $containerProp.classList.add('tabs-content__row_prop');
        $containerProp.textContent = `Найдено: ${hreflangs.length}`;

        $container.append($containerName, $containerProp, $hreflangsButton);

        const $dropdown = document.createElement('div');
        $dropdown.classList.add('dropdown');
        if (hreflangs.length <= 5) {
            $dropdown.classList.add('active');
            $icon.classList.remove('fa-chevron-down');
            $icon.classList.add('fa-chevron-up');
        }

        for (const { hreflang, href } of hreflangs) {
            const $dropdownItem = document.createElement('div');
            $dropdownItem.classList.add('dropdown__item');

            const $dropdownItemName = document.createElement('div');
            $dropdownItemName.classList.add('dropdown__item_name');
            $dropdownItemName.textContent = hreflang;

            const $dropdownItemResult = document.createElement('a');
            $dropdownItemResult.classList.add('dropdown__item_result');
            $dropdownItemResult.textContent = href;
            $dropdownItemResult.setAttribute('href', href);
            $dropdownItemResult.setAttribute('target', '_blank');

            $dropdownItem.append($dropdownItemName, $dropdownItemResult);

            $dropdown.append($dropdownItem);
        }

        $hreflangsContainer.append($container, $dropdown);

        document.getElementById('lang').after($hreflangsContainer);
    }

    const data = {
        img: imgTags,
    };

    let res = [];
    for (let key in data) {
        let el = document.getElementById(`${key}Length`);

        res = data[key].filter((i) => i !== '');

        Tools.setData(`${key}Length`, res.length);

        if (el.querySelector('.dropdown') !== null && res.length) {
            let dropdownWrapper = document.createElement('div');
            dropdownWrapper.className = 'dropdown__wrapper';

            let dropdownScrollContainer = document.createElement('div');
            dropdownScrollContainer.className = 'dropdown__scroll_container';

            for (let i of res) {
                let elem = document.createElement('p');
                elem.innerHTML = i !== '' ? i : null;
                dropdownScrollContainer.appendChild(elem);
            }

            dropdownWrapper.appendChild(dropdownScrollContainer);
            el.querySelector('.dropdown').appendChild(dropdownWrapper);
        }

        const imagesWithAlt = res.filter((i) => i.alt !== '');
        const imagesWithoutAlt = res.filter((i) => i.alt == '');

        if (res.length && el.id == 'imgLength') {
            res = data[key];
            for (let i of res) {
                const isBase64 = i.src.indexOf('data') === 0;
                const isAbsolutePath = i.src.includes('http');
                const link = isBase64 || isAbsolutePath ? i.src : `${url.origin}${i.src}`;
                let row = document.createElement('div');
                row.className = 'tabs-content__row';
                const content =
                    i.src !== ''
                        ? `<a class="tabs-content__row_prop" href="${link}" target="_blank">${link}</a>`
                        : 'ссылка пустая или не обнаружена';
                row.innerHTML = `
        					<div class="d-flex alst-column">
        						<div class="tabs-content__row_image">
        							<img src="${link}" crossorigin="anonymous"/>
        						</div>
        						<div>
        							<p class="tabs-content__row_prop ${i.alt === null || !i.alt.trim().length ? 'empty-value' : ''
                    } "><span class="empty-value">Alt: </span>${i.alt === null ? 'Отсутствует' : i.alt.trim().length ? i.alt : 'Пустой'
                    }</p>
                      <p>${content}</p>
        							<p class="tabs-content__row_prop ${i.title === null || !i.title.trim().length ? 'empty-value' : ''
                    } "><span class="empty-value">Title: </span>${i.title === null ? 'Отсутствует' : i.title.trim().length ? i.title : 'Пустой'
                    }</p>
        						</div>
        					</div>
        				`;
                document.querySelector('#images .tabs-content__inner> .tabs-content__col').appendChild(row);
            }

            el.addEventListener('click', function () {
                document.querySelector('[data-tab = overview]').classList.remove('active');
                document.querySelector('#overview').classList.remove('active');

                document.querySelector('[data-tab = images]').classList.add('active');
                document.querySelector('#images').classList.add('active');
            });
        }

        document.getElementById('imagesTotalLength').querySelector('.counter').innerHTML = res.length;
        document.getElementById('imagesWithAltLength').querySelector('.counter').innerHTML = imagesWithAlt.length;
        document.getElementById('imagesWithoutAltLength').querySelector('.counter').innerHTML = imagesWithoutAlt.length;
    }

    document.addEventListener('click', function (e) {
        e.stopPropagation();
        const el = document.querySelector('.overview-info');
        const dropdowns = el.querySelectorAll('.dropdown');
        const overley = document.querySelector('.overley');

        if (!el.contains(e.target)) {
            if (el.querySelector('.dropdown.active') !== null) {
                el.querySelector('.dropdown.active').classList.remove('active');
                el.querySelector('.overview-info__tab.active').classList.remove('active');
            }
        }

        if (e.target.closest('.overview-info__tab')) {
            let el = e.target.closest('.overview-info__tab');

            for (let i of dropdowns) {
                if (el.parentElement.id !== i.parentElement.id) {
                    i.classList.contains('active') ? i.classList.remove('active') : null;
                    i.parentElement.querySelector('.overview-info__tab').classList.contains('active')
                        ? i.parentElement.querySelector('.overview-info__tab').classList.remove('active')
                        : null;
                }
            }
            if (el.parentElement.querySelector('.dropdown .dropdown__wrapper') !== null) {
                el.classList.toggle('active');
                el.parentElement.querySelector('.dropdown')?.classList.toggle('active');
            }
        }

        if (e.target.closest('.close')) {
            const el = e.target.closest('.close');
            close(el.closest('.dropdown'));
            el.closest('.overview-info__el').querySelector('.overview-info__tab').classList.remove('active');
        }

        if (el.querySelector('.dropdown.active')) {
            overley.classList.add('active');
        } else {
            overley.classList.remove('active');
        }
    });

    const close = (el) => {
        el.classList.remove('active');
    };

    addDiv(propClass, 'lang', null, [initReviewTabResponse.lang]);
    addDiv(
        propClass,
        'title',
        'innerText',
        titles.filter((title) => title.isFromHead),
    );
    addDiv(propClass, 'description', 'content', description);
    addDiv(propClass, 'keywords', 'content', keywords);

    const urlRobotsTXT = `${url.origin}/robots.txt`;

    let sitemaps = [];

    try {
        const {
            statusCode: statusCodeRobotsTXT,
            sitemaps: robotsTextSitemaps = [],
            lines,
            meta,
        } = await parseRobotsTXT(urlRobotsTXT, url);
        if (robotsTextSitemaps.length) {
            sitemaps = robotsTextSitemaps;
        }
        addDiv(resultClass, 'indexing-robots', null, [getRobotsStatus(statusCodeRobotsTXT, lines, meta)]);
    } catch (error) {
        console.error(error);
    }

    const $sitemapXml = document.getElementById('sitemapXml');
    const $sitemapXmlProp = $sitemapXml.querySelector('.tabs-content__row_prop');
    const $sitemapXmlButton = $sitemapXml.querySelector('button');
    const $sitemapXmlButtonIcon = $sitemapXmlButton.querySelector('i');
    const $sitemapXmlDropdown = $sitemapXml.querySelector('.dropdown');

    $sitemapXmlButton.addEventListener('click', () => {
        $sitemapXmlDropdown.classList.toggle('active');
        $sitemapXmlButtonIcon.classList.toggle('fa-chevron-down');
        $sitemapXmlButtonIcon.classList.toggle('fa-chevron-up');
    });
    if (!sitemaps.length) {
        const sitemapURL = `${url.origin}/sitemap.xml`;
        try {
            const response = await checkSitemapXML(sitemapURL);
            if (response.ok) {
                sitemaps.push(sitemapURL);
            }
        } catch (error) {
            console.error(error);
        }
    }

    sitemaps.map((sitemap) => {
        const $div = document.createElement('div');
        $div.classList.add('dropdown__item');
        const $aTag = document.createElement('a');
        $aTag.setAttribute('href', sitemap);
        $aTag.setAttribute('target', '_blank');
        $aTag.style.wordBreak = 'break-all';
        $aTag.text = sitemap;
        $div.append($aTag);

        $sitemapXmlDropdown.append($div);
    });
    if (sitemaps.length) {
        $sitemapXmlButton.style.display = 'block';
        $sitemapXmlProp.innerHTML = `Найдено: ${sitemaps.length}`;
        if (sitemaps.length <= 5) {
            $sitemapXmlDropdown.classList.add('active');
            $sitemapXmlButtonIcon.classList.remove('fa-chevron-down');
            $sitemapXmlButtonIcon.classList.add('fa-chevron-up');
        }
    } else {
        $sitemapXmlProp.classList.add('empty-value');
        $sitemapXmlProp.innerHTML = 'Отсутствует';
    }

    const canonicalStatus = getCanonicalStatus(canonicals, url);
    addDiv(resultClass, 'indexing-canonical', null, [getDescriptionByCanonicalStatus(canonicalStatus, canonicals)]);

    document.getElementById('indexing-robots').querySelector('a').setAttribute('href', urlRobotsTXT);

    addDiv(resultClass, 'indexing-metatag', null, [getMetaRobotStatus(metaTags)]);

    const state = await chrome.tabs.sendMessage(tabId, {
        action: 'get_statuses',
    });
    for (let key in state) {
        let el = document.querySelector(`#${key}`);
        if (state[key] === true) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    }

    const $yandexCopyButton = document.getElementById('yandexCopy');
    $yandexCopyButton.addEventListener('click', () => {
        const icon = $yandexCopyButton.querySelector('i');
        const initialClass = icon.className;
        icon.className = 'fas fa-check';

        chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                var textarea = document.createElement('textarea');
                textarea.className = 'alst_copy_text';
                let links = [];
                if (location.host == 'www.yandex.ru' || location.host == 'yandex.ru') {
                    links = document.querySelectorAll('a.link.organic__url');
                } else {
                    links = [];
                    document.querySelectorAll('#rcnt div.g h3').forEach(function (el) {
                        links.push(el.closest('a'));
                    });
                }
                for (var x = 0; x < links.length; x++) {
                    if (links[x] !== null) {
                        textarea.innerHTML += links[x].getAttribute('href') + '\r\n';
                    }
                }
                var body = document.body;
                body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                textarea.parentNode.removeChild(textarea);
            },
        });

        setTimeout(() => {
            icon.className = initialClass;
        }, 1500);
    });

    executeScriptById(tabId, 'checkYandexUrl', () => {
        (function (domain) {
            domain = location.host;
            let domain2;
            if (domain.match(/^www\..*$/)) {
                domain2 = domain.substr(4);
            } else {
                domain2 = 'www.' + domain;
            }

            window.open(
                'https://yandex.ru/search/?how=tm&text=url:' +
                domain +
                '/* | url:' +
                domain2 +
                '/* | url:' +
                domain +
                ' | url:' +
                domain2,
            );
        })(document.location.href.match(/^htt(p|ps):\/\/(?:www\.)?(.*?)\/?$/)[2] || '');
    });
    executeScriptById(tabId, 'checkSiteYandexCurrentUrl', () => {
        (function (domain) {
            const encodeDomain = encodeURIComponent(domain);
            window.open(`https://yandex.ru/search/?how=tm&text=url:${encodeDomain}+|+url:www.${encodeDomain}`);
        })(document.location.href.match(/^htt(p|ps):\/\/(?:www\.)?(.*?)\/?$/)[2] || '');
    });
    executeScriptById(tabId, 'checkSiteGoogleCurrentUrl', () => {
        window.open('https://www.google.ru/search?q=site:' + encodeURIComponent(`${document.location.href}`));
    });
    executeScriptById(tabId, 'checkCheckTrust', () => {
        window.open('https://checktrust.ru/analyze/' + encodeURIComponent(`${document.location.hostname}`));
    });
    executeScriptById(tabId, 'checkBertal', () => {
        window.open(`https://www.bertal.ru?url=${document.location.href}`);
    });
    executeScriptById(tabId, 'showNoindex', () => {
        function getNode(elem, dir, until) {
            var matched = [],
                cur = elem[dir];

            while (cur && cur.nodeType !== 9) {
                if (until !== undefined && cur.nodeName.toLowerCase() === until) {
                    matched.push(cur);
                }
                cur = cur[dir];
            }
            return matched;
        }

        function decorateChildTag(elem, tag, data, event) {
            var children = elem.getElementsByTagName(tag) || [],
                i = children.length;

            if (['nofollow', 'sponsored', 'ugc'].includes(event)) {
                let node, parent;
                for (let re = new RegExp(event); i--;) {
                    node = children[i];
                    if (node.nodeName.toLowerCase() === 'a' && re.test(node.getAttribute('rel'))) {
                        node.classList.add(data);
                    }

                    if (node.nodeName.toLowerCase() === 'img') {
                        parent = getNode(node, 'parentNode', 'a')[0];
                        if (parent && re.test(parent.getAttribute('rel'))) {
                            node.classList.add(data);
                        }
                    }
                }
            }
        }

        function decorateTag(event, data, tag) {
            var parents;

            if (event === 'noindex') {
                parents = document.getElementsByTagName(event);
                for (let i = 0, l = parents.length; i < l; i++) {
                    parents[i].classList.add(data[0]);
                }
            }

            if (['nofollow', 'sponsored', 'ugc', 'canonical', 'outlinks', 'displaynone'].includes(event)) {
                decorateChildTag(document.body || document.firstElementChild, tag, data, event);
            }
        }

        function FixCommentsNoindexs() {
            var el = document.getElementsByTagName('*'),
                i = el.length,
                element,
                noindex,
                app_noindex,
                l,
                n;

            //appending noindex tags
            for (; i--;) {
                if (el[i].childNodes) {
                    element = el[i].childNodes;
                    n = element.length;
                    for (; n--;) {
                        if (element[n].nodeType === 8 && element[n].nodeValue === 'noindex') {
                            noindex = document.createElement('noindex');
                            element[n].parentNode.insertBefore(noindex, element[n + 1]);
                        }
                    }
                }
            }

            //filling empty noindex
            app_noindex = document.getElementsByTagName('noindex');
            l = app_noindex.length;
            for (; l--;) {
                if (
                    app_noindex[l].previousSibling &&
                    app_noindex[l].previousSibling.nodeType === 8 &&
                    app_noindex[l].previousSibling.nodeValue === 'noindex'
                ) {
                    while (
                        app_noindex[l].nextSibling &&
                        //app_noindex[l].nextSibling.nodeType !== 8 &&
                        app_noindex[l].nextSibling.nodeValue !== '/noindex'
                    ) {
                        app_noindex[l].appendChild(app_noindex[l].nextSibling);
                    }
                }
            }
        }

        function CreateCSS(name, styleNode) {
            let str = '';

            str += `.${name}_clr_bg_txt_and_img, .${name}_clr_bg_txt_and_img * { color: #000000 !important; background-color: #DAA520 !important;}`;

            str += `.${name}_cross_txt, .${name}_cross_txt * { text-decoration: line-through !important; }`;

            styleNode.textContent += str;
        }

        function StartHilighting() {
            let styleNode = document.createElement('style');
            styleNode.id = 'alst_highlighting';
            document.head.appendChild(styleNode);

            // NoIndex
            FixCommentsNoindexs();
            CreateCSS('NoIndex', styleNode);

            decorateTag('noindex', ['NoIndex_clr_bg_txt_and_img'], null);

            decorateTag('noindex', ['NoIndex_cross_txt'], null);

            // NoFollow
            let cssText = '';

            cssText += `outline: 1px dashed #000000;`;

            cssText += `text-decoration: line-through !important;`;

            styleNode.textContent += `a.rds_hl_nofollow {${cssText}}`;
            decorateTag('nofollow', 'rds_hl_nofollow', 'a');

            styleNode.textContent += `img.rds_hl_nofollow {outline: 1px dashed #DAA520;}`;
            decorateTag('nofollow', 'rds_hl_nofollow', 'img');

            // Sponsored

            cssText = '';

            cssText += `text-decoration: line-through !important;`;

            if (cssText) {
                styleNode.textContent += `a.rds_hl_sponsored {${cssText}}`;
                decorateTag('sponsored', 'rds_hl_sponsored', 'a');
                styleNode.textContent += `img.rds_hl_sponsored {outline: 1px dashed #000000;}`;
                decorateTag('sponsored', 'rds_hl_sponsored', 'img');
            }

            // UGC
            cssText = '';

            cssText += `text-decoration: line-through !important;`;

            if (cssText) {
                styleNode.textContent += `a.rds_hl_ugc {${cssText}}`;
                decorateTag('ugc', 'rds_hl_ugc', 'a');
                styleNode.textContent += `img.rds_hl_ugc {outline: 1px dashed #000000;}`;
                decorateTag('ugc', 'rds_hl_ugc', 'img');
            }
        }

        function stopHighlighting() {
            let styleNode = document.getElementById('alst_highlighting');
            document.head.removeChild(styleNode);

            [
                'NoIndex_clr_bg_txt_and_img',
                'NoIndex_cross_txt',
                'rds_hl_nofollow',
                'rds_hl_sponsored',
                'rds_hl_ugc',
                'rds_hl_canonical',
                'rds_hl_outlinks',
                'rds_hl_displaynone',
            ].forEach((cssClass) => {
                let nodes = document.getElementsByClassName(cssClass);
                for (let node of nodes) node.classList.remove(cssClass);
            });
        }

        function toggleHighlighting() {
            if (document.getElementById('alst_highlighting')) {
                stopHighlighting();
            } else {
                StartHilighting();
            }
        }

        toggleHighlighting();
    });

    const yaIksImage = document.createElement('img');
    yaIksImage.src = 'https://webmaster.yandex.ru/sqicounter?theme=light&host=' + url.hostname;
    document.getElementById('yaIksImg').appendChild(yaIksImage);

    document.getElementById('yandexPereobhod').addEventListener('click', function () {
        try {
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                let url = new URL(tabs[0].url);

                var urlTa = document.createElement('textarea');
                var body = document.querySelector('body');
                body.appendChild(urlTa);
                urlTa.innerHTML = url.origin + url.pathname;
                urlTa.select();
                document.execCommand('copy');
                body.removeChild(urlTa);

                let port = '80';
                if (url.protocol == 'https:') {
                    port = '443';
                }

                chrome.tabs.create(
                    {
                        active: true,
                        url: 'https://webmaster.yandex.ru/site/' + url.protocol + url.hostname + ':' + port + '/indexing/reindex/',
                    },
                    function () { },
                );
            });
        } catch (e) {
            console.error('Error:', e.message);
        }
    });

    const $textInfo = document.getElementById('textInfo');
    const $showTextInfo = document.getElementById('showTextInfo');
    $showTextInfo.addEventListener('click', async () => {
        const $dropdown = $textInfo.querySelector('.dropdown');
        if ($dropdown.classList.contains('active')) {
            $dropdown.classList.remove('active');
            return;
        }

        try {
            const $icon = $showTextInfo.querySelector('i');
            $icon.classList.remove('fa-chevron-down');

            $icon.classList.add('fa-spinner', 'fa-spin');

            const response = await fetchTextInfo(tab.url);

            $dropdown.classList.add('active');

            $icon.classList.remove('fa-spinner', 'fa-spin');
            $icon.classList.add('fa-chevron-up');

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const result = await response.json();
            if (result.error) {
                $dropdown.innerHTML = `<div class="error-msg">${result.error}</div>`;
                return;
            }

            let $textInfoObj = {
                $charactersWords: '',
                $characters: '',
                $lemma_words: [],
                $bigrammes: [],
                $ankors: [],
                $words_without_a: [],
                $words_with_alt: [],
            };

            // setting values
            for (let prop in result) {
                if (typeof result[prop] === 'object') {
                    for (let key in $textInfoObj) {
                        if (key === `$${prop}`) {
                            if (Object.values(result[prop]).length) {
                                let res = getString(result[prop]);

                                $textInfoObj[key] = res;
                            }
                        }
                    }
                } else {
                    for (let key in $textInfoObj) {
                        if (key === `$${prop}`) {
                            if (result[prop] !== '') {
                                $textInfoObj[key] = result[prop];
                            }
                        }
                    }
                }
            }

            document.getElementById('ankors').querySelector('.dropdown__item_result').innerHTML = $textInfoObj.$ankors;
            document.getElementById('bigrammes').querySelector('.dropdown__item_result').innerHTML = $textInfoObj.$bigrammes;
            document.getElementById('characters').querySelector('.dropdown__item_result').innerHTML =
                $textInfoObj.$characters;
            document.getElementById('charactersWords').querySelector('.dropdown__item_result').innerHTML =
                $textInfoObj.$charactersWords;
            document.getElementById('lemma_words').querySelector('.dropdown__item_result').innerHTML =
                $textInfoObj.$lemma_words;
            document.getElementById('words_with_alt').querySelector('.dropdown__item_result').innerHTML =
                $textInfoObj.$words_with_alt;
            document.getElementById('words_without_a').querySelector('.dropdown__item_result').innerHTML =
                $textInfoObj.$words_without_a;
        } catch (error) {
            document
                .getElementById('textInfo')
                .querySelector(
                    '.dropdown',
                ).innerHTML = `<div class="error-msg">Невозможно отобразить статистику текста страницы.</div>`;
        }
    });

    document.getElementById('showNoindex').addEventListener('click', function () {
        this.classList.toggle('active');
        this.firstElementChild.classList.toggle('fa-close');
        this.firstElementChild.classList.toggle('fa-check');
        try {
            chrome.tabs.sendMessage(tabId, {
                action: 'set_status',
                key: 'showNoindex',
                state: !!state.showNoindex,
            });
        } catch (e) {
            console.error('Error:', e.message);
        }
    });

    document.getElementById('showHeaderLighting').addEventListener('click', function () {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                var style = document.getElementById('bstrongemhighlight');
                if (style) {
                    style.remove();
                } else {
                    var bStngEm = document.createElement('style');
                    bStngEm.setAttribute('type', 'text/css');
                    bStngEm.setAttribute('id', 'bstrongemhighlight');
                    bStngEm.innerHTML =
                        'h1:before {content: \u0022H1 - \u0022 !important;} h2:before {content: \u0022H2 - \u0022 !important;} h3:before {content: \u0022H3 - \u0022 !important;} h4:before {content: \u0022H4 - \u0022 !important;} h5:before {content: \u0022H5 - \u0022 !important;} h6:before {content: \u0022H6 - \u0022 !important;} h1 {background: repeating-linear-gradient(45deg,#5d9634,#5d9634 10px,#538c2b  10px,#538c2b 20px) !important;-webkit-text-fill-color: #fff !important;text-fill-color: #fff !important;; padding: 5px !important; color: white !important;} h2 {background: repeating-linear-gradient(45deg,#5d9634,#5d9634 10px,#538c2b  10px,#538c2b 20px) !important;-webkit-text-fill-color: #fff !important;text-fill-color: #fff !important;; padding: 5px !important; color: white !important;} h3 {background: repeating-linear-gradient(45deg,#5d9634,#5d9634 10px,#538c2b  10px,#538c2b 20px) !important;-webkit-text-fill-color: #fff !important;text-fill-color: #fff !important;; padding: 5px !important; color: white !important;} h4 {background: repeating-linear-gradient(45deg,#5d9634,#5d9634 10px,#538c2b  10px,#538c2b 20px) !important;-webkit-text-fill-color: #fff !important;text-fill-color: #fff !important;; padding: 5px !important; color: white !important;} h5 {background: repeating-linear-gradient(45deg,#5d9634,#5d9634 10px,#538c2b  10px,#538c2b 20px) !important;-webkit-text-fill-color: #fff !important;text-fill-color: #fff !important;; padding: 5px !important; color: white !important;} h6 {background: repeating-linear-gradient(45deg,#5d9634,#5d9634 10px,#538c2b  10px,#538c2b 20px) !important;-webkit-text-fill-color: #fff !important;text-fill-color: #fff !important;; padding: 5px !important; color: white !important;}';
                    document.getElementsByTagName('body')[0].appendChild(bStngEm);
                }
            },
        });

        this.classList.toggle('active');
        this.firstElementChild.classList.toggle('fa-close');
        this.firstElementChild.classList.toggle('fa-check');
    });

    document.getElementById('showImageAtl').addEventListener('click', function () {
        this.classList.toggle('active');
        this.firstElementChild.classList.toggle('fa-close');
        this.firstElementChild.classList.toggle('fa-check');
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                let $divAltPreviews = document.querySelectorAll('[data-preview-alt]');
                if (!$divAltPreviews.length) {
                    for (const $img of [...document.images]) {
                        const $div = document.createElement('div');
                        $div.innerHTML = $img.alt;
                        $div.setAttribute('data-preview-alt', 'true');
                        $div.classList.add(...$img.classList.values());
                        $div.style.border = '3px solid red';
                        $div.style.width = $img.width + 'px';
                        $div.style.height = $img.height + 'px';
                        $div.style.boxSizing = 'border-box';
                        $div.style.display = 'flex';
                        $div.style.justifyContent = 'center';
                        $div.style.alignItems = 'center';
                        $div.style.textWeight = 600;
                        $div.style.color = 'red';
                        $div.style.lineHeight = 1;
                        $div.style.textAlign = 'center';
                        $img.style.display = 'none';
                        $img.after($div);
                    }
                } else {
                    $divAltPreviews.forEach(($divAltPreview) => {
                        $divAltPreview.previousElementSibling.style.display = null;

                        $divAltPreview.remove();
                    });
                }
            },
        });
    });

    const $linksContainer = document.getElementById('links');

    const filteredATags = () => {
        const href = $linksContainer.querySelector('input[name="links-href-radio"]:checked').value;
        const protocol = $linksContainer.querySelector('input[name="links-protocol-radio"]:checked').value;
        const rel = $linksContainer.querySelector('input[name="links-rel-radio"]:checked').value;
        const statusCode = $linksContainer.querySelector('input[name="links-rel-status-code"]:checked').value;

        let result = preparedATags;
        if (protocol !== 'all') {
            result = result.filter(protocolFilter(protocol));
        }

        if (href !== 'all') {
            result = result.filter(hrefFilter(href));
        }

        if (rel !== 'all') {
            result = result.filter(relFilter(rel));
        }

        if (statusCode !== 'all') {
            result = result.filter(statusCodeFilter(statusCode));
        }

        return result;
    };

    const $statusFilter = document.querySelector('[data-status-filter]');
    const $linkStarterChecker = document.querySelector('[link-starter-checker]');

    const renderLinks = () => {
        // Сбрасываем выведенный до этого результат
        $linksContainer.querySelector('.dropdown').innerHTML = '';
        const tags = filteredATags();
        if (!tags.length) {
            const $clearFilters = document.createElement('button');
            $clearFilters.classList.add('links-checker-button');
            $clearFilters.style.margin = '10px 0';
            $clearFilters.innerHTML = `<i class="fa fa-rotate-left"></i> Сбросить фильтр`;
            $clearFilters.addEventListener('click', () => {
                $linksContainer.querySelector('input[name="links-href-radio"]').checked = false;
                $linksContainer.querySelector('input[value="all"][name="links-href-radio"]').checked = true;
                $linksContainer.querySelector('input[name="links-protocol-radio"]').checked = false;
                $linksContainer.querySelector('input[value="all"][name="links-protocol-radio"]').checked = true;
                $linksContainer.querySelector('input[name="links-rel-radio"]').checked = false;
                $linksContainer.querySelector('input[value="all"][name="links-rel-radio"]').checked = true;
                $linksContainer.querySelector('input[name="links-rel-status-code"]').checked = false;
                $linksContainer.querySelector('input[value="all"][name="links-rel-status-code"]').checked = true;
                renderLinks();
            });

            const $info = document.createElement('div');
            $info.append('Нет данных для отображения', document.createElement('br'), $clearFilters);
            $info.style.color = 'var(--grey)';
            $info.style.textAlign = 'center';
            $info.style.background = 'transparent';

            $linksContainer.querySelector('.dropdown').append($info);
            return;
        }

        for (const aTag of tags) {
            const $aTagContainer = document.createElement('div');
            $aTagContainer.setAttribute('data-link-id', aTag.id);

            try {
                const url = new URL(aTag.hrefFull);
                if (['http:', 'https:'].includes(url.protocol)) {
                    $aTagContainer.innerHTML = `<span class="empty-value">Href: </span><span data-link-url><a target="_blank" href="${aTag.hrefFull}">${aTag.href}</a></span>`;
                } else {
                    $aTagContainer.innerHTML = `<span class="empty-value">Href: </span><span data-link-url>${aTag.href}</span>`;
                }
            } catch (error) {
                if (aTag.href.indexOf('/') === 0) {
                    $aTagContainer.innerHTML = `<span class="empty-value">Href: </span><span data-link-url><a target="_blank" href="${aTag.hrefFull}">${aTag.href}</a></span>`;
                } else {
                    $aTagContainer.innerHTML = `<span class="empty-value">Href: </span><span data-link-url>${aTag.href}</span>`;
                }
            }

            if (aTag.redirectTo) {
                $aTagContainer.append(document.createElement('br'), $createRedirect(aTag.redirectTo));
            }

            let contentRel = aTag.rel;
            if (typeof contentRel !== 'string') {
                contentRel = '<span class="empty-value">Отсутствует</span>';
            } else {
                contentRel = contentRel.trim();
                if (!contentRel) {
                    contentRel = '<span class="empty-value">Пустой</span>';
                }
            }

            const $rel = document.createElement('span');
            $rel.innerHTML = '<span class="empty-value">Rel: </span>' + contentRel;

            const $contentLabel = document.createElement('span');
            $contentLabel.classList.add('empty-value');
            $contentLabel.innerHTML = 'Анкор: ';

            const $content = document.createElement('span');
            $content.append($contentLabel, aTag.innerHTML);
            $aTagContainer.prepend($content, document.createElement('br'));
            $aTagContainer.append(document.createElement('br'), $rel);

            if (typeof aTag.statusCode === 'number') {
                $aTagContainer.append($createStatusCode(aTag.statusCode));
            }

            if (aTag.error) {
                $aTagContainer.append($createStatusCode('Что-то пошло не так'));
            }

            $linksContainer.querySelector('.dropdown').appendChild($aTagContainer);
        }
    };

    renderLinks();

    const $linksHrefRadios = $linksContainer.querySelectorAll('input[name="links-href-radio"]');
    for (const $linksHrefRadio of $linksHrefRadios) {
        const value = $linksHrefRadio.value;
        if (value !== 'all') {
            $linksHrefRadio.nextElementSibling.append(` (${preparedATags.filter(hrefFilter(value)).length})`);
        } else {
            $linksHrefRadio.nextElementSibling.append(` (${preparedATags.length})`);
        }

        $linksHrefRadio.addEventListener('change', () => renderLinks());
    }

    const $linksProtocolRadios = $linksContainer.querySelectorAll('input[name="links-protocol-radio"]');
    for (const $linksProtocolRadio of $linksProtocolRadios) {
        const value = $linksProtocolRadio.value;
        if (value !== 'all') {
            $linksProtocolRadio.nextElementSibling.append(` (${preparedATags.filter(protocolFilter(value)).length})`);
        }

        $linksProtocolRadio.addEventListener('change', () => renderLinks());
    }

    const $linksRelRadios = $linksContainer.querySelectorAll('input[name="links-rel-radio"]');
    for (const $linksRelRadio of $linksRelRadios) {
        const value = $linksRelRadio.value;
        if (value !== 'all') {
            $linksRelRadio.nextElementSibling.append(` (${preparedATags.filter(relFilter(value)).length})`);
        }

        $linksRelRadio.addEventListener('change', () => renderLinks());
    }

    const $linksStatusCodeRadios = $linksContainer.querySelectorAll('input[name="links-rel-status-code"]');
    for (const $linksRelRadio of $linksStatusCodeRadios) {
        $linksRelRadio.addEventListener('change', () => renderLinks());
    }

    const delay = (timeout) => new Promise((resolve) => setTimeout(resolve, timeout));

    Tools.setData(`linksLength`, preparedATags.length);

    const $linkStartChecker = document.getElementById('links-start-check');

    const $countUrl = document.querySelector(`[for="links-rel-status-code-other"] [data-count]`);
    $countUrl.innerText = parseInt(preparedATags.filter(statusCodeFilter('other')).length);

    if (preparedATags.find((tag) => typeof tag.statusCode === 'number' || tag.redirectTo || tag.error)) {
        for (const filterName of ['3xx', '4xx', '5xx', '2xx']) {
            const $countUrl = document.querySelector(`[for="links-rel-status-code-${filterName}"] [data-count]`);
            $countUrl.innerText = parseInt(preparedATags.filter(statusCodeFilter(filterName)).length);
        }

        if (
            preparedATags.find(
                (tag) => tag.isNeedCheck && typeof tag.statusCode !== 'number' && !tag.redirectTo && !tag.error,
            )
        ) {
            $linkStartChecker.innerText = 'Допроверить';
        } else {
            $linkStarterChecker.style.display = 'none';
        }

        $statusFilter.style.display = 'block';
    }

    $linkStartChecker.addEventListener('click', async (e) => {
        e.disabled = true;

        const timeout = parseInt(document.querySelector('input[name="links-fetch-timeout"]').value);

        $statusFilter.style.display = 'block';
        $linkStarterChecker.style.display = 'none';

        for (const tag of filteredATags()) {
            if (typeof tag.statusCode === 'number' || tag.redirectTo || tag.error || !tag.isNeedCheck) {
                continue;
            }

            const $link = document.querySelector(`[data-link-id="${tag.id}"]`);
            const checkATagResponse = await chrome.tabs.sendMessage(tabId, {
                action: 'check_a_tag',
                payload: {
                    id: tag.id,
                    url: tag.hrefFull,
                    isExternal: tag.isExternal,
                },
            });

            if (checkATagResponse.error) {
                const $countUrl = document.querySelector('[for="links-rel-status-code-other"] [data-count]');
                $countUrl.innerText = parseInt($countUrl.textContent) + 1;
                tag.error = checkATagResponse.error;
                if ($link) {
                    $link.append('Что-то пошло не так');
                }
            } else {
                tag.statusCode = checkATagResponse.data.statusCode;
                tag.redirectTo = checkATagResponse.data.redirectTo;
                if (tag.redirectTo) {
                    $link
                        .querySelector('[data-link-url]')
                        .after(document.createElement('br'), $createRedirect(checkATagResponse.data.redirectTo));
                }

                let statusCode = 'other';
                if (tag.statusCode >= 300 && tag.statusCode <= 399) {
                    statusCode = '3xx';
                } else if (tag.statusCode >= 400 && tag.statusCode <= 499) {
                    statusCode = '4xx';
                } else if (tag.statusCode >= 500 && tag.statusCode <= 599) {
                    statusCode = '5xx';
                } else if (tag.statusCode >= 200 && tag.statusCode <= 299) {
                    statusCode = '2xx';
                }

                const $countUrl = document.querySelector(`[for="links-rel-status-code-${statusCode}"] [data-count]`);
                $countUrl.innerText = parseInt($countUrl.textContent) + 1;
                if ($link) {
                    $link.append($createStatusCode(tag.statusCode));
                }
            }

            await delay(timeout);
        }

        e.disabled = false;
    });

    document.getElementById(`linksLength`).addEventListener('click', function () {
        document.querySelector('[data-tab=overview]').classList.remove('active');
        document.querySelector('#overview').classList.remove('active');

        document.querySelector('[data-tab=links]').classList.add('active');
        document.querySelector('#links').classList.add('active');
    });

    document.getElementById('links-export').addEventListener('click', () => {
        let fileName = `${url.hostname}_links`;
        const href = $linksContainer.querySelector('input[name="links-href-radio"]:checked').value;
        if (href !== 'all') {
            fileName += `_${href}`;
        }

        const protocol = $linksContainer.querySelector('input[name="links-protocol-radio"]:checked').value;
        if (protocol !== 'all') {
            fileName += `_${protocol}`;
        }

        const rel = $linksContainer.querySelector('input[name="links-rel-radio"]:checked').value;
        if (rel !== 'all') {
            fileName += `_${rel}`;
        }

        const statusCode = $linksContainer.querySelector('input[name="links-rel-status-code"]:checked').value;
        if (statusCode !== 'all') {
            fileName += `_${statusCode}`;
        }

        exportCSV(
            fileName,
            [['Status', 'Href', 'Redirect', 'Anchor(html)', 'Anchor(text)', 'Rel', 'Type', 'Protocol']].concat(
                filteredATags().map((tag) => [
                    tag.statusCode ?? '',
                    tag.href,
                    tag.redirectTo ?? '',
                    tag.innerHTML
                        .trim()
                        .replaceAll(/\r|\n|\r\n|\t/gm, '')
                        .replaceAll('"', '""'),
                    tag.innerText
                        .trim()
                        .replaceAll(/\r|\n|\r\n|\t/gm, '')
                        .replaceAll('"', '""'),
                    tag.rel ?? '',
                    tag.isExternal ? (checkIsExternal(tag) ? 'external' : '') : 'internal',
                    tag.hrefURL && ['http:', 'https:'].includes(tag.hrefURL.protocol)
                        ? tag.hrefURL.protocol.replace(':', '')
                        : 'other',
                ]),
            ),
        );
    });

    document.getElementById('disableJS').addEventListener('click', toggleJS(tab));

    let tabsContent = document.querySelector('.tabs-content');

    tabsContent.addEventListener('click', async (e) => {
        if (e.target.classList.contains('can-copied') || e.target.classList.contains('fa-copy')) {
            let parent;

            if (e.target.closest('.tabs-content__row_dropdown')) {
                parent = e.target.closest('.dropdown__item');
            } else {
                parent = e.target.closest('.tabs-content__row');
            }

            const value = parent.querySelector('.can-copied').firstElementChild.innerText.trim();
            if (value) {
                onCopyElement(parent, value)();
            }
        }
    });
});