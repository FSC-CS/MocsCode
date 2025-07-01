import { useState, useCallback } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

export function useYjsDocuments() {
  const [docs, setDocs] = useState<{ [roomId: string]: { ydoc: Y.Doc, provider: WebsocketProvider, ytext: Y.Text } }>({});

  const getOrCreateDoc = useCallback((roomId: string, content: string, dbUser: any) => {
    if (docs[roomId]) {
      return docs[roomId];
    }

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider("wss://6b6b-24-231-63-11.ngrok-free.app", roomId, ydoc);
    const ytext = ydoc.getText("content");

    if (ytext.length === 0) {
      ytext.insert(0, content);
    }

    provider.awareness.setLocalStateField('user', {
      name: dbUser.name,
      color: '#ff0000'
    });

    const newDoc = { ydoc, provider, ytext };
    setDocs(prev => ({ ...prev, [roomId]: newDoc }));

    return newDoc;
  }, [docs]);

  const destroyDoc = useCallback((roomId: string) => {
    const doc = docs[roomId];
    if (doc) {
      doc.provider.destroy();
      doc.ydoc.destroy();
      setDocs(prev => {
        const newDocs = { ...prev };
        delete newDocs[roomId];
        return newDocs;
      });
    }
  }, [docs]);

  return { getOrCreateDoc, destroyDoc, docs };
}
