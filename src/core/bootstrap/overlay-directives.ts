import type { ObjectDirective } from 'vue';
import { Popover, Tooltip } from 'bootstrap';

type OverlayElement = HTMLElement & { __dsrsTooltip?: Tooltip; __dsrsPopover?: Popover };
type PopoverBinding = Partial<Popover.Options>;

function replaceTooltip(element: OverlayElement, title: string) {
  element.__dsrsTooltip?.dispose();
  element.__dsrsTooltip = new Tooltip(element, { title, trigger: 'hover focus' });
}
function replacePopover(element: OverlayElement, options: PopoverBinding) {
  element.__dsrsPopover?.dispose();
  element.__dsrsPopover = new Popover(element, {
    ...options, container: 'body', html: options.html ?? true,
    sanitize: true, trigger: 'hover focus'
  });
}
export const bootstrapTooltip: ObjectDirective<OverlayElement, string> = {
  mounted(element, binding) { replaceTooltip(element, binding.value); },
  updated(element, binding) {
    if (binding.value !== binding.oldValue) replaceTooltip(element, binding.value);
  },
  unmounted(element) { element.__dsrsTooltip?.dispose(); }
};
export const bootstrapPopover: ObjectDirective<OverlayElement, PopoverBinding> = {
  mounted(element, binding) { replacePopover(element, binding.value); },
  updated(element, binding) {
    if (binding.value.content !== binding.oldValue?.content || binding.value.title !== binding.oldValue?.title) {
      replacePopover(element, binding.value);
    }
  },
  unmounted(element) { element.__dsrsPopover?.dispose(); }
};
