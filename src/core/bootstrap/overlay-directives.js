import Popover from "bootstrap/js/dist/popover.js";
import Tooltip from "bootstrap/js/dist/tooltip.js";

function replaceInstance(element, key, Constructor, options) {
  element[key]?.dispose();
  element[key] = new Constructor(element, options);
}

export const bootstrapTooltip = {
  mounted(element, binding) {
    replaceInstance(element, "__dsrsTooltip", Tooltip, {
      title: binding.value,
      trigger: "hover focus"
    });
  },
  updated(element, binding) {
    if (binding.value !== binding.oldValue) {
      replaceInstance(element, "__dsrsTooltip", Tooltip, {
        title: binding.value,
        trigger: "hover focus"
      });
    }
  },
  unmounted(element) {
    element.__dsrsTooltip?.dispose();
  }
};

export const bootstrapPopover = {
  mounted(element, binding) {
    replaceInstance(element, "__dsrsPopover", Popover, {
      ...binding.value,
      container: "body",
      html: binding.value.html ?? true,
      sanitize: true,
      trigger: "hover focus"
    });
  },
  updated(element, binding) {
    if (binding.value.content !== binding.oldValue?.content
      || binding.value.title !== binding.oldValue?.title) {
      replaceInstance(element, "__dsrsPopover", Popover, {
        ...binding.value,
        container: "body",
        html: binding.value.html ?? true,
        sanitize: true,
        trigger: "hover focus"
      });
    }
  },
  unmounted(element) {
    element.__dsrsPopover?.dispose();
  }
};
