import {EditorState, Compartment} from "@codemirror/state"
import {htmlLanguage, html} from "@codemirror/lang-html"
import {language} from "@codemirror/language"
import {javascript} from "@codemirror/lang-javascript"

if (!htmlLanguage || !html || !language || !javascript) {
  console.error('[CodeMirrorTest] One or more CodeMirror language imports are undefined!', { htmlLanguage, html, language, javascript });
}

/**
 * Creates an automatic language detection extension
 * @param {Compartment} languageCompartment - The compartment to reconfigure when language changes
 * @returns {Extension} The auto-language extension
 */
export function createAutoLanguageExtension(languageCompartment) {
  if (!htmlLanguage || !html || !language || !javascript) {
    // Return a no-op extender if imports are broken
    return EditorState.transactionExtender.of(() => null);
  }
  return EditorState.transactionExtender.of(tr => {
    if (!tr.docChanged) return null
    
    // Check the first 100 characters to determine if it's HTML
    let docContent = tr.newDoc.sliceString(0, 100)
    let docIsHTML = /^\s*</.test(docContent)
    
    // Determine if the current language is HTML
    let stateIsHTML = tr.startState.facet(language) == htmlLanguage
    
    // If the detected language matches the current language, do nothing
    if (docIsHTML == stateIsHTML) return null
    
    // Otherwise, reconfigure the language compartment
    return {
      effects: languageCompartment.reconfigure(docIsHTML ? html() : javascript())
    }
  })
}
