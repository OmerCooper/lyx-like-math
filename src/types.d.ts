// esbuild loads .css as text (see esbuild.config.mjs)
declare module "*.css" {
  const content: string;
  export default content;
}
