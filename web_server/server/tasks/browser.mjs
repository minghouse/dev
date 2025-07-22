import { spawn } from 'child_process';
import path from 'path';

const browser = (req, res) => {
    const url = req.query.url;
    const selector = req.query.selector || 'body';
    const auth = req.query.auth;
    const BROWSER_AUTH = process.env.BROWSER_AUTH;

    if (auth !== BROWSER_AUTH) {
        res.end('auth error');
        return;
    }

    const child = spawn('node', [
        path.resolve('./web_server/server/tasks/browser_child.mjs'),
        url,
        selector,
        auth,
        BROWSER_AUTH,
    ]);

    const TIMEOUT_MS = 35000;
    const timeout = setTimeout(() => {
        console.warn('[Child Process] Timeout, killing...');
        child.kill('SIGKILL');
    }, TIMEOUT_MS);

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
        output += data.toString();
    });

    child.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });

    child.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(output);
        } else {
            console.error('[Child Process Error]', errorOutput);
            res.end(errorOutput || '[ERROR]');
        }
    });

    child.on('error', (err) => {
        console.error('[Spawn Error]', err);
        res.end('[ERROR]');
    });
};

export default browser;