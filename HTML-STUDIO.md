# HTML Studio

On macOS, use **Start-Editor.command**. After copying the project from Windows, open Terminal in its folder and run `chmod +x Start-Editor.command` once, then double-click the file in Finder. Alternatively, run `bash Start-Editor.command` without changing permissions. The launcher finds standard Node.js/Homebrew/nvm installations, installs dependencies when missing, and opens `/editor`. Keep Terminal open while working; press Control+C to stop.

On Windows, double-click **Start-Editor.bat** in the project folder. It starts the editor and opens `/editor` in your default browser, or reuses the editor if it is already running. Keep its terminal open while working; press Ctrl+C to stop a server started by the launcher. No database is required. You can also run `npm.cmd run editor`.

Run `npm.cmd run dev`, then open **http://localhost:5173/editor**. The editor itself does not need the database. You can also run `npx.cmd vite --host 127.0.0.1` to start only the frontend.

## Import and edit

- Import an HTML file, a website ZIP, or a website folder. The existing document is the canvas; the practice page is replaced only when you import.
- For the current OSLC preview, click **Open OSLC** to load the actual local `oslc-whole-site.html` in one click, or import the file manually.
- Import associated files together in a ZIP or folder to preserve their directory paths. Add missing resources with **Assets → Import assets**.
- Click an element, choose a layer, or use **Select parent element** to move out of deeply nested spans. Double-click a text-only element to edit it; Enter commits, Shift+Enter adds a line, and Escape cancels.
- The inspector changes text, attributes, typography, layout, colors, borders, shadows and image settings. Fields commit when you press Enter or leave them.
- Select an element, then **Alt + drag** to move it using a CSS transform. Drag the bottom-right selection handle to resize. Movement snaps to an 8 px grid, with alignment guides at parent edges and centers. Use the layer actions to reorder siblings, duplicate, hide, delete and lock elements. Destructive text replacement and deletion require confirmation.
- Insert semantic elements with the Insert panel, or drag an insert item into a container on the canvas.
- Undo/redo operate on committed project changes, including imports, visual edits, source application and asset replacement. The most recent 50 snapshots are retained. CodeMirror separately supports undo within an uncommitted draft.

## Responsive and source editing

Desktop, tablet and mobile change the actual iframe viewport. Zoom changes its displayed scale. Existing media queries remain intact.

Check **Edit only tablet/mobile breakpoint** to create scoped media-query overrides at 1024 px or 600 px. Mobile inherits base and tablet rules. Desktop edits change the base style. Overrides use `!important` to override inline styles; inspect them under **Code → CSS → Visual responsive overrides**.

The HTML tab shows the current original document with source-backed modifications. The CSS tab exposes external CSS files, individual inline stylesheets and responsive overrides. The JavaScript tab exposes external scripts; inline scripts are shown together for inspection and edited in the HTML tab so their placement and execution order remain explicit. Apply a source draft to reload the canvas. A pending draft blocks export until applied or discarded. CodeMirror supplies syntax highlighting; runtime errors appear in the status bar, and JavaScript syntax is checked by a parser before applying. This is not a complete HTML/CSS/JavaScript validator. Unsupported inspector values are reported; experimental CSS can be retained through source editing.

Source-backed edits patch parser-provided source ranges instead of serializing the entire document. Comments, scripts, class names and unrelated markup stay intact. Text, attribute, spacing, typography and appearance edits apply directly to the existing preview, preserving scroll and transient application state. Structural edits, asset replacement, source application, undo/redo and explicit reload rebuild the preview. Source parsing is cached, and animation-only style/class mutations do not rebuild the layer tree. The canvas automatically fits its available workspace; use **Fit** to restore a comfortable zoom after zooming manually.

## Generated content and compatibility

Script-generated elements have a visible **SCRIPT-GENERATED · REPLAY EDIT** badge. Their original application source cannot be inferred from rendered DOM. Edits are stored as selectors and exported in a small independent replay script which waits for the generated elements. It has no dependency on HTML Studio. Use **Generated source** to download the exact final document, including this script.

Generated selectors depend on DOM structure. Later source changes or application navigation can invalidate them. Complex frameworks that repeatedly overwrite the same DOM element, closed shadow roots, nested frames, canvas/WebGL output, circular module imports, import maps and dynamically computed resource URLs may need manual source changes. No unsupported application code is silently removed from the project or export. The original file remains available in project history; exported source retains original scripts.

The preview has an opaque-origin sandbox, loaded through a dedicated preview document. Scripts execute only inside it and can be switched off. Production security headers permit inline imported scripts only on that isolated preview document; the editor UI retains its strict script policy. CSP blocks fetch/WebSocket connections, remote scripts/styles/images/fonts, nested frames, objects and form submissions. Imports are local to the browser. External links are intercepted in interactive preview; local imported HTML pages can be navigated through the page picker. Backend-dependent functions require a normal hosted export with its original services. Missing local assets and script errors are reported in the status bar. Third-party fonts and remote media must be supplied as local assets for an offline preview.

## Save and export

- **Save project** downloads a `.htmlstudio.json` file containing all imported files, edits, overrides and locks. **Open project** restores it. Save before closing: work is held in memory, and the editor warns before leaving a changed session.
- **HTML · preserve asset paths** exports the active HTML page with its intended modifications and original resource paths.
- **Complete website ZIP** exports all original files, including unchanged assets and scripts, plus changes to each edited page. Serve the extracted folder to retain root-relative URLs and application behavior.
- **Self-contained HTML** embeds locally supplied stylesheets, scripts, images, fonts and CSS resource URLs in the active page. It also embeds replacement image resources used by generated-element edits. Remote resources, backend APIs, dynamically computed file paths and imported page navigation cannot automatically become offline services. Missing local references are reported; they are retained in the output.

Downloads are new artifacts. The application never writes over the imported files.

## Verification

`npx.cmd tsx --test tests/editor.test.ts` checks source preservation, structural edits, nested asset embedding, ZIP contents, runtime replay and sandbox preparation.

With Vite running, `npm.cmd run test:editor` runs headless Chrome through an actual HTML import, text/color/spacing/image replacement, undo/redo, viewport switching, responsive overrides, insert/duplicate/delete, inline CSS editing, ZIP export/reimport, project save/reopen, zoomed pointer selection, self-contained export and normal-browser file reopen. It also imports and edits the real OSLC export and verifies its generated-content replay outside the editor. A second interaction check covers double-click editing, dragging, resizing, layer locks, visibility, sibling reordering and parent selection. Chrome must be installed; set `EDITOR_TEST_URL` for another running frontend or production URL. Test artifacts are under ignored `.local/editor-test/`.
