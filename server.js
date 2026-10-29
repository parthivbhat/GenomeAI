import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const types = {
  '.css': 'text/css', '.gif': 'image/gif', '.html': 'text/html', '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'text/javascript', '.json': 'application/json',
  '.map': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2'
};

createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request: the URL could not be decoded.');
    return;
  }

  const requestedFile = pathname === '/' ? 'index.html' : pathname.replace(/^[/\\]+/, '');
  const filePath = normalize(join(root, requestedFile));
  const outsideRoot = isAbsolute(requestedFile) || relative(root, filePath).startsWith('..');

  if (outsideRoot) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden: static assets must be requested from the project directory.');
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not a file');
    const mime = types[extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8` });
    res.end(await readFile(filePath));
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR' || error?.message === 'Not a file') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found\n\nNo static asset exists at ${pathname}.`);
      return;
    }
    console.error(`Unable to serve ${pathname}:`, error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 Internal Server Error');
  }
}).listen(4173, () => console.log('GenomeAI prototype running at http://localhost:4173'));
