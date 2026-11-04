/// <reference types="vite/client" />

interface AppVersionInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  timestamp: number;
}

declare const __APP_VERSION_INFO__: AppVersionInfo | undefined;
