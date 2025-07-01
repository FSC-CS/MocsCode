import {showTooltip, EditorView, hoverTooltip} from "@codemirror/view";
import {StateField, EditorState} from "@codemirror/state";

function getCursorTooltips(state) {
  return state.selection.ranges
    .filter(range => range.empty)
    .map(range => {
      let line = state.doc.lineAt(range.head);
      let text = line.number + ":" + (range.head - line.from);
      return {
        pos: range.head,
        above: true,
        strictSide: true,
        arrow: true,
        create: () => {
          let dom = document.createElement("div");
          dom.className = "cm-tooltip-cursor";
          dom.textContent = text;
          return {dom};
        }
      };
    });
}

const cursorTooltipField = StateField.define({
  create: getCursorTooltips,
  update(tooltips, tr) {
    if (!tr.docChanged && !tr.selection) return tooltips;
    return getCursorTooltips(tr.state);
  },
  provide: f => showTooltip.computeN([f], state => state.field(f))
});

const cursorTooltipBaseTheme = EditorView.baseTheme({
  ".cm-tooltip.cm-tooltip-cursor": {
    backgroundColor: "#66b",
    color: "white",
    border: "none",
    padding: "2px 7px",
    borderRadius: "4px",
    "& .cm-tooltip-arrow:before": {
      borderTopColor: "#66b"
    },
    "& .cm-tooltip-arrow:after": {
      borderTopColor: "transparent"
    }
  }
});

// Word hover tooltip that shows the word under the cursor
export const wordHover = hoverTooltip((view, pos, side) => {
  let {from, to, text} = view.state.doc.lineAt(pos);
  let start = pos, end = pos;
  
  // Find the start of the word
  while (start > from && /[\w$]/.test(text[start - from - 1])) start--;
  // Find the end of the word
  while (end < to && /[\w$]/.test(text[end - from])) end++;
  
  // If we're at the edge of a word, don't show the tooltip
  if ((start === pos && side < 0) || (end === pos && side > 0)) return null;
  
  const word = text.slice(start - from, end - from);
  
  // Only show tooltip for words with at least 2 characters
  if (word.length < 2) return null;
  
  return {
    pos: start,
    end: end,
    above: true,
    arrow: true,
    create: () => {
      let dom = document.createElement("div");
      dom.className = "cm-tooltip-hover";
      dom.textContent = `Word: ${word}`;
      return {dom};
    }
  };
});

// Base theme for the hover tooltip
const hoverTooltipTheme = EditorView.baseTheme({
  ".cm-tooltip-hover": {
    backgroundColor: "#4a5568",
    color: "white",
    border: "none",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "0.8em",
    fontFamily: 'Fira Code, monospace',
    "& .cm-tooltip-arrow:before": {
      borderTopColor: "#4a5568"
    },
    "& .cm-tooltip-arrow:after": {
      borderTopColor: "transparent"
    }
  }
});

export function cursorTooltip() {
  return [
    cursorTooltipField, 
    cursorTooltipBaseTheme,
    wordHover,
    hoverTooltipTheme
  ];

}
