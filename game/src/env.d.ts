interface ImportMetaEnv {
  readonly VITE_ENABLE_SCORES?: string;
  readonly VITE_SCORES_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
