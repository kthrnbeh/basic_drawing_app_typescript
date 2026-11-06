const canvas = document.getElementById("drawingCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

if (!ctx) {
    throw new Error("Failed to get 2D context");
}

ctx.lineWidth = 5;
ctx.lineCap = "round";
ctx.lineJoin = "round";

let isDrawing: boolean = false;
let isErasing: boolean = false;

function getCanvasPosition(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
}

type shapeKind = "rectangle" | "circle" | "line" | "triangle";

class ShapeTool {
    private currentShape: shapeKind | null = null;
    private startX: number = 0;
    private startY: number = 0;
    private dragging: boolean = false;
    private snapshot: ImageData | null = null;

    constructor(
        private canvas: HTMLCanvasElement,
        private ctx: CanvasRenderingContext2D,
    ) {
        const buttons: { id: string; tool: shapeKind | null }[] = [
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

    public isActive(): boolean {
        return this.currentShape !== null;
    }

    public selectTool(shape: shapeKind | null): void {
        this.currentShape = shape;
        isDrawing = false;
        isErasing = false;
        eraserButton.classList.remove("active");
        const buttons =['brush','rectangle','circle','line','triangle'];

        buttons.forEach((name)=>{
            const button= document.getElementById(name +'Button');
            button?.classList.toggle("selected", name===(shape ?? 'brush'));

        });
    }

    private start(event: PointerEvent): void {
        if(!this.currentShape || event.button !== 0) return;
        const position = getCanvasPosition(event);
        this.startX = position.x;
        this.startY = position.y;
        this.dragging = true;
        this.snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = "source-over";
    }

    // Add move, finish, and cancel implementations here when you implement shape drawing.
    private move(event:PointerEvent): void{
        if(!this.dragging || !this.snapshot) return;
        if((event.buttons & 1) === 0){
            this.cancel();
            return;
        }
        this.ctx.putImageData(this.snapshot,0,0);
        this.drawShape(event);
    }
    private finish(event:PointerEvent):void {
        if(!this.dragging || !this.snapshot)return;
        this.ctx.putImageData(this.snapshot,0,0);
        this.drawShape(event);
        this.dragging=false;
        this.snapshot = null;
    }
    private cancel():void {
        if (this.snapshot){
            this.ctx.putImageData(this.snapshot,0,0);
        }
        this.dragging =false;
        this.snapshot =null;
    }
    private drawShape(event:PointerEvent):void{
        const position = getCanvasPosition(event);
        const x =position.x;
        const y =position.y;
        const width =x-this.startX;
        const height=y-this.startY;

        this.ctx.save();
        this.ctx.lineWidth = Number(brushSize.value);
        this.ctx.strokeStyle= colorPicker.value;
        this.ctx.fillStyle = colorPicker.value;
        this.ctx.beginPath();

        switch (this.currentShape){
            case "rectangle":
                this.ctx.rect(this.startX,this.startY,width,height);
                break;
            case"circle":
                const radius= Math.hypot(width,height)
                this.ctx.arc(this.startX,this.startY,radius,0,Math.PI *2);
                break;
            case 'line':
                this.ctx.moveTo(this.startX,this.startY);
                this.ctx.lineTo(x,y);
                break;
            case 'triangle':
                this.ctx.moveTo(this.startX + width/2,this.startY);
                this.ctx.lineTo(this.startX,y);
                this.ctx.lineTo(x,y);
                this.ctx.closePath();
                break
        }
        const fillShape = document.getElementById('fillShape')as HTMLInputElement;

        if (fillShape.checked && this.currentShape !== "line"){
            this.ctx.fill();
        }
        else{
            this.ctx.stroke();
        }
        this.ctx.restore();
    }
   
}


const eraserButton = document.getElementById("eraserButton") as HTMLButtonElement;
const shapeTool = new ShapeTool(canvas, ctx);

eraserButton.addEventListener("click", () => {
    const nextState = !isErasing;
    shapeTool.selectTool(null);

    isErasing = nextState;
    eraserButton.classList.toggle("active", isErasing);
});

const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
clearButton.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

const saveButton = document.getElementById("saveButton") as HTMLButtonElement;
saveButton.addEventListener("click", () => {
    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
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
brushSize.addEventListener("input", () => {
    ctx.lineWidth = Number(brushSize.value);
    brushSizeValue.textContent = brushSize.value;
});

canvas.addEventListener("pointerdown", (event) => {
    if (shapeTool.isActive()) return;
    isDrawing = true;
    if (isErasing) {
        ctx.globalCompositeOperation = "destination-out";
    } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = colorPicker.value;
    }
    const position = getCanvasPosition(event);
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
});

canvas.addEventListener("pointermove", (event) => {
    if(shapeTool.isActive())return;
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
    private isDrawing: boolean = false;
    private isErasing: boolean = false;

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
