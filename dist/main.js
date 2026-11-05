const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
if (!ctx) {
    throw new Error("Failed to get 2D context");
}
ctx.lineWidth = 5;
ctx.lineCap = "round";
ctx.lineJoin = "round";
let isDrawing = false;
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
    ctx.beginPath();
    ctx.moveTo(event.offsetX, event.offsetY);
});
canvas.addEventListener("pointermove", (event) => {
    if (!isDrawing || event.button == 0) {
        isDrawing = false;
        return;
    }
    ctx.lineTo(event.offsetX, event.offsetY);
    ctx.stroke();
});
canvas.addEventListener("pointerup", () => {
    isDrawing = false;
});
canvas.addEventListener('pointercancel', () => {
    isDrawing = false;
});
export {};
//# sourceMappingURL=main.js.map