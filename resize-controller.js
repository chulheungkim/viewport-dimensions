(() => {
  "use strict";

  // Rendering and scheduling are supplied so lifecycle races can be tested
  // with a deterministic clock, including a resize during the exit.
  globalThis.createViewportResizeController = ({
    view,
    clock,
    initialSize,
    settings,
  }) => {
    let previousSize = initialSize;
    let currentSettings = settings;
    let phase = "hidden";
    let idleTimer = null;
    let removalTimer = null;
    let destroyed = false;
    let interacting = false;

    function clearTimers() {
      clock.clearTimeout(idleTimer);
      clock.clearTimeout(removalTimer);
      idleTimer = null;
      removalTimer = null;
    }

    function unmount() {
      phase = "hidden";
      view.unmount();
      removalTimer = null;
    }

    function hide() {
      idleTimer = null;
      phase = "exiting";
      const duration = view.hide();
      if (duration === 0) unmount();
      else removalTimer = clock.setTimeout(unmount, duration);
    }

    function resetIdleTimer() {
      clock.clearTimeout(idleTimer);
      idleTimer = interacting
        ? null
        : clock.setTimeout(hide, currentSettings.hideDelayMs);
    }

    return {
      setInteracting(value) {
        if (destroyed || phase === "hidden") return;
        interacting = value;
        if (interacting) {
          clearTimers();
          if (phase === "exiting") view.show();
          phase = "visible";
        } else resetIdleTimer();
      },
      finishExit() {
        if (destroyed || phase !== "exiting") return;
        clock.clearTimeout(removalTimer);
        unmount();
      },
      resize(size) {
        if (destroyed) return;
        if (
          size.width === previousSize.width &&
          size.height === previousSize.height
        )
          return;
        previousSize = size;
        clearTimers();
        if (phase === "hidden") view.mount(currentSettings.position);
        view.update(size);
        if (phase !== "visible") view.show();
        phase = "visible";
        resetIdleTimer();
      },
      configure(nextSettings) {
        if (destroyed) return;
        const delayChanged =
          nextSettings.hideDelayMs !== currentSettings.hideDelayMs;
        currentSettings = nextSettings;
        if (phase !== "hidden") view.position(nextSettings.position);
        if (phase === "visible" && delayChanged) resetIdleTimer();
      },
      suspend(size) {
        if (destroyed) return;
        interacting = false;
        clearTimers();
        unmount();
        previousSize = size;
      },
      destroy() {
        clearTimers();
        unmount();
        destroyed = true;
      },
    };
  };
})();
