const canvas = document.getElementById("drawingCanvas") AS HTMLCanvasElement;
const ctx = canvas.getContext("2d");

if(!ctx) {
    throw new Error("Failed to get 2D context");
}
let isDrawing: boolean = false;