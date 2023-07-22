/* Photopea scripts */
// The scripts listed here run within Photopea context. We pass them into the app as strings via
// POST messages.

// Hides all layers except the current one, outputs the whole image, then restores the previous
// layers state. I'm pretty sure getAndSendImageToWebUITab() using the same code path for this
// script and for the regular saveToOE call works out of sheer luck: we register the listener on
// postMessageToPhotopea, then receive the data for the internal app.activeDocument.saveToOE("jpg");
// below, then its done, and that solves the promise, but we end up with a dangling "done"
// response from the script execution message. But hey, if it works... ^^'
function exportSelectedLayerOnly(format, layerSelector) {
    const MAX_NESTING = 10;
    function makeLayerVisible(layer) {
        let currentLayer = layer;
        let nest = 0;

        while (currentLayer != app.activeDocument && nest < MAX_NESTING) {
            nest++;
            currentLayer.visible = true;
            if (currentLayer.parent.typename != 'Document') {
                currentLayer = currentLayer.parent;
            } else {
                break;
            }
        }
    }
    // Gets all layers recursively, including the ones inside folders.
    function getAllArtLayers(document) {
        let allArtLayers = [];

        for (let i = 0; i < document.layers.length; i++) {
            const currentLayer = document.layers[i];
            allArtLayers.push(currentLayer);
            if (currentLayer.typename === "LayerSet") {
                allArtLayers = allArtLayers.concat(getAllArtLayers(currentLayer));
            }
        }
        return allArtLayers;
    }

    const allLayers = getAllArtLayers(app.activeDocument);
    // Make all layers except the currently selected one invisible, and store
    // their initial state.
    const layerStates = [];
    for (let i = 0; i < allLayers.length; i++) {
        const layer = allLayers[i];
        layerStates.push(layer.visible);
    }
    // Hide all layers to begin with
    for (let i = 0; i < allLayers.length; i++) {
        const layer = allLayers[i];
        layer.visible = false;
    }
    for (let i = 0; i < allLayers.length; i++) {
        const layer = allLayers[i];
        const selected = layerSelector ? layerSelector(layer) : layer.selected;
        if (selected) {
            makeLayerVisible(layer);
        }
    }
    app.activeDocument.saveToOE(format || 'JPG');

    for (let i = 0; i < allLayers.length; i++) {
        const layer = allLayers[i];
        layer.visible = layerStates[i];
    }
}

// Creates a black and white mask based on the current selection in the active document. 
function createMaskFromSelection() {
    if (app.activeDocument.selection === null) {
        app.echo("No selection!");
        return;
    }

    // Create a temp layer.
    newLayer = app.activeDocument.artLayers.add();
    newLayer.name = "TempMaskLayer";

    // Fill the inverse of the selection with black.
    app.activeDocument.selection.invert();
    color = new SolidColor();
    color.rgb.red = 0
    color.rgb.green = 0
    color.rgb.blue = 0
    app.activeDocument.selection.fill(color);

    // Fill the selected part with white.
    color.rgb.red = 255
    color.rgb.green = 255
    color.rgb.blue = 255
    app.activeDocument.selection.invert();
    app.activeDocument.selection.fill(color);
}

function selectionExists() {
    // This is the best way I could find to figure this out. Seems the `selection` object always
    // exists, but bounds only has values if a selection exists.
    app.echoToOE(app.activeDocument.selection.bounds != null);
}

function getActiveDocumentSize() {
    app.echoToOE(app.activeDocument.width + "," + app.activeDocument.height);
}