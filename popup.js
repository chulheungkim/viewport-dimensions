(() => {
  "use strict";

  const preferences = globalThis.viewportDimensionsPreferences;
  const form = document.querySelector("#settings");
  const fieldset = document.querySelector("fieldset");
  const delay = document.querySelector("#hide-delay");
  const status = document.querySelector("#status");
  const openToolbar = document.querySelector("#open-toolbar");
  openToolbar?.addEventListener("click", async () => {
    openToolbar.disabled = true;
    try {
      const result = await chrome.runtime.sendMessage({
        type: "viewport:open-active",
      });
      if (!result?.ok)
        throw new Error(result?.error || "Couldn’t open the toolbar.");
      window.close();
    } catch (error) {
      status.textContent =
        error instanceof Error
          ? error.message
          : "Refresh the page and try again.";
      status.dataset.error = "true";
      openToolbar.disabled = false;
    }
  });
  chrome.commands
    .getAll()
    .then((commands) => {
      const label = document.querySelector("#shortcut-label");
      const shortcut = commands.find(
        (command) => command.name === "toggle-toolbar",
      )?.shortcut;
      if (label)
        label.textContent =
          shortcut || "Assign a shortcut at chrome://extensions/shortcuts to";
    })
    .catch(() => {});
  if (
    !(form instanceof HTMLFormElement) ||
    !(fieldset instanceof HTMLFieldSetElement) ||
    !(delay instanceof HTMLSelectElement) ||
    !(status instanceof HTMLElement)
  )
    return;

  function showSettings(settings) {
    for (const radio of form.querySelectorAll('input[name="position"]')) {
      if (radio instanceof HTMLInputElement)
        radio.checked = radio.value === settings.position;
    }
    if (
      ![...delay.options].some(
        (option) => Number(option.value) === settings.hideDelayMs,
      )
    ) {
      delay.add(
        new Option(
          `${settings.hideDelayMs / 1000} seconds`,
          String(settings.hideDelayMs),
        ),
      );
    }
    delay.value = String(settings.hideDelayMs);
  }

  // Queue rapid selections in order so an older storage write cannot win last.
  let pendingSave = Promise.resolve();
  let revision = 0;
  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("change", () => {
    const data = new FormData(form);
    const settings = preferences.normalize({
      position: data.get("position"),
      hideDelayMs: Number(data.get("hideDelayMs")),
    });
    const saveRevision = ++revision;
    status.textContent = "Saving…";
    delete status.dataset.error;
    pendingSave = pendingSave
      .then(() =>
        chrome.storage.local.set({
          [preferences.storageKey]: settings,
        }),
      )
      .then(() => {
        if (saveRevision === revision)
          status.textContent = "Saved. Resize a page to try it.";
      })
      .catch(() => {
        if (saveRevision !== revision) return;
        status.textContent = "Couldn’t save. Change a setting to retry.";
        status.dataset.error = "true";
      });
  });

  chrome.storage.local
    .get(preferences.storageKey)
    .then((stored) => {
      showSettings(preferences.normalize(stored[preferences.storageKey]));
      fieldset.disabled = false;
      status.textContent = "Resize a page to try it.";
    })
    .catch(() => {
      showSettings(preferences.defaults);
      fieldset.disabled = false;
      status.textContent = "Couldn’t load settings. Showing defaults.";
      status.dataset.error = "true";
    });
})();
