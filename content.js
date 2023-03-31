chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log("2. Получено сообщение и запущен контент скрипт. В консоли страницы");
        // console.log(request);

        if (request.action === "GET SEODATA") {
            // можно изменить элементы на вкладке браузера
            // let user = document.querySelector(".user")
            // user.innerHTML = request.name;

            let seodata = {}
            seodata['h1s'] = Array.from(document.querySelectorAll("h1")).map(i => i.innerText.trim());
            seodata['h2s'] = Array.from(document.querySelectorAll("h2")).map(i => i.innerText.trim());
            seodata['h3s'] = Array.from(document.querySelectorAll("h3")).map(i => i.innerText.trim());
            seodata['h4s'] = Array.from(document.querySelectorAll("h4")).map(i => i.innerText.trim());
            seodata['h5s'] = Array.from(document.querySelectorAll("h5")).map(i => i.innerText.trim());
            seodata['h6s'] = Array.from(document.querySelectorAll("h6")).map(i => i.innerText.trim());
            seodata['titles'] = Array.from(document.querySelectorAll("title")).map(t => t.innerText.trim());
            seodata['descriptions'] = Array.from(document.querySelectorAll('meta[name="description"]')).map(i => i.content.trim());
            seodata['canonicals'] = Array.from(document.querySelectorAll('link[rel="canonical"]')).map(i => i.getAttribute("href"));

            console.log(seodata);

            sendResponse(seodata);
        }
    }
);