/**
 * Ambient type declaration for the bundler-only `filenamify/browser` subpath.
 *
 * The installed `filenamify` package (5.0.1) only ships its types for the main
 * entry (`filenamify.d.ts`) and exposes `./browser` solely through its `exports`
 * map, which classic `moduleResolution: "node"` ignores. Without this shim the
 * import resolves to an unresolved "error" type (treated as `any`), tripping
 * type-safe eslint rules at every usage site.
 */
declare module "filenamify/browser" {
  function filenamify(
    input: string,
    options?: { replacement?: string }
  ): string;
  export default filenamify;
}