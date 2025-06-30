// collaborative-editor.js - Yjs collaborative editing features
import * as Y from 'yjs'
// @ts-ignore
import { yCollab } from 'y-codemirror.next'
import { WebsocketProvider } from 'y-websocket'
import * as random from 'lib0/random'

/**
 * Creates collaborative editing extensions for CodeMirror
 * @param {string} roomId - Unique identifier for the collaboration room
 * @param {Object} options - Configuration options
 * @param {string} [options.userName] - User name for awareness
 * @param {Object} [options.userColor] - User color for cursor/selection
 * @returns {Object} Collaborative extensions and utilities
 */

export function createCollaborativeExtensions(roomId, options = {}) {
  if (!roomId) {
    throw new Error('roomId is required for collaborative editing');
  }

  console.log('Creating collaborative extensions for room:', roomId);

  // Create Yjs document and provider
  const ydoc = new Y.Doc();
  const provider = new WebsocketProvider('wss://656d-24-231-63-11.ngrok-free.app', roomId, ydoc);
  const ytext = ydoc.getText('codemirror');
  const undoManager = new Y.UndoManager(ytext);

  console.log("PROVIDER", provider);

  // Set user awareness information
  const userName = options.userName || `Anonymous ${Math.floor(Math.random() * 100)}`;
  const userColor = options.userColor || {
    color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
    light: `hsl(${Math.floor(Math.random() * 360)}, 70%, 85%)`
  };

  provider.awareness.setLocalStateField('user', {
    name: userName,
    color: userColor.color,
    colorLight: userColor.light
  });

  // Create collaborative extension
  const collabExtension = yCollab(ytext, provider.awareness, { undoManager });

  // Event listeners for collaboration events
  const eventListeners = {
    onUserJoin: null,
    onUserLeave: null,
    onContentChange: null
  };

  // Add connection status handling
  provider.on('status', event => {
    console.log('Connection status:', event.status);
  });

  // Add sync status
  provider.on('sync', isSynced => {
    console.log('Document synced:', isSynced);
  });

  // Set up awareness change listener
  provider.awareness.on('change', (changes) => {
    if (eventListeners.onUserJoin || eventListeners.onUserLeave) {
      changes.added.forEach(clientId => {
        const user = provider.awareness.getStates().get(clientId)?.user;
        if (user && eventListeners.onUserJoin) {
          eventListeners.onUserJoin(user, clientId);
        }
      });

      changes.removed.forEach(clientId => {
        if (eventListeners.onUserLeave) {
          eventListeners.onUserLeave(clientId);
        }
      });
    }
  });

  // Set up document change listener
  ytext.observe(event => {
    if (eventListeners.onContentChange) {
      eventListeners.onContentChange(event.delta, ytext.toString());
    }
  });

  return {
    // Extensions to add to CodeMirror
    extensions: [collabExtension],
    
    // Utilities
    provider,
    ydoc,
    ytext,
    undoManager,
    
    // Get current document content
    getContent: () => ytext.toString(),
    
    // Get connected users
    getConnectedUsers: () => {
      const users = [];
      provider.awareness.getStates().forEach((state, clientId) => {
        if (state.user) {
          users.push({ ...state.user, clientId });
        }
      });
      return users;
    },
    
    // Event listener setters
    onUserJoin: (callback) => { eventListeners.onUserJoin = callback; },
    onUserLeave: (callback) => { eventListeners.onUserLeave = callback; },
    onContentChange: (callback) => { eventListeners.onContentChange = callback; },
    
    // Cleanup function
    destroy: () => {
      provider.destroy();
      ydoc.destroy();
    }
  };
}

/**
 * Creates a simple collaborative editor setup
 * @param {string} roomId - Room identifier
 * @param {Object} options - Configuration options
 * @returns {Array} Array of extensions ready for CodeMirror
 */
export function createSimpleCollaboration(roomId, options = {}) {
  const collab = createCollaborativeExtensions(roomId, options);
  return collab.extensions;
}