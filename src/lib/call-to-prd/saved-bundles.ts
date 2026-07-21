// Barrel for saved-bundle persistence. Implementation is split under
// ./saved-bundles/* (shared helpers, read loaders, write mutations) to keep
// each file focused; import paths (@/lib/call-to-prd/saved-bundles) stay
// unchanged. Only the original public surface is re-exported.
export {
  buildSavedBundleEntryName,
  buildSavedBundleEntryPath,
} from "@/lib/call-to-prd/saved-bundles/shared";
export {
  listSavedBundles,
  loadSavedBundle,
  resolveChangeRequestBaseline,
} from "@/lib/call-to-prd/saved-bundles/read";
export {
  deleteSavedBundle,
  saveGeneratedDocsBundle,
  saveNextActionDraft,
  updateBundleDocMarkdown,
} from "@/lib/call-to-prd/saved-bundles/write";
