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
const eraserButton = document.getElementById("eraserButton");
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
canvas.addEventListener('pointercancel', () => {
    isDrawing = false;
});
class DrawingApp {
    isDrawing = false;
    isErasing = false;
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