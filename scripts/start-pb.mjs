import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const pb = spawn(
  'D:\\AI App\\pocketbase.exe',
  [
    'serve',
    '--dir',           path.join(root, 'pocketbase', 'pb_data'),
    '--hooksDir',      path.join(root, 'pocketbase', 'pb_hooks'),
    '--migrationsDir', path.join(root, 'pocketbase', 'pb_migrations'),
  ],
  { stdio: 'inherit', shell: false }
);

pb.on('error', (err) => { console.error('Failed to start PocketBase:', err.message); process.exit(1); });
pb.on('close', (code) => process.exit(code ?? 0));
