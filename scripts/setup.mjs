// Prepares this machine for Rhodes Hub. Safe to run again at any time.
// It never installs system software for you: it prints the command to run instead.
import { spawnSync } from 'node:child_process';

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
} else {
	console.log('  ...   uv sync in python/');
	const sync = spawnSync('uv', ['sync'], { cwd: 'python', stdio: 'inherit' });
	if (sync.status !== 0) {
		todo('uv sync failed in python/', 'cd python && uv sync');
	} else if (has('python/.venv/bin/python', ['python/separate.py', '--check'])) {
		ok('Python environment and vocal model for Remove vocal');
	} else {
		console.log('  ...   downloading the vocal model (about 70 MB, once)');
		const setup = spawnSync('python/.venv/bin/python', ['python/separate.py', '--setup'], {
			stdio: 'inherit'
		});
		if (setup.status === 0) ok('Python environment and vocal model for Remove vocal');
		else
			todo(
				'the vocal model did not download',
				'python/.venv/bin/python python/separate.py --setup'
			);
	}
}

console.log(
	problems === 0
		? '\nAll set. Start Rhodes Hub with: pnpm dev'
		: `\n${problems} thing(s) to do. Run the commands above, then pnpm run setup again.`
);
