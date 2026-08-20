# Changelog — jo65536/Telmi-Sync fork

Experimental fork of [DantSu/Telmi-Sync](https://github.com/DantSu/Telmi-Sync).
Not an official release. Versions are tagged `v0.17.0-home.N`; the app keeps the
upstream `0.17.0` base with a `-home.N` build suffix.

## home.8
- Fix a blocker where a parallel import could hang forever (and wedge the import
  queue) if a conversion failed at the wrong moment.
- Serialize overlapping optimize-audio and story-merge runs (they queue now)
  instead of clobbering the running task; a failed conversion no longer drops a
  later same-named file; re-triggering a running task keeps its reported state.

## home.7
- Non-blocking background **task manager**: a bottom bar with global progress
  that expands into a torrent/vSphere-style list of tasks — each with its own
  progress, the files currently being processed (music by music), a kill button,
  and errors. Replaces the blocking full-screen task modals.
- **Recursive folder import**: drop a parent folder and every audio file in it
  and its subfolders is imported as music.
- **Parallel import**: conversions run several at once (CPU-sized pool); SD
  transfers stay sequential.

## home.6
- Remove the Studio authoring editor and the desktop story player — the app
  becomes a lean "copy stories/music/podcasts to a Miyoo" tool.

## home.5
- Fix eject crashing the app on macOS/Linux (ported upstream fix was
  Windows-only).

## home.3 / home.4
- Finder-like list view with sortable typed columns per table.
- Integrated podcast search (iTunes + fyyd; resolves a pasted Spotify show URL
  to its RSS feed).
- Self-targeted update checker; separate Intel (x64) and Apple Silicon (arm64)
  builds.

## home.1 / home.2
- Import/transfer/error fixes; import UX (Add-files button, empty states, success
  flash); UI polish (min window size, Escape/backdrop modal close, OS-locale,
  cancellable transfers); removed the Android App feature and its LAN server;
  finished the stores multi-selection; native macOS light theme.

## Not yet merged
- **SD-card scan cache** (PR #20): caches the parsed card scan per card with
  fingerprint-based invalidation. Awaiting a real-card test.
