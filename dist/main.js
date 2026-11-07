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
const drawHistory = [];
const maxHistory = 25;
const storageKey = "create-saved-drawing";
let autoSaveTimer;
function getCanvasPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
}
function recordHistory() {
    const snapshot = canvas.toDataURL("image/png");
    drawHistory.push(snapshot);
    if (drawHistory.length > maxHistory) {
        drawHistory.shift();
    }
}
function findPreviousDrawing(index, current) {
    if (index < 0) {
        return -1;
    }
    if (drawHistory[index] !== current) {
        return index;
    }
    return findPreviousDrawing(index - 1, current);
}
async function autoSaveDrawing() {
    try {
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((result) => {
                if (result) {
                    resolve(result);
                }
                else {
                    reject(new Error("Could not create image"));
                }
            }, "image/png");
        });
        const image = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("could not get image"));
            reader.readAsDataURL(blob);
        });
        localStorage.setItem(storageKey, image);
        console.log("Auto-Saved");
    }
    catch (error) {
        console.error("AutoSave Fail", error);
    }
}
function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        void autoSaveDrawing();
    }, 500);
}
async function restoreDrawing(imageData) {
    const image = new Image();
    image.src = imageData;
    await image.decode();
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.restore();
}
async function undoDrawing() {
    if (drawHistory.length < 2)
        return;
    const current = drawHistory.pop();
    const previousIndex = findPreviousDrawing(drawHistory.length - 1, current);
    if (previousIndex < 0) {
        drawHistory.push(current);
        return;
    }
    drawHistory.length = previousIndex + 1;
    await restoreDrawing(drawHistory[previousIndex]);
    scheduleAutoSave();
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
                this.selectTool(item.tool);
            });
        });
        this.canvas.addEventListener("pointerdown", (event) => this.start(event));
        this.canvas.addEventListener("pointermove", (event) => this.move(event));
        this.canvas.addEventListener("pointerup", (event) => this.finish(event));
        this.canvas.addEventListener("pointercancel", (event) => this.cancel());
    }
    isActive() {
        return this.currentShape !== null;
    }
    selectTool(shape) {
        this.currentShape = shape;
        isDrawing = false;
        isErasing = false;
        eraserButton.classList.remove("active");
        const buttons = ['brush', 'rectangle', 'circle', 'line', 'triangle'];
        buttons.forEach((name) => {
            const button = document.getElementById(name + 'Button');
            button?.classList.toggle("selected", name === (shape ?? 'brush'));
        });
    }
    start(event) {
        if (!this.currentShape || event.button !== 0)
            return;
        const position = getCanvasPosition(event);
        this.startX = position.x;
        this.startY = position.y;
        this.dragging = true;
        this.snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = "source-over";
    }
    // Add move, finish, and cancel implementations here when you implement shape drawing.
    move(event) {
        if (!this.dragging || !this.snapshot)
            return;
        if ((event.buttons & 1) === 0) {
            this.cancel();
            return;
        }
        this.ctx.putImageData(this.snapshot, 0, 0);
        this.drawShape(event);
    }
    finish(event) {
        if (!this.dragging || !this.snapshot)
            return;
        this.ctx.putImageData(this.snapshot, 0, 0);
        this.drawShape(event);
        this.dragging = false;
        this.snapshot = null;
    }
    cancel() {
        if (this.snapshot) {
            this.ctx.putImageData(this.snapshot, 0, 0);
        }
        this.dragging = false;
        this.snapshot = null;
    }
    drawShape(event) {
        const position = getCanvasPosition(event);
        const x = position.x;
        const y = position.y;
        const width = x - this.startX;
        const height = y - this.startY;
        this.ctx.save();
        this.ctx.lineWidth = Number(brushSize.value);
        this.ctx.strokeStyle = colorPicker.value;
        this.ctx.fillStyle = colorPicker.value;
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.beginPath();
        switch (this.currentShape) {
            case "rectangle":
                this.ctx.rect(this.startX, this.startY, width, height);
                break;
            case "circle":
                const radius = Math.hypot(width, height);
                this.ctx.arc(this.startX, this.startY, radius, 0, Math.PI * 2);
                break;
            case 'line':
                this.ctx.moveTo(this.startX, this.startY);
                this.ctx.lineTo(x, y);
                break;
            case 'triangle':
                this.ctx.moveTo(this.startX + width / 2, this.startY);
                this.ctx.lineTo(this.startX, y);
                this.ctx.lineTo(x, y);
                this.ctx.closePath();
                break;
        }
        const fillShape = document.getElementById('fillShape');
        if (fillShape.checked && this.currentShape !== "line") {
            this.ctx.fill();
        }
        else {
            this.ctx.stroke();
        }
        this.ctx.restore();
    }
}
const eraserButton = document.getElementById("eraserButton");
const shapeTool = new ShapeTool(canvas, ctx);
eraserButton.addEventListener("click", () => {
    const nextState = !isErasing;
    shapeTool.selectTool(null);
    isErasing = nextState;
    eraserButton.classList.toggle("active", isErasing);
});
const clearButton = document.getElementById("clearButton");
clearButton.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const undoButton = document.getElementById("undo");
    undoButton.addEventListener("click", () => {
        void undoDrawing();
    });
    recordHistory();
    scheduleAutoSave();
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
    if (event.button !== 0)
        return;
    canvas.setPointerCapture(event.pointerId);
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
    if (shapeTool.isActive())
        return;
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
    recordHistory();
    scheduleAutoSave();
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
async function initailizeDrawing() {
    try {
        const savedImage = localStorage.getItems(storageKey);
        if (savedImage) {
            await restoreDrawing(savedImage);
            console.log("previous image restored");
        }
    }
    catch (error) {
        console.log("Drawing not restored.", error);
    }
    recordHistory();
}
void initailizeDrawing();
export {};
//# sourceMappingURL=main.js.map