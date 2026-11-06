const canvas = document.getElementById("drawingCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

if (!ctx) throw new Error("Failed to get 2D context");

ctx.lineWidth = 5;
ctx.lineCap = "round";
ctx.lineJoin = "round";

let isDrawing = false;
let isErasing = false;

function getCanvasPosition(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
}

type ShapeKind = "rectangle" | "circle" | "line" | "triangle";

class ShapeTool {
    private currentShape: ShapeKind | null = null;
    private startX = 0;
    private startY = 0;
    private dragging = false;
    private snapshot: ImageData | null = null;

    constructor(
        private canvas: HTMLCanvasElement,
        private ctx: CanvasRenderingContext2D,
    ) {
        const buttons: { id: string; tool: ShapeKind | null }[] = [
            { id: "brushButton", tool: null },
            { id: "rectangleButton", tool: "rectangle" },
            { id: "circleButton", tool: "circle" },
            { id: "lineButton", tool: "line" },
            { id: "triangleButton", tool: "triangle" },
        ];

        buttons.forEach((item) => {
            const button = document.getElementById(item.id);
            button?.addEventListener("click", () => this.selectTool(item.tool));
        });

        this.canvas.addEventListener("pointerdown", (event) => this.start(event));
        this.canvas.addEventListener("pointermove", (event) => this.move(event));
        this.canvas.addEventListener("pointerup", (event) => this.finish(event));
        this.canvas.addEventListener("pointercancel", () => this.cancel());
    }

    public isActive(): boolean {
        return this.currentShape !== null;
    }

    public selectTool(shape: ShapeKind | null): void {
        this.currentShape = shape;
        isErasing = false;
        eraserButton.classList.remove("active");
    }

    private start(event: PointerEvent): void {
        const position = getCanvasPosition(event);
        this.startX = position.x;
        this.startY = position.y;
        this.dragging = true;
        this.snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = "source-over";
    }

    private move(event: PointerEvent): void {
        if (!this.dragging || !this.currentShape || !this.snapshot) return;
        const position = getCanvasPosition(event);
        this.ctx.putImageData(this.snapshot, 0, 0);
        this.drawShape(position.x, position.y);
    }

    private finish(event: PointerEvent): void {
        if (!this.dragging) return;
        this.move(event);
        this.dragging = false;
        this.snapshot = null;
    }

    private cancel(): void {
        if (this.snapshot) this.ctx.putImageData(this.snapshot, 0, 0);
        this.dragging = false;
        this.snapshot = null;
    }

    private drawShape(endX: number, endY: number): void {
        const width = endX - this.startX;
        const height = endY - this.startY;
        this.ctx.beginPath();
        switch (this.currentShape) {
            case "rectangle":
                this.ctx.strokeRect(this.startX, this.startY, width, height);
                break;
            case "circle":
                this.ctx.arc(this.startX, this.startY, Math.sqrt(width ** 2 + height ** 2), 0, Math.PI * 2);
                this.ctx.stroke();
                break;
            case "line":
                this.ctx.moveTo(this.startX, this.startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
                break;
            case "triangle":
                this.ctx.moveTo(this.startX + width / 2, this.startY);
                this.ctx.lineTo(this.startX, endY);
                this.ctx.lineTo(endX, endY);
                this.ctx.closePath();
                this.ctx.stroke();
                break;
        }
    }
}

const eraserButton = document.getElementById("eraserButton") as HTMLButtonElement;
const shapeTool = new ShapeTool(canvas, ctx);

eraserButton.addEventListener("click", () => {
    isErasing = !isErasing;
    eraserButton.classList.toggle("active", isErasing);
    if (isErasing) shapeTool.selectTool(null);
});

const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
clearButton.addEventListener("click", () => ctx.clearRect(0, 0, canvas.width, canvas.height));

const saveButton = document.getElementById("saveButton") as HTMLButtonElement;
saveButton.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "drawing.png";
    link.click();
});

const colorPicker = document.getElementById("colorPicker") as HTMLInputElement;
colorPicker.addEventListener("input", () => ctx.strokeStyle = colorPicker.value);

const brushSize = document.getElementById("brushSize") as HTMLInputElement;
const brushSizeValue = document.getElementById("brushSizeValue") as HTMLSpanElement;
brushSize.addEventListener("input", () => {
    ctx.lineWidth = Number(brushSize.value);
    brushSizeValue.textContent = brushSize.value;
});

canvas.addEventListener("pointerdown", (event) => {
    if (shapeTool.isActive()) return;
    isDrawing = true;
    ctx.globalCompositeOperation = isErasing ? "destination-out" : "source-over";
    if (!isErasing) ctx.strokeStyle = colorPicker.value;
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

canvas.addEventListener("pointerup", () => isDrawing = false);
canvas.addEventListener("pointercancel", () => isDrawing = false);

class DrawingApp {
    private isDrawing = false;
    private isErasing = false;

    constructor() {
        console.log("DrawingApp started");
    }

    startDrawing(): void {
        this.isDrawing = true;
        console.log("Drawing start");
    }

    stopDrawing(): void {
        this.isDrawing = false;
        console.log("Drawing stop");
    }
}

const app = new DrawingApp();
app.startDrawing();
app.stopDrawing();
