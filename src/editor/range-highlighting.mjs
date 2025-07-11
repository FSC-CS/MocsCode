import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import { invertedEffects } from "@codemirror/commands";
import { keymap } from "@codemirror/view";

// Define our highlight effects
const addHighlight = StateEffect.define({
  map: mapRange
});

const removeHighlight = StateEffect.define({
  map: mapRange
});

// Helper function to map range positions through document changes
function mapRange(range, change) {
  let from = change.mapPos(range.from);
  let to = change.mapPos(range.to);
  return from < to ? { from, to } : undefined;
}

// Define the highlight decoration
const highlight = Decoration.mark({
  attributes: { 
    class: "cm-highlight",
    style: `background-color: rgba(255, 220, 150, 0.05)`
  }
});

// State field to track highlighted ranges
const highlightedRanges = StateField.define({
  create() {
    return Decoration.none;
  },
  update(ranges, tr) {
    // Map existing ranges through document changes
    ranges = ranges.map(tr.changes);
    
    // Apply effects
    for (let e of tr.effects) {
      if (e.is(addHighlight)) {
        ranges = addRange(ranges, e.value);
      } else if (e.is(removeHighlight)) {
        ranges = cutRange(ranges, e.value);
      }
    }
    return ranges;
  },
  provide: field => EditorView.decorations.from(field)
});

// Helper to add a range, merging with adjacent highlights
function addRange(ranges, range) {
  let { from, to } = range;
  
  // Find and merge with adjacent highlights
  ranges.between(from, to, (rFrom, rTo) => {
    if (rFrom < from) from = rFrom;
    if (rTo > to) to = rTo;
  });
  
  return ranges.update({
    filterFrom: from,
    filterTo: to,
    filter: () => false, // Remove existing highlights in this range
    add: [highlight.range(from, to)]
  });
}

// Helper to cut out a range from existing highlights
function cutRange(ranges, range) {
  let { from, to } = range;
  let leftover = [];
  
  // Find ranges that overlap with our range and keep the non-overlapping parts
  ranges.between(from, to, (rFrom, rTo) => {
    if (rFrom < from) {
      leftover.push(highlight.range(rFrom, from));
    }
    if (rTo > to) {
      leftover.push(highlight.range(to, rTo));
    }
  });
  
  return ranges.update({
    filterFrom: from,
    filterTo: to,
    filter: () => false, // Remove existing highlights in this range
    add: leftover
  });
}

// Set up effect inversion for undo/redo
const invertHighlight = invertedEffects.of(tr => {
  let found = [];
  
  // Invert add/remove highlight effects
  for (let e of tr.effects) {
    if (e.is(addHighlight)) {
      found.push(removeHighlight.of(e.value));
    } else if (e.is(removeHighlight)) {
      found.push(addHighlight.of(e.value));
    }
  }
  
  // Handle highlights in changed ranges
  let ranges = tr.startState.field(highlightedRanges);
  tr.changes.iterChangedRanges((chFrom, chTo) => {
    ranges.between(chFrom, chTo, (rFrom, rTo) => {
      let from = Math.max(chFrom, rFrom);
      let to = Math.min(chTo, rTo);
      if (from < to) found.push(addHighlight.of({ from, to }));
    });
  });
  
  return found;
});

// Command to highlight the current selection
export function highlightSelection(view) {
  let effects = [];
  
  for (let range of view.state.selection.ranges) {
    if (!range.empty) {
      effects.push(addHighlight.of({
        from: range.from,
        to: range.to
      }));
    }
  }
  
  if (effects.length > 0) {
    view.dispatch({ effects });
  }
  return true;
}

// Command to remove highlights from the current selection
export function unhighlightSelection(view) {
  let ranges = view.state.field(highlightedRanges);
  let effects = [];
  
  for (let sel of view.state.selection.ranges) {
    ranges.between(sel.from, sel.to, (from, to) => {
      let start = Math.max(sel.from, from);
      let end = Math.min(sel.to, to);
      if (start < end) {
        effects.push(removeHighlight.of({ from: start, to: end }));
      }
    });
  }
  
  if (effects.length > 0) {
    view.dispatch({ effects });
  }
  return true;
}

// Keymap for highlight commands
const highlightKeymap = keymap.of([
  { key: "Mod-h", run: highlightSelection },
  { key: "Shift-Mod-h", run: unhighlightSelection }
]);

// Theme for the highlight style
const highlightTheme = EditorView.baseTheme({
  ".cm-highlight": {
    borderRadius: "2px",
    padding: "0 2px"
  }
});

// Export the complete extension
// Add this to your editor's extensions to enable range highlighting
export function rangeHighlighting() {
  return [
    highlightedRanges,
    invertHighlight,
    highlightKeymap,
    highlightTheme
  ];
}
