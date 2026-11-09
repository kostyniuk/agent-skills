# Capturing a desktop app (macOS, DataGrip)

How `scripts/record-db.py` drives and films a desktop DB client, and how to set it up before the take. Written for DataGrip; any app works if you redo the coordinates.

## Permissions

The app that runs the agent's shell (the terminal, IDE or agent desktop app) needs both, in System Settings → Privacy & Security:

- **Screen Recording**, for `screencapture`. Without it: `could not create image from display`.
- **Accessibility**, for System Events keystrokes and window sizing. Without it: `osascript is not allowed assistive access`.

Ask the user to grant them the moment either error appears, then retry.

## Input

- **Keystrokes** go through `osascript -e 'tell application "System Events" to keystroke "v" using {command down}'`.
- **Clicks, drags and horizontal scrolls** use the CoreGraphics helpers in `bin/` (`click x y [double]`, `drag x1 y1 x2 y2`, `hscroll x y px [steps]`), built by `setup.sh`. System Events `click at` fails in Java apps such as DataGrip (`AppleEvent handler failed`).
- **Coordinates are screen points**, not pixels. A Retina screenshot is 2× the points: divide pixel positions by the scale, and add the window's `y` when you measure inside a window crop.
- **Paste, don't type.** Copy text with `pbcopy` and paste it; typing into an editor triggers auto-complete and auto-closing quotes. Save the user's clipboard first and restore it after (`record-db.py` does).

## Setting up DataGrip

1. **Window.** Size it to 16:9 so it scales cleanly to 1080p. On a 1512×982-point screen, use position `{0, 33}` and size `{1512, 851}`. `record-db.py` applies `window` from `db-segment.json` for you.
2. **Console.** Select the schema node in Database Explorer, then use the toolbar's console icon → New Query Console. ⇧⌘L and ⇧⌘' clash with macOS shortcuts there, so use the toolbar.
3. **Layout.** Drag the editor/output divider so the editor shows the whole query and the output has the rest. Drag the Database Explorer and Files panels narrow, so the editor shows full lines.
4. **Coordinates.** Screenshot the window (`screencapture -x -R<x>,<y>,<w>,<h> f.png`), view it, and fill in `db-segment.json`:
   - `editor`: a point inside the editor.
   - `close_result_tab`: the × of the previous result tab, so the take opens on an empty output.
   - `grid`: a point over the result rows.
5. **Calibration.** Run the real query once over a wider window (e.g. 60 minutes), then scroll `hscroll <grid> 400` repeatedly with a screenshot after each step. Note which columns are in view at each offset. Set each beat's `px` (they add up) so the narrated columns are in view when their phrase plays. Give the last beat a large `px`: scrolling stops at the end.
6. **Zoom.** Keep Zoom IDE at 100%. Larger zoom wraps the query and hides columns. To change it, use View → Appearance → Zoom IDE…, then arrow keys and Enter (clicks on that popup don't register).

## Filming

- **Command:** `screencapture -v -C -x -V <seconds> -R<x>,<y>,<w>,<h> out.mov` films a screen region. `-C` keeps the cursor, and the output is at Retina resolution. `record-db.py` starts it, fires each action on its phrase, then cuts the take to the segment's window.
- **Trim:** recording starts about 0.25 s after the command, and `record-db.py` trims that.
- **Window on top:** the app must stay frontmost for the whole take. A headless Playwright browser doesn't take focus, so the app take can run just before.
- **Result tab:** DataGrip names it after the query's first comment line, so make that comment read well.
