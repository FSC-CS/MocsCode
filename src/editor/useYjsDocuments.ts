import { useState, useCallback } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

export function useYjsDocuments() {
  const [docs, setDocs] = useState<{ [roomId: string]: { ydoc: Y.Doc, provider: WebsocketProvider, ytext: Y.Text } }>({});

  const getOrCreateDoc = useCallback(async (roomId: string, content: string, dbUser: any) => {
    console.log("GET OR CREATE DOC", roomId);
    if (docs[roomId]) {
      console.log("DOC RETRIEVED", docs[roomId]);
      return docs[roomId];
    }

    return new Promise<{ ydoc: Y.Doc, provider: WebsocketProvider, ytext: Y.Text }>((resolve) => {
      const ydoc = new Y.Doc();
      const provider = new WebsocketProvider("wss://mocscode-backend-yjs-production.up.railway.app", roomId, ydoc);
      const ytext = ydoc.getText("content");

      provider.on('sync', (isSynced: boolean) => {
        if (isSynced) {
          if (ytext.length === 0) {
            ytext.insert(0, content);
          }
          // Wait for the insert to be applied before resolving
          setTimeout(() => {
            const newDoc = { ydoc, provider, ytext };
            setDocs(prev => ({ ...prev, [roomId]: newDoc }));
            resolve(newDoc);
          }, 0);
        }
      });

      provider.awareness.setLocalStateField('user', {
        name: dbUser.name,
        color: '#ff0000'
      });
    });
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