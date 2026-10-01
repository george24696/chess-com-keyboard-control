# Chess.com Keyboard Control

A Chrome extension that lets you play on chess.com with your keyboard. A cursor sits on the board, you move it with WASD, the arrow keys or any keys you choose, and a "click" key presses the square under the cursor, exactly like a left click. Select a piece, move the cursor, click the destination.

## Features

- Cursor overlay that follows the board, including when you play as black (the board flips)
- Movement keys and click keys are fully configurable, and several keys can share one action
- Settings page with ready-made layouts (WASD, arrows, both, Vim, IJKL, ESDF, numpad) and a test board that uses your live bindings so you can try a layout before playing
- Cursor style (outline, fill, dot), color, opacity, square-name label and edge wrap
- Cursor hides when you use the mouse and comes back when you press a key
- Keys are ignored while typing in chat or other text fields, and Ctrl/Cmd/Alt combos are left alone

## Install

1. Clone or download this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick this folder.
4. Open a game on chess.com. The cursor appears on the board.

Click the extension icon for a quick on/off switch and layout picker, or choose **Open settings and test board** for full control.

## How it works

`content.js` finds the `wc-chess-board` element, draws a fixed-position overlay on top of it, and keeps the cursor in screen coordinates so up always means up on screen. The click key dispatches a pointer and mouse event sequence at the center of the square, which chess.com handles like a normal click. Settings live in `chrome.storage.sync` and update open tabs instantly.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Manifest V3 definition |
| `content.js` | Cursor overlay and key handling on chess.com |
| `shared.js` | Presets, defaults, movement and storage helpers |
| `options.html` / `options.js` | Settings page with the test board |
| `popup.html` / `popup.js` | Toolbar popup |

## License

MIT
