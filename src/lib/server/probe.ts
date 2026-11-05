import { spawn } from 'node:child_process';
import type { Probe } from './dependencies';

/** Runs `command args` and resolves true on exit code 0. Gives up after 10 seconds. */
export const spawnProbe: Probe = (command, args) =>
	new Promise((resolve) => {
		const child = spawn(command, args, { stdio: 'ignore', timeout: 10_000 });
		child.on('error', () => resolve(false));
		child.on('exit', (code) => resolve(code === 0));
	});
