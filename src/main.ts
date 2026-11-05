const canvas = document.getElementById("drawingCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

if(!ctx) {
    throw new Error("Failed to get 2D context");
}
ctx.lineWidth = 5;
ctx.lineCap = "round";
ctx.lineJoin ="round";

let isDrawing: boolean = false;
let isErasing:boolean = false;

const eraserButton = document.getElementById("eraserButton") as HTMLButtonElement;
eraserButton.addEventListener("click", () => {
    isErasing = !isErasing;
    if(isErasing) {
        eraserButton.textContent = "Eraser ON";
    } else{
        eraserButton.textContent = "Eraser OFF";
    }
const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
clearButton.addEventListener("click", () => {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    
});

const saveButton = document.getElementById("saveButton") as HTMLButtonElement;
saveButton.addEventListener("click", () => {
    const image = canvas.toDataURL("image/png");
    const link =document.createElement("a");
    link.href = image;
    link.download = "drawing.png";
    link.click();
});

const colorPicker = document.getElementById("colorPicker") as HTMLInputElement;
colorPicker.addEventListener("input", () => {
    ctx.strokeStyle = colorPicker.value;
});
const brushSize = document.getElementById("brushSize") as HTMLInputElement;
const brushSizeValue = document.getElementById("brushSizeValue") as HTMLSpanElement;
brushSize.addEventListener("input", ()=>{ 
    ctx.lineWidth = Number(brushSize.value);
    brushSizeValue.textContent = brushSize.value;
});


canvas.addEventListener("pointerdown", (event) => {
    isDrawing = true;
    if(isErasing) {
        ctx.globalCompositeOperation = "destination-out";
    } else {
        ctx.globalCompositeOperation ="source-over";
        ctx.strokeStyle = colorPicker.value;
    }
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
});
