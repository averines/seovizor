const options = {};
const optionsForm = document.getElementById("optionsForm");

console.log(optionsForm);

optionsForm.tabcompact.addEventListener("change", (e) => {
    options.tabcompact = e.target.checked;
    chrome.storage.sync.set({ options });
});


optionsForm.theme.forEach(r =>
    r.addEventListener("change", (e) => {
        options.theme = e.target.value;
        chrome.storage.sync.set({ options });
        console.log(options);
    }));


const data = await chrome.storage.sync.get("options");
Object.assign(options, data.options);
optionsForm.tabcompact.checked = Boolean(options.tabcompact);

optionsForm.theme.forEach(r => {
    if (r.value == options.theme) { r.checked = true }
})