const NON_COLOR_KEYS = new Set(['radius']);

function tokenToCssValue(value) {
  if (typeof value !== 'string') {
    return String(value);
  }

  const trimmed = value.trim();
  if (/^-?\d+(\.\d+)?\s+-?\d+(\.\d+)?%\s+-?\d+(\.\d+)?%/.test(trimmed)) {
    return `hsl(${trimmed})`;
  }

  return trimmed;
}

function renderThemeScope(selector, values = {}) {
  const declarations = Object.entries(values)
    .map(([key, value]) => {
      const cssName = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      const variableName = NON_COLOR_KEYS.has(key) ? `--${cssName}` : `--color-${cssName}`;
      return `  ${variableName}: ${tokenToCssValue(value)};`;
    })
    .join('\n');

  return `${selector} {\n${declarations}\n}`;
}

function buildCssVariables(theme = {}) {
  const light = theme.light || {};
  const dark = theme.dark || light;

  return [
    renderThemeScope(':root, html[data-theme="light"]', light),
    renderThemeScope('html[data-theme="dark"]', dark)
  ].join('\n\n');
}

module.exports = {
  buildCssVariables
};
