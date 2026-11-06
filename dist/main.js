const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
if (!ctx) {
    throw new Error("Failed to get 2D context");
}
ctx.lineWidth = 5;
ctx.lineCap = "round";
ctx.lineJoin = "round";
let isDrawing = false;
let isErasing = false;
function getCanvasPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
}
class ShapeTool {
    canvas;
    ctx;
    currentShape = null;
    startX = 0;
    startY = 0;
    dragging = false;
    snapshot = null;
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        const buttons = [
            { id: "brushButton", tool: null },
            { id: "rectangleButton", tool: "rectangle" },
            { id: "circleButton", tool: "circle" },
            { id: "lineButton", tool: "line" },
            { id: "triangleButton", tool: "triangle" },
        ];
        buttons.forEach((item) => {
            const button = document.getElementById(item.id);
            button?.addEventListener("click", () => {
                this.currentShape = item.tool;
            });
        });
        this.canvas.addEventListener("pointerdown", (event) => this.start(event));
        this.canvas.addEventListener("pointermove", (event) => this.move(event));
        this.canvas.addEventListener("pointerup", (event) => this.finish(event));
        this.canvas.addEventListener("pointercancel", (event) => this.cancel(event));
    }
    isActive() {
        return this.currentShape !== null;
    }
    selectTool(shape) {
        this.currentShape = shape;
        isErasing = false;
        eraserButton.classList.remove("active");
    }
    start(event) {
        const position = getCanvasPosition(event);
        this.startX = position.x;
        this.startY = position.y;
        this.dragging = true;
        this.snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = "source-over";
    }
}
const eraserButton = document.getElementById("eraserButton");
const shapeTool = new ShapeTool(canvas, ctx);
eraserButton.addEventListener("click", () => {
    isErasing = !isErasing;
    eraserButton.classList.toggle("active", isErasing);
});
const clearButton = document.getElementById("clearButton");
clearButton.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});
const saveButton = document.getElementById("saveButton");
saveButton.addEventListener("click", () => {
    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = image;
    link.download = "drawing.png";
    link.click();
});
const colorPicker = document.getElementById("colorPicker");
colorPicker.addEventListener("input", () => {
    ctx.strokeStyle = colorPicker.value;
});
const brushSize = document.getElementById("brushSize");
const brushSizeValue = document.getElementById("brushSizeValue");
brushSize.addEventListener("input", () => {
    ctx.lineWidth = Number(brushSize.value);
    brushSizeValue.textContent = brushSize.value;
});
canvas.addEventListener("pointerdown", (event) => {
    if (shapeTool.isActive())
        return;
    isDrawing = true;
    if (isErasing) {
        ctx.globalCompositeOperation = "destination-out";
    }
    else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = colorPicker.value;
    }
    const position = getCanvasPosition(event);
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
});
canvas.addEventListener("pointermove", (event) => {
    if (!isDrawing || event.buttons === 0) {
        isDrawing = false;
        return;
    }
    const position = getCanvasPosition(event);
    ctx.lineTo(position.x, position.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
});
canvas.addEventListener("pointerup", () => {
    isDrawing = false;
});
canvas.addEventListener("pointercancel", () => {
    isDrawing = false;
});
class DrawingApp {
    isDrawing = false;
    isErasing = false;
    constructor() {
        console.log("DrawingApp started");
    }
    startDrawing() {
        this.isDrawing = true;
        console.log("Drawing start");
    }
    stopDrawing() {
        this.isDrawing = false;
        console.log("Drawing stop");
    }
}
const app = new DrawingApp();
app.startDrawing();
app.stopDrawing();
export {};
//# sourceMappingURL=main.js.map