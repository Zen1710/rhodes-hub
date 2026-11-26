"""Splits one song into Vocals and Instrumental for the Remove vocal Tool.

Usage:
  separate.py <input> <output_dir> <mp3|wav>   run one Job; prints "progress <0..1>" lines
  separate.py --setup                          download the model once
  separate.py --check                          exit 0 when the package and model are in place

Errors go to stderr; the last line is shown to the user.
"""

import importlib.util
import os
import sys
import warnings

# pydub trips SyntaxWarnings on import; keep stderr for real errors, whose last line the user sees.
warnings.filterwarnings("ignore")

MODEL = "UVR-MDX-NET-Inst_HQ_3.onnx"
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
# Segment 128 keeps the run under 2.5 GB and about 1 minute per song on an 8 GB M1;
# the default 256 used 7.4 GB, swapped, and took 17 minutes (spike, 2026-11-27).
MDX_PARAMS = {"hop_length": 1024, "segment_size": 128, "overlap": 0.25, "batch_size": 1, "enable_denoise": False}


def make_separator(**options):
    import logging

    from audio_separator.separator import Separator

    return Separator(log_level=logging.ERROR, model_file_dir=MODEL_DIR, mdx_params=MDX_PARAMS, **options)


# The MDX separator demixes twice: the main pass, then a shorter pass for the second stem.
PASSES = [(0.0, 0.6), (0.6, 1.0)]
passes_done = 0


def report_progress(iterable):
    """Stands in for tqdm inside the MDX separator and reports overall progress on stdout."""
    global passes_done
    start, end = PASSES[min(passes_done, len(PASSES) - 1)]
    passes_done += 1
    items = list(iterable)
    for index, item in enumerate(items, start=1):
        yield item
        print(f"progress {start + (end - start) * index / len(items):.3f}", flush=True)


def separate(input_path, output_dir, output_format):
    from audio_separator.separator.architectures import mdx_separator

    mdx_separator.tqdm = report_progress
    separator = make_separator(output_dir=output_dir, output_format=output_format.upper())
    separator.load_model(model_filename=MODEL)
    base = os.path.splitext(os.path.basename(input_path))[0]
    separator.separate(
        input_path,
        custom_output_names={"Vocals": f"{base} (Vocals)", "Instrumental": f"{base} (Instrumental)"},
    )


def main(args):
    if args == ["--check"]:
        ready = importlib.util.find_spec("audio_separator") and os.path.exists(os.path.join(MODEL_DIR, MODEL))
        return 0 if ready else 1
    if args == ["--setup"]:
        make_separator().download_model_and_data(MODEL)
        return 0
    if len(args) != 3 or args[2] not in ("mp3", "wav"):
        print(__doc__, file=sys.stderr)
        return 2
    try:
        separate(*args)
    except Exception as error:  # Report any failure as one readable line for the Job.
        print(f"Vocal separation failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
