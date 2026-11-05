# Rhodes Hub

A collection of file-processing tools (images, audio, and more later) that runs on your own machine.

## Language

**Tool**:
A single, self-contained file-processing function, such as Compress image or Remove vocal. Each Tool has its own page.
_Avoid_: sub menu, feature, app

**Category**:
A group of Tools defined by the kind of file they process, such as Image and Music. Each Tool belongs to exactly one Category.
_Avoid_: menu, section

**Job**:
One run of a Tool on exactly one input file (an uploaded file, or an output file of another Job) with specific settings. Its status is queued, running, done, failed (an error occurred), or canceled (stopped by the user). It produces one or more output files.
_Avoid_: task, process, request

**Batch**:
A set of Jobs created together from a single multi-file input, sharing the same Tool and settings. Each Job in it succeeds or fails on its own.
_Avoid_: bulk, group

**Lane**:
The queue where a Job waits and runs, determined by its Tool. There are two: Heavy for Tools that run an AI model, and Light for all other Tools.
_Avoid_: queue, channel, pool
