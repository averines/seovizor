const createModal = (body, style, title = 'Alaev SEO Tools') => {
    /**
     * @var {HTMLElement}
     */
    const $modal = document.createElement('div');
    Object.assign($modal.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        background: '#abccfd',
        borderRadius: '10px',
        boxShadow: '0 2px 6px 2px rgb(60 64 67 / 15%)',
        padding: '12px',
        opacity: '.95',
        transform: 'translate(-50%, -50%)',
        zIndex: '9999',
        ...style,
    });

    const $title = document.createElement('div');
    $title.innerHTML = title;
    Object.assign($title.style, {
        fontWeight: '700',
        fontSize: '14px',
        color: '#246bfd',
        paddingBottom: '12px',
        lineHeight: '1',
    });

    $modal.append($title);

    const $buttonClose = document.createElement('div');
    $buttonClose.innerHTML = `Р—Р°РєСЂС‹С‚СЊ`;
    Object.assign($buttonClose.style, {
        position: 'absolute',
        top: '12px',
        right: '12px',
        fontSize: '10px',
        background: '#246bfd',
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: '3px',
        lineHeight: '1',
        appearance: 'none',
        border: 'none',
        boxShadow: 'none',
        color: '#fff',
    });

    const handlerClose = () => {
        $modal.remove();
        $buttonClose.removeEventListener('click', handlerClose);
    };

    $buttonClose.addEventListener('click', handlerClose);

    const $body = document.createElement('div');
    Object.assign($body.style, {
        background: '#fff',
        color: '#262626',
        borderRadius: '5px',
        padding: '12px',
        fontSize: '16px',
        lineHeight: '1.3',
    });

    if (typeof body === 'string') {
        $body.innerHTML = body;
    } else {
        $body.append(body);
    }

    $modal.append($buttonClose, $body);

    return $modal;
};

/**
 *
 * @param {Document} document
 * @param {string} selector
 * @returns
 */
const getArrayBySelector = (document, selector) => [...document.querySelectorAll(selector)];

/**
 *
 * @param {Document} document
 * @returns
 */
const getMetaTags = (document) => {
    const metaTags = {};

    const $metaTags = getArrayBySelector(document, 'meta');
    $metaTags.forEach(($metaTag) => {
        let name = $metaTag.getAttribute('name');
        if (!name) {
            name = $metaTag.getAttribute('property');
            if (!name) {
                return;
            }
        }

        name = name.toLowerCase();
        if (!metaTags[name]) {
            metaTags[name] = [];
        }

        metaTags[name].push({
            content: $metaTag.getAttribute('content'),
            invalidPosition: $metaTag.parentElement.nodeName !== 'HEAD',
        });
    });

    return metaTags;
};

/**
 *
 * @param {Document} document
 * @returns
 */
const getCanonicals = (document) => {
    const $canonicals = getArrayBySelector(document, 'link[rel="canonical"]');
    return $canonicals.map(($canonical) => ({
        href: $canonical.getAttribute('href'),
        invalidPosition: $canonical.parentElement.nodeName !== 'HEAD',
    }));
};

/**
 *
 * @param {Document} document
 * @returns
 */
const getPageTitles = (document) => {
    const $titles = getArrayBySelector(document, 'title');
    return $titles.map(($title) => ({
        innerText: $title.innerText,
        isFromHead: !!$title.closest('head'),
    }));
};

/**
 *
 * @param {Document} document
 * @returns
 */
const getHreflangs = (document) => {
    const $hreflangs = getArrayBySelector(document, 'link[rel^="alternate"][hreflang]');
    return $hreflangs.map((link) => ({
        href: link.getAttribute('href'),
        hreflang: link.getAttribute('hreflang'),
    }));
};

/**
 *
 * @param {Document} document
 * @returns
 */
const parseHead = (document) => {
    const titles = getPageTitles(document);
    const metaTags = getMetaTags(document);

    const canonicals = getCanonicals(document);
    const hreflangs = getHreflangs(document);

    return { titles, metaTags, canonicals, hreflangs };
};

/**
 *
 * @param {Document} document
 * @returns
 */
const getHTags = (document) => {
    const $hs = getArrayBySelector(document, 'body h1, body h2, body h3, body h4, body h5, body h6');
    return $hs.map((h) => ({
        innerText: h.innerText,
        nodeName: h.nodeName,
    }));
};

/**
 *
 * @param {string} rel
 * @returns {boolean}
 */
const checkIsNoFollow = (rel) => {
    if (!rel) {
        return false;
    }

    return rel.includes('nofollow');
};

/**
 *
 * @param {string | null | undefined} url
 * @returns {URL | null}
 */
const parseUrl = (url) => {
    if (!url) {
        return null;
    }

    try {
        return new URL(url);
    } catch (error) {
        return null;
    }
};

/**
 *
 * @param {URL|null} hrefURL
 * @returns {boolean}
 */
const checkIsExternal = (hrefURL, hostname) => {
    if (!hrefURL) {
        return false;
    }

    return hostname !== hrefURL.hostname;
};

/**
 *
 * @param {Document} document
 * @returns
 */
const getATags = (document, hostname) => {
    const $aTags = getArrayBySelector(document, 'a[href]');
    return $aTags.map(($aTag) => {
        let href = $aTag.getAttribute('href');
        const hrefURL = parseUrl($aTag.href);

        let id = $aTag.getAttribute('data-seo-tools-id');
        if (!id) {
            id = String(Math.round((Math.random() + 1) * 1000)) + String(Math.round((Math.random() + 1) * 1000));
            $aTag.setAttribute('data-seo-tools-id', id);
        }

        const statusCode = $aTag.getAttribute('data-seo-tools-status-code');
        const redirectTo = $aTag.getAttribute('data-seo-tools-redirect-to');
        const error = $aTag.getAttribute('data-seo-tools-error');

        return {
            id,
            href,
            hrefFull: $aTag.href,
            innerHTML: $aTag.innerHTML,
            innerText: $aTag.innerText,
            rel: $aTag.getAttribute('rel'),
            isExternal: checkIsExternal(hrefURL, hostname),
            isNoFollow: checkIsNoFollow($aTag.getAttribute('rel')),
            isNeedCheck: hrefURL && ['http:', 'https:'].includes(hrefURL.protocol),
            statusCode: statusCode ? parseInt(statusCode) : null,
            redirectTo,
            error: error && error === 'true',
            isAbsolutePath:
                !!href &&
                hrefURL &&
                ['http:', 'https:'].includes(hrefURL.protocol) &&
                (href.indexOf(hrefURL.origin) === 0 || href.indexOf(hrefURL.origin.replace(hrefURL.protocol, '')) === 0),
        };
    });
};

// РСЃРїРѕР»СЊР·РѕРІР°С‚СЊ href РѕС‚ js ELEMENT

/**
 *
 * @param {Document} document
 * @returns
 */
const getImgTags = (document) => {
    const $imgTags = getArrayBySelector(document, 'img');
    return $imgTags.map(($img) => ({
        alt: $img.getAttribute('alt'),
        src: $img.dataset.src == 'undefined' ? $img.src : $img.dataset.src || $img.src,
        title: $img.getAttribute('title'),
        width: $img.width,
        height: $img.height,
    }));
};

/**
 *
 * @param {Document} document
 * @returns
 */
const parseBody = (document, hostname) => {
    const headings = getHTags(document);
    const aTags = getATags(document, hostname);
    const imgTags = getImgTags(document);

    return { headings, aTags, imgTags };
};

/**
 *
 * @param {Document} document
 * @returns
 */
const getLang = (document) => {
    let $html = document.querySelector('html');
    if (!$html) {
        return null;
    }

    return $html.getAttribute('lang');
};

/**
 *
 * @param {Document} document
 * @returns
 */
const pageParse = (document, hostname) => {
    const lang = getLang(document);
    const head = parseHead(document);
    const body = parseBody(document, hostname);

    return { lang, body, head };
};

const checkStatusCode = async (url) =>
    fetch(`https://seotools.alaev.info/url-info.php?url=${encodeURI(url)}`).then((data) => data.json());

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'init_review_tab': {
            const page = pageParse(document, location.hostname);
            sendResponse(page);
            break;
        }

        case 'count_words': {
            const { text } = request.payload;
            document.body.append(
                createModal(`
      <div style="color: #817e7e;padding-bottom: 6px">РЎС‚Р°С‚РёСЃС‚РёРєР° РІС‹РґРµР»РµРЅРЅРѕРіРѕ С‚РµРєСЃС‚Р°:</div>
     <div>Р’СЃРµРіРѕ СЃР»РѕРІ: ${text.match(/(\S+)/g).length}<br>
      РЎРёРјРІРѕР»РѕРІ (СЃ РїСЂРѕР±РµР»Р°РјРё): ${text.length}<br>
      РЎРёРјРІРѕР»РѕРІ (Р±РµР· РїСЂРѕР±РµР»РѕРІ): ${text.replace(/\s+/g, '', '').length}
      </div>
`),
            );
            break;
        }

        case 'check_a_tag': {
            const { id, url, isExternal } = request.payload;
            const $aTag = document.querySelector(`[data-seo-tools-id="${id}"]`);
            if (isExternal) {
                checkStatusCode(url)
                    .then(({ data }) => {
                        $aTag.setAttribute('data-seo-tools-status-code', data.statusCode);
                        if (data.redirectTo) {
                            $aTag.setAttribute('data-seo-tools-redirect-to', data.redirectTo);
                        }

                        return sendResponse({
                            data: {
                                statusCode: data.statusCode,
                                redirectTo: data.redirectTo,
                            },
                            error: null,
                        });
                    })
                    .catch((error) => {
                        $aTag.setAttribute('data-seo-tools-error', true);
                        sendResponse({
                            data: null,
                            error,
                        });
                    });
            } else {
                fetch(url)
                    .then((response) => {
                        if (response.redirected) {
                            checkStatusCode(url)
                                .then(({ data }) => {
                                    $aTag.setAttribute('data-seo-tools-status-code', data.statusCode);
                                    $aTag.setAttribute('data-seo-tools-redirect-to', data.redirectTo);

                                    return sendResponse({
                                        data: {
                                            statusCode: data.statusCode,
                                            redirectTo: data.redirectTo,
                                        },
                                        error: null,
                                    });
                                })
                                .catch((error) => {
                                    $aTag.setAttribute('data-seo-tools-error', true);
                                    sendResponse({
                                        data: null,
                                        error,
                                    });
                                });
                        } else {
                            $aTag.setAttribute('data-seo-tools-status-code', response.status);
                            return sendResponse({
                                data: {
                                    statusCode: response.status,
                                    redirectTo: null,
                                },
                                error: null,
                            });
                        }
                    })
                    .catch((error) =>
                        sendResponse({
                            data: null,
                            error,
                        }),
                    );
            }

            return true;
        }

        case 'js_disabled_status': {
            if (request.status === 'block') {
                const $container = document.createElement('div');
                // Notification text
                const $notificationText = document.createElement('p');
                $notificationText.innerHTML = 'РЅР° РґР°РЅРЅРѕР№ СЃС‚СЂР°РЅРёС†Рµ РѕС‚РєР»СЋС‡РµРЅ js';
                $notificationText.style.cssText = `
          text-transform: uppercase;
          font-weight: 500;
          font-size: 16px;
          margin: 0;
          padding: 0;
        `;

                // Notification hint
                const $notificationHint = document.createElement('span');
                $notificationHint.innerHTML = '* РґР»СЏ Р°РєС‚РёРІР°С†РёРё РїРµСЂРµР№РґРёС‚Рµ РІ Alaev SEO Tools';
                $notificationHint.style.cssText = `
          font-weight: 500;
          font-size: 14px;
          margin: 0;
          padding: 0;
        `;
                $container.append($notificationText, $notificationHint);
                document.body.append(
                    createModal($container, {
                        top: '20px',
                        right: '20px',
                        left: 'initial',
                        transform: 'initial',
                        position: 'fixed',
                    }),
                );
            }

            break;
        }
    }
});