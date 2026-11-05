const canvas = document.getElementById("drawingCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

if(!ctx) {
    throw new Error("Failed to get 2D context");
}
let isDrawing: boolean = false;
const colorPicker = document.getElementById("colorPicker") as HTMLInputElement;
colorPicker.addEventListener("input", () => {
    ctx.strokeStyle = colorPicker.value;
});
const brushSize = document.getElementById("brushSize") as HTMLInputElement;
canvas.addEventListener("pointerdown", (event) => {
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(event.offsetX, event.offsetY);
});
canvas.addEventListener("pointermove", (event) => {
    if(!isDrawing || event.button==0) {
        isDrawing = false;
        return;
    }
        ctx.lineTo(event.offsetX, event.offsetY);
        ctx.stroke();
});
canvas.addEventListener("pointerup", () => {
    isDrawing = false;
});
canvas.addEventListener('pointercancel',() => {
    isDrawing = false;
})