/// <reference types="vite/client" />

// Add type declarations for path aliases
declare module "@/*" {
  import { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "@/components/*" {
  import { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "@/liveblocks.config" {
  import { RoomProvider as LiveblocksRoomProvider } from "@liveblocks/react";
  
  export const RoomProvider: typeof LiveblocksRoomProvider;
  // Re-export other types and values as needed
  export * from "./liveblocks.config";
}
