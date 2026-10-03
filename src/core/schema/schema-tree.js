export function schemaNodeIndex(rootNode) {
  const index = new Map();

  function visit(node) {
    if (!node || typeof node !== "object") {
      return;
    }

    if (node.id) {
      index.set(node.id, node);
    }

    (node.subpages || []).forEach(visit);
  }

  visit(rootNode);
  return index;
}

export function documentOutlineIndex(outline = []) {
  const index = new Map();

  function visit(sections, parentNumber = []) {
    let numberedPosition = 0;

    for (const section of sections || []) {
      const numbered = section.numbered !== false;
      const numberPath = numbered
        ? [...parentNumber, ++numberedPosition]
        : parentNumber;

      index.set(section.key, {
        ...section,
        number: section.number || (numbered ? numberPath.join(".") : "")
      });

      visit(section.sections, numberPath);
    }
  }

  visit(outline);
  return index;
}
