export function scheduleAutosaveTask(currentTimerId: number | null, save: () => void, delay: number = 500) {
  window.clearTimeout(currentTimerId ?? undefined);
  return window.setTimeout(save, delay);
}

export function cancelAutosaveTask(timerId: number | null) {
  window.clearTimeout(timerId ?? undefined);
}
