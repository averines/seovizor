chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log("2. Получено сообщение и запущен контент скрипт. В консоли страницы");
        console.log(request);

        if (request.action === "GET-SEODATA") {
            // можно изменить элементы на вкладке браузера
            // let user = document.querySelector(".user")
            // user.innerHTML = request.name;

            let seodata = {}
            seodata['h1s'] = Array.from(document.querySelectorAll("h1")).map(i => i.innerText.replace(/(\r\n|\n|\r)/gm, " ").trim());
            seodata['h2s'] = Array.from(document.querySelectorAll("h2")).map(i => i.innerText.replace(/(\r\n|\n|\r)/gm, " ").trim());
            seodata['h3s'] = Array.from(document.querySelectorAll("h3")).map(i => i.innerText.replace(/(\r\n|\n|\r)/gm, " ").trim());
            seodata['h4s'] = Array.from(document.querySelectorAll("h4")).map(i => i.innerText.replace(/(\r\n|\n|\r)/gm, " ").trim());
            seodata['h5s'] = Array.from(document.querySelectorAll("h5")).map(i => i.innerText.replace(/(\r\n|\n|\r)/gm, " ").trim());
            seodata['h6s'] = Array.from(document.querySelectorAll("h6")).map(i => i.innerText.replace(/(\r\n|\n|\r)/gm, " ").trim());
            seodata['titles'] = Array.from(document.querySelectorAll("title")).map(t => t.innerText.trim());
            seodata['descriptions'] = Array.from(document.querySelectorAll('meta[name="description"]')).map(i => i.content.trim());
            seodata['canonicals'] = Array.from(document.querySelectorAll('link[rel="canonical"]')).map(i => i.getAttribute("href"));
            seodata['metarobots'] = Array.from(document.querySelectorAll('meta[name="robots"]')).map(i => i.content.trim());
            seodata['langs'] = Array.from(document.querySelectorAll('html')).map(i => i.getAttribute("lang"));
            seodata['links'] = Array.from(document.querySelectorAll('a')).map(i => i.getAttribute("href"));

            let images = Array.from(document.querySelectorAll('img')).map(i => (
                {
                    "src": i.dataset.src ? i.dataset.src : i.src,
                    "alt": i.getAttribute("alt"),
                    "title": i.getAttribute("title"),
                    "width": i.naturalWidth,
                    "height": i.naturalHeight
                }
            ));

            images = images.filter(i => i.src);
            seodata['images'] = images

            // console.log(seodata);
            sendResponse(seodata);
        }

        if (request.action === "GET-SEARCHLINKS") {

            let searchLinks = [];

            switch (request.platform) {
                case "yandex":
                    searchLinks = Array.from(document.querySelectorAll("a.link.organic__url")).map(i => i.getAttribute("href").replace(/(\r\n|\n|\r)/gm, " ").trim());
                    break;
                case "google":
                    console.log("goo");
                    // TODO: получить ссылки из выдачи гугла
                    break;
                default:
                    break;
            }
            sendResponse(searchLinks);
        }
    }
);