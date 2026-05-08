const requiredNode = 18;
const major = Number(process.versions.node.split('.')[0]);

if (major < requiredNode) {
  throw new Error(`Node ${requiredNode}+ is required. Current version: ${process.version}`);
}

console.log('Netlify build ready: Express routes are rendered by netlify/functions/render.js at runtime.');
