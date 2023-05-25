// настройки по умолчанию
let userOptions = {
    "tabcompact": false,
    "theme": "theme1",
    "title": "title-all",
    "description": "description-all"
}

// получаем настройки из хранилища, объединяем со значениями по умолчанию
let data = await chrome.storage.sync.get("userOptions");
Object.assign(userOptions, data.userOptions);

// применяем тему на странице с опциями
document.querySelector("body").classList.add(userOptions.theme);

// получаем форму со странцы с опциями
const optionsForm = document.getElementById("optionsForm");

// заполняем форму с опциями значениями из хранищища
optionsForm.tabcompact.checked = Boolean(userOptions.tabcompact);

["theme", "title", "description"].forEach(i => {
    optionsForm[i].forEach(r => {
        if (r.value == userOptions[i]) { r.checked = true }
    })
});

// отслеживаем изменения опций и пушим в хранилище
optionsForm.tabcompact.addEventListener("change", (e) => {
    userOptions.tabcompact = e.target.checked;
    chrome.storage.sync.set({ userOptions });
});

["theme", "title", "description"].forEach(i => {
    optionsForm[i].forEach(r =>
        r.addEventListener("change", (e) => {
            userOptions[i] = e.target.value;
            chrome.storage.sync.set({ userOptions });
        }));
});