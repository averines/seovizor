// получаем сохраненные настройки пользователя
const userOptions = await chrome.storage.sync.get("options");
console.log(userOptions);

const bodyEl = document.querySelector("body");
if (userOptions.options.theme) {
    bodyEl.classList.add(userOptions.options.theme)
}


// определяем опции
const options = {};
const optionsForm = document.getElementById("optionsForm");

if (optionsForm.theme) {
    optionsForm.tabcompact.addEventListener("change", (e) => {
        options.tabcompact = e.target.checked;
        chrome.storage.sync.set({ options });
    });
}

if (optionsForm.theme) {
    optionsForm.theme.forEach(r =>
        r.addEventListener("change", (e) => {
            options.theme = e.target.value;
            chrome.storage.sync.set({ options });
            console.log(options);
        }));
}


const data = await chrome.storage.sync.get("options");
Object.assign(options, data.options);
optionsForm.tabcompact.checked = Boolean(options.tabcompact);

optionsForm.theme.forEach(r => {
    if (r.value == options.theme) { r.checked = true }
})