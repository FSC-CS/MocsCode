import {Compartment} from "@codemirror/state"
import {keymap, EditorView} from "@codemirror/view"

/**
 * Creates an extension that toggles another extension on/off with a keyboard shortcut
 * @param {string} key - The key combination to use (e.g., "Mod-o")
 * @param {Extension} extension - The extension to toggle
 * @param {boolean} initiallyOn - Whether the extension should be initially enabled
 * @returns {Extension[]} An array of extensions
 */
export function toggleWith(key, extension, initiallyOn = false) {
  // Create a private compartment for this toggle
  const toggleCompartment = new Compartment()
  
  // Function to toggle the extension on/off
  function toggle(view) {
    // Check if the extension is currently active
    const isOn = toggleCompartment.get(view.state) != null && 
                toggleCompartment.get(view.state).length > 0
    
    // Dispatch a transaction to toggle the extension
    view.dispatch({
      effects: toggleCompartment.reconfigure(isOn ? [] : extension)
    })
    
    return true
  }
  
  // Return the compartment (initially with or without the extension) and the keymap
  return [
    toggleCompartment.of(initiallyOn ? extension : []),
    keymap.of([{key, run: toggle}])
  ]
}

/**
 * Creates a toggle for line wrapping
 * @param {string} key - The key combination to use
 * @param {boolean} initiallyOn - Whether line wrapping should be initially enabled
 * @returns {Extension[]} An array of extensions
 */
export function toggleLineWrapping(key = "Alt-w", initiallyOn = false) {
  return toggleWith(
    key, 
    EditorView.lineWrapping,
    initiallyOn
  )
}

/**
 * Creates a toggle for highlighting the active line
 * @param {string} key - The key combination to use
 * @param {boolean} initiallyOn - Whether active line highlighting should be initially enabled
 * @returns {Extension[]} An array of extensions
 */
export function toggleHighlightActiveLine(key = "Alt-h", initiallyOn = true) {
  return toggleWith(
    key,
    EditorView.theme({
      ".cm-activeLine": {
        backgroundColor: "#f0f8ff"
      }
    }),
    initiallyOn
  )
}

/**
 * Creates a toggle for a yellow background (as shown in the example)
 * @param {string} key - The key combination to use
 * @param {boolean} initiallyOn - Whether the yellow background should be initially enabled
 * @returns {Extension[]} An array of extensions
 */
export function toggleYellowBackground(key = "Mod-o", initiallyOn = false) {
  return toggleWith(
    key,
    EditorView.editorAttributes.of({
      style: "background: yellow"
    }),
    initiallyOn
  )
}
