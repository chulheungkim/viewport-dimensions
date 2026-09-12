(() => {
  "use strict";

  const preferences = globalThis.viewportDimensionsPreferences;
  const form = document.querySelector("#settings");
  const fieldsets = document.querySelectorAll("fieldset");
  const delay = document.querySelector("#hide-delay");
  const localhostEnabled = document.querySelector("#localhost-enabled");
  const localhostPorts = document.querySelector("#localhost-ports");
  const pagesEnabled = document.querySelector("#pages-enabled");
  const pageUrls = document.querySelector("#page-urls");
  const status = document.querySelector("#status");
  const openToolbar = document.querySelector("#open-toolbar");
  // Queue rapid selections in order so an older storage write cannot win last.
  let pendingSave = Promise.resolve();
  let revision = 0;
  openToolbar?.addEventListener("click", async () => {
    openToolbar.disabled = true;
    try {
      await pendingSave;
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
    fieldsets.length === 0 ||
    !(delay instanceof HTMLSelectElement) ||
    !(localhostEnabled instanceof HTMLInputElement) ||
    !(localhostPorts instanceof HTMLInputElement) ||
    !(pagesEnabled instanceof HTMLInputElement) ||
    !(pageUrls instanceof HTMLTextAreaElement) ||
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
    localhostEnabled.checked = settings.localhostEnabled;
    localhostPorts.value = settings.localhostPorts.join(", ");
    pagesEnabled.checked = settings.pagesEnabled;
    pageUrls.value = settings.pageUrls.join("\n");
    localhostPorts.disabled = !settings.localhostEnabled;
    pageUrls.disabled = !settings.pagesEnabled;
  }

  function readSettings() {
    const data = new FormData(form);
    return preferences.normalize({
      position: data.get("position"),
      hideDelayMs: Number(data.get("hideDelayMs")),
      localhostEnabled: localhostEnabled.checked,
      localhostPorts: localhostPorts.value,
      pagesEnabled: pagesEnabled.checked,
      pageUrls: pageUrls.value,
    });
  }

  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("change", () => {
    const settings = readSettings();
    localhostPorts.disabled = !settings.localhostEnabled;
    pageUrls.disabled = !settings.pagesEnabled;
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
          status.textContent = "Saved. Matching pages are active now.";
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
      for (const fieldset of fieldsets) fieldset.disabled = false;
      status.textContent = "Matching pages are active now.";
    })
    .catch(() => {
      showSettings(preferences.defaults);
      for (const fieldset of fieldsets) fieldset.disabled = false;
      status.textContent = "Couldn’t load settings. Showing defaults.";
      status.dataset.error = "true";
    });
})();
