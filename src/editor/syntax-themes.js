import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Default theme (matches the current dark theme)
export const defaultHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#93c5fd" },
  { tag: tags.operator, color: "#e2e8f0" },
  { tag: tags.string, color: "#86efac" },
  { tag: tags.number, color: "#f0abfc" },
  { tag: tags.comment, color: "#64748b" },
  { tag: tags.variableName, color: "#e2e8f0" },
  { tag: tags.typeName, color: "#93c5fd" },
  { tag: tags.propertyName, color: "#93c5fd" },
  { tag: tags.tagName, color: "#93c5fd" },
  { tag: tags.attributeName, color: "#f0abfc" },
  { tag: tags.className, color: "#93c5fd" },
]);

// Dracula theme
export const draculaHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#ff79c6" },
  { tag: tags.operator, color: "#f8f8f2" },
  { tag: tags.string, color: "#f1fa8c" },
  { tag: tags.number, color: "#bd93f9" },
  { tag: tags.comment, color: "#6272a4" },
  { tag: tags.variableName, color: "#f8f8f2" },
  { tag: tags.typeName, color: "#8be9fd" },
  { tag: tags.propertyName, color: "#50fa7b" },
  { tag: tags.tagName, color: "#ff79c6" },
  { tag: tags.attributeName, color: "#bd93f9" },
  { tag: tags.className, color: "#8be9fd" },
]);

// Solarized Light theme
export const solarizedLightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#268bd2" },
  { tag: tags.operator, color: "#657b83" },
  { tag: tags.string, color: "#2aa198" },
  { tag: tags.number, color: "#d33682" },
  { tag: tags.comment, color: "#93a1a1" },
  { tag: tags.variableName, color: "#657b83" },
  { tag: tags.typeName, color: "#268bd2" },
  { tag: tags.propertyName, color: "#2aa198" },
  { tag: tags.tagName, color: "#268bd2" },
  { tag: tags.attributeName, color: "#d33682" },
  { tag: tags.className, color: "#268bd2" },
]);

// Monokai theme
export const monokaiHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#f92672" },
  { tag: tags.operator, color: "#f8f8f2" },
  { tag: tags.string, color: "#e6db74" },
  { tag: tags.number, color: "#ae81ff" },
  { tag: tags.comment, color: "#75715e" },
  { tag: tags.variableName, color: "#f8f8f2" },
  { tag: tags.typeName, color: "#66d9ef" },
  { tag: tags.propertyName, color: "#a6e22e" },
  { tag: tags.tagName, color: "#f92672" },
  { tag: tags.attributeName, color: "#fd971f" },
  { tag: tags.className, color: "#66d9ef" },
]);

// Available themes
export const syntaxThemes = [
  { id: 'default', name: 'Default', style: defaultHighlightStyle },
  { id: 'dracula', name: 'Dracula', style: draculaHighlightStyle },
  { id: 'solarized-light', name: 'Solarized Light', style: solarizedLightHighlightStyle },
  { id: 'monokai', name: 'Monokai', style: monokaiHighlightStyle },
];

export const getSyntaxTheme = (themeId) => {
  return syntaxThemes.find(theme => theme.id === themeId)?.style || defaultHighlightStyle;
};
