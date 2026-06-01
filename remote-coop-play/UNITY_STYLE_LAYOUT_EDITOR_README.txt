REMOTE COOP PLAY - UNITY STYLE LAYOUT EDITOR

This patch adds a real rearrangeable UI layer.

New:
- Edit layout button in the top bar.
- Save layout button.
- Reset layout button.
- Drag panels by their layout bar.
- Resize panels from the corner.
- Dock panels left, center, right, or bottom.
- Collapse panels.
- Floating panel positions.
- Layout is saved locally in the user's app settings.
- Reset returns the layout to default.
- The stream panel can stay central while Party, Debug, and Controls can move around it.

Panels included:
- Controls
- Stream
- Party
- Debug

How to use:
1. Click Edit layout.
2. Drag a panel by its top bar.
3. Resize from the panel corner.
4. Drop it on a dock zone or press L/C/R/B.
5. Press Save layout, or exit layout mode to auto-save.
6. Press Reset layout to restore defaults.

Notes:
- On small screens, panels switch to safer relative layout instead of absolute floating.
- The layout editor does not cover the stream during normal play. Handles appear only in edit mode.
- Stream overlay remains tiny like a game FPS counter.