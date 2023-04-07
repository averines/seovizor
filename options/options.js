const options = {};
const optionsForm = document.getElementById("optionsForm");

optionsForm.tabcompact.addEventListener("change", (e) => {
    options.tabcompact = e.target.checked;
    chrome.storage.sync.set({ options });
});


const data = await chrome.storage.sync.get("options");
Object.assign(options, data.options);
optionsForm.tabcompact.checked = Boolean(options.tabcompact);