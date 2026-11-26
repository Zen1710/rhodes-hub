"""Stands in for python/separate.py in tests. FAKE_SEPARATOR picks the behavior: ok, fail, or slow."""

import os
import shutil
import sys
import time

input_path, output_dir, output_format = sys.argv[1:4]
mode = os.environ.get("FAKE_SEPARATOR", "ok")

if mode == "fail":
    print("Loading model", file=sys.stderr)
    print("Vocal separation failed: the audio could not be decoded.", file=sys.stderr)
    sys.exit(1)

print("progress 0.500", flush=True)
if mode == "slow":
    time.sleep(30)

base = os.path.splitext(os.path.basename(input_path))[0]
for stem in ("Vocals", "Instrumental"):
    shutil.copyfile(input_path, os.path.join(output_dir, f"{base} ({stem}).{output_format}"))
print("progress 1.000", flush=True)
