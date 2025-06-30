// Yjs document persistence helpers
import * as Y from 'yjs';

export async function persistDocument(docName, ydoc) {
  try {
    const update = Y.encodeStateAsUpdate(ydoc);
    // Save to your database or file system here
    console.log(`Persisting document ${docName}, size: ${update.length} bytes`);
    // Example: await saveToDatabase(docName, update);
    console.log("UPDATE", update);
    console.log("YDOC", ydoc);
    console.log("DOCNAME", docName);
  } catch (error) {
    console.error('Failed to persist document:', error);
  }
}
