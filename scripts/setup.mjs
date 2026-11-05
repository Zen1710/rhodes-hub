// Prepares this machine for Rhodes Hub. Safe to run again at any time.
// It never installs system software for you: it prints the command to run instead.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const has = (command, args = ['--version']) =>
	spawnSync(command, args, { stdio: 'ignore' }).status === 0;

let problems = 0;
const ok = (message) => console.log(`  ok    ${message}`);
const todo = (message, fix) => {
	problems++;
	console.log(`  todo  ${message}\n        run: ${fix}`);
};

console.log('Rhodes Hub setup\n');

if (has('ffmpeg', ['-version']) && has('ffprobe', ['-version'])) ok('ffmpeg and ffprobe');
else todo('ffmpeg is not installed (needed by the Music tools)', 'brew install ffmpeg');

if (!has('uv')) {
	todo('uv is not installed (needed for Remove vocal)', 'brew install uv');
} else if (!existsSync('python/pyproject.toml')) {
	ok('uv (the Python environment for Remove vocal arrives in a later build step)');
} else {
	console.log('  ...   uv sync in python/');
	const sync = spawnSync('uv', ['sync'], { cwd: 'python', stdio: 'inherit' });
	if (sync.status === 0) ok('Python environment for Remove vocal');
	else todo('uv sync failed in python/', 'cd python && uv sync');
}

console.log(
	problems === 0
		? '\nAll set. Start Rhodes Hub with: pnpm dev'
		: `\n${problems} thing(s) to do. Run the commands above, then pnpm run setup again.`
);
