export function scheduleAutosaveTask(currentTimerId, save, delay = 500) {
  window.clearTimeout(currentTimerId);
  return window.setTimeout(save, delay);
}

export function cancelAutosaveTask(timerId) {
  window.clearTimeout(timerId);
}
