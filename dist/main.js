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
const shapePickerButton = document.getElementById("shapePickerButton");
const shapePickerPanel = document.getElementById("shapePickerPanel");
function openShapePicker() {
    shapePickerPanel.classList.remove("hidden");
}
function closeShapePicker() {
    shapePickerPanel.classList.add("hidden");
}
function toggleShapePicker() {
    shapePickerPanel.classList.toggle("hidden");
}
shapePickerButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleShapePicker();
});
shapePickerPanel.addEventListener("click", (event) => {
    event.stopPropagation();
});
document.addEventListener("click", () => {
    closeShapePicker();
});
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
            { id: "ovalButton", tool: "oval" },
            { id: "arrowButton", tool: "arrow" },
            { id: "starButton", tool: "star" },
            { id: "heartButton", tool: "heart" },
            { id: "hexagonButton", tool: "hexagon" },
        ];
        buttons.forEach((item) => {
            const button = document.getElementById(item.id);
            button?.addEventListener("click", () => {
                this.selectTool(item.tool);
                closeShapePicker();
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
        const buttons = [
            'brush',
            'rectangle',
            'circle',
            'line',
            'triangle',
            "oval",
            "arrow",
            "star",
            "heart",
            "hexagon"
        ];
        buttons.forEach((name) => {
            const button = document.getElementById(name + 'Button');
            button?.classList.toggle("selected", name === (shape ?? 'brush'));
        });
        const selectedShapeName = shape === null ? "Brush" : shape.charAt(0).toUpperCase() + shape.slice(1);
        shapePickerButton.textContent = `Shapes: ${selectedShapeName} ▾`;
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
            case "oval":
                this.ctx.ellipse(this.startX + width / 2, this.startY + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, Math.PI * 2);
                break;
            case "arrow":
                const angle = Math.atan2(y - this.startY, x - this.startX);
                const headLength = 18;
                this.ctx.moveTo(this.startX, this.startY);
                this.ctx.lineTo(x, y);
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x - headLength * Math.cos(angle - Math.PI / 6), y - headLength * Math.sin(angle - Math.PI / 6));
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x - headLength * Math.cos(angle + Math.PI / 6), y - headLength * Math.sin(angle + Math.PI / 6));
                break;
            case "star":
                const starCenterX = this.startX + width / 2;
                const starCenterY = this.startY + height / 2;
                const outerRadius = Math.min(Math.abs(width), Math.abs(height)) / 2;
                const innerRadius = outerRadius / 2.2;
                for (let i = 0; i < 10; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (Math.PI / 5) * i - Math.PI / 2;
                    const pointX = starCenterX + radius * Math.cos(angle);
                    const pointY = starCenterY + radius * Math.sin(angle);
                    if (i === 0) {
                        this.ctx.moveTo(pointX, pointY);
                    }
                    else {
                        this.ctx.lineTo(pointX, pointY);
                    }
                }
                this.ctx.closePath();
                break;
            case "heart":
                const heartLeft = Math.min(this.startX, x);
                const heartTop = Math.min(this.startY, y);
                const heartWidth = Math.abs(width);
                const heartHeight = Math.abs(height);
                this.ctx.moveTo(heartLeft + heartWidth / 2, heartTop + heartHeight);
                this.ctx.bezierCurveTo(heartLeft + heartWidth, heartTop + heartHeight * 0.75, heartLeft + heartWidth, heartTop + heartHeight * 0.25, heartLeft + heartWidth / 2, heartTop + heartHeight * 0.35);
                this.ctx.bezierCurveTo(heartLeft, heartTop + heartHeight * 0.25, heartLeft, heartTop + heartHeight * 0.75, heartLeft + heartWidth / 2, heartTop + heartHeight);
                this.ctx.closePath();
                break;
            case "hexagon":
                const hexCenterX = this.startX + width / 2;
                const hexCenterY = this.startY + height / 2;
                const hexRadius = Math.min(Math.abs(width), Math.abs(height)) / 2;
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 6;
                    const pointX = hexCenterX + hexRadius * Math.cos(angle);
                    const pointY = hexCenterY + hexRadius * Math.sin(angle);
                    if (i === 0) {
                        this.ctx.moveTo(pointX, pointY);
                    }
                    else {
                        this.ctx.lineTo(pointX, pointY);
                    }
                }
                this.ctx.closePath();
                break;
        }
        const fillShape = document.getElementById('fillShape');
        if (fillShape.checked && this.currentShape !== "line" && this.currentShape !== "arrow") {
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
shapeTool.selectTool(null);
eraserButton.addEventListener("click", () => {
    const nextState = !isErasing;
    shapeTool.selectTool(null);
    isErasing = nextState;
    eraserButton.classList.toggle("active", isErasing);
});
const clearButton = document.getElementById("clearButton");
clearButton.addEventListener("click", () => {
    clearTimeout(autoSaveTimer);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    recordHistory();
});
const undoButton = document.getElementById("undo");
undoButton.addEventListener("click", () => {
    void undoDrawing();
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
function initializeDrawing() {
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    recordHistory();
}
initializeDrawing();
const previousButton = document.getElementById("previous");
previousButton.addEventListener("click", async () => {
    const savedImage = localStorage.getItem(storageKey);
    if (!savedImage) {
        alert("No previous drawing found.");
        return;
    }
    try {
        recordHistory();
        await restoreDrawing(savedImage);
        recordHistory();
        console.log("Previous picture restored.");
    }
    catch (error) {
        console.error("Couldn't restore picture.", error);
        alert("Problem getting previous drawing.");
    }
});
const songs = [
    "./music/song1.mp3",
    "./music/song2.mp3",
    "./music/song3.mp3",
];
let currentSong = 0;
const audio = new Audio(songs[currentSong]);
audio.volume = 0.4;
const playMusic = document.getElementById("playMusic");
const previousSong = document.getElementById("previousSong");
const nextSong = document.getElementById("nextSong");
const songName = document.getElementById("songName");
const musicVolume = document.getElementById("musicVolume");
playMusic.addEventListener("click", async () => {
    if (audio.paused) {
        try {
            await audio.play();
            playMusic.textContent = "⏸";
        }
        catch (error) {
            console.error("Music didn't play", error);
        }
    }
    else {
        audio.pause();
        playMusic.textContent = "▶";
    }
});
function changeSong(direction) {
    const wasPlaying = !audio.paused;
    currentSong = (currentSong + direction + songs.length) % songs.length;
    audio.src = songs[currentSong];
    songName.textContent = `Song ${currentSong + 1}`;
    if (wasPlaying) {
        void audio.play().catch((error) => {
            console.error("Music didn't play:", error);
            playMusic.textContent = "▶";
        });
    }
    else {
        playMusic.textContent = "▶";
    }
}
nextSong.addEventListener('click', () => {
    changeSong(1);
});
previousSong.addEventListener('click', () => {
    changeSong(-1);
});
audio.addEventListener('ended', () => {
    changeSong(1);
});
musicVolume.addEventListener('input', () => {
    audio.volume = Number(musicVolume.value) / 100;
});
export {};
//# sourceMappingURL=main.js.map