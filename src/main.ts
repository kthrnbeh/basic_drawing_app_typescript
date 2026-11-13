//Get the html canvas, and set up drawing tools.
const canvas = document.getElementById("drawingCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
//stop if there is an error if the browser can't find
//the drawing content.
if (!ctx) {
    throw new Error("Failed to get 2D context");
}
//purpose is for the look of the drawing line. 
ctx.lineWidth = 5;
ctx.lineCap = "round";
ctx.lineJoin = "round";
//the purpose of these booleans keep the tools from just working
//even when a clicker isn't pushed. 
let isDrawing: boolean = false;
let isErasing: boolean = false;
// purpose is to keep a history of the drawings
//and saves them once it gets 25 removes the oldest drawing to put in a new one.
const drawHistory: string[] =[];
const maxHistory:number =25;
const storageKey:string = "create-saved-drawing";
let autoSaveTimer: ReturnType <typeof setTimeout> |undefined;

//purpose of this function is to help the mouse/clicker
//work only in the confines of the canvas, so that its able to not draw outside of it,
//even when the size changes.
function getCanvasPosition(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
}
//purpose link it with the html shapeinfo
const shapePickerButton = document.getElementById("shapePickerButton") as HTMLButtonElement;
const shapePickerPanel = document.getElementById("shapePickerPanel") as HTMLDivElement;
//purpose the shape menu open and closing. 
function openShapePicker(): void {
    shapePickerPanel.classList.remove("hidden");
}
function closeShapePicker(): void{
    shapePickerPanel.classList.add("hidden");
}
function toggleShapePicker(): void {
    shapePickerPanel.classList.toggle("hidden");
}
//purpse to use the mouse to click the shape menu and have it work/open or close.
shapePickerButton.addEventListener("click", (event)=> {
    event.stopPropagation();
    toggleShapePicker();
});
shapePickerPanel.addEventListener("click",(event)=>{
    event.stopPropagation();
});
//purpose, the menu is open but someone clicks somewhere else it can close it. 
document.addEventListener("click",() => {
    closeShapePicker();
})
// purpose function of the undo button, saves the past picture so I can bring it back if needed.
    function recordHistory():void {
        const snapshot =canvas.toDataURL("image/png");
        drawHistory.push(snapshot);
        if(drawHistory.length >maxHistory){
            drawHistory.shift();
        }

    }
    //similar to undo but brings drawing back even if the page is refreshed, by searching a copy of undo.
    function findPreviousDrawing(index:number, current:string): number{
        if (index <0){
            return -1;
        }
        if (drawHistory[index] !== current){
            return index;
        }
        return findPreviousDrawing(index -1,current);
        //the autosave function, so the last two items work. 
    } 
    async function autoSaveDrawing(): Promise<void> {
    try {
        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(new Error("Could not create image"));
                }
            }, "image/png");
        });
        // show the image that was created by the autosave that was stored. 
        const image = await new Promise<string>((resolve,reject)=>{
            const reader = new FileReader();

            reader.onload =() => resolve(reader.result as string);
            reader.onerror =() => reject(new Error ("could not get image"));
            reader.readAsDataURL(blob);
        });
        localStorage.setItem(storageKey,image);
        console.log("Auto-Saved");
        }
        catch(error){
            console.error("AutoSave Fail", error);
        }
    }
    //purpose of this funtion is the autosaves scheduled save and it's every 500miliseconds 
        function scheduleAutoSave(): void{
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(()=>{
                void autoSaveDrawing();
            }, 500);
        }
    //purpose load the saved picture that was saved. 

        async function restoreDrawing(imageData:string):Promise<void> {
            const image =new Image();
            image.src=imageData;
            await image.decode();
            ctx!.save();
            ctx!.globalCompositeOperation ="source-over";
            ctx!.clearRect(0,0, canvas.width, canvas.height);
            ctx!.drawImage(image,0,0,canvas.width,canvas.height);
            ctx!.restore();

        }
        //purpose undo the last part that was done or added to the picture.
        //basically lets your drawing take a step back.

        async function undoDrawing(): Promise<void>{
            if(drawHistory.length <2) return;
            const current =drawHistory.pop()!;
            const previousIndex= findPreviousDrawing(
                drawHistory.length -1, current
            );
            if (previousIndex <0){
                drawHistory.push(current);
                return;
            }
            drawHistory.length =previousIndex +1;
            await restoreDrawing(drawHistory[previousIndex]!);
            scheduleAutoSave();
            
        }
    //the purpose for the list of the shapes, so the user can select them.
type shapeKind = |"rectangle" 
| "circle" 
| "line" 
| "triangle" 
| "oval"
| "arrow"
| "star"
| "heart"
| "hexagon";
//purpose the shape tools buttons are selected, and remembered.
//also remembers how the tool is used and when it's stopped. 
class ShapeTool {
    private currentShape: shapeKind | null = null;
    private startX: number = 0;
    private startY: number = 0;
    private dragging: boolean = false;
    private snapshot: ImageData | null = null;
    //connects to the correct shape from the html 
    
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
            { id: "ovalButton", tool: "oval" },
            { id: "arrowButton", tool: "arrow" },
            { id: "starButton", tool: "star" },
            { id: "heartButton", tool: "heart" },
            { id: "hexagonButton", tool: "hexagon" },
        ];
        //purpose when one of the buttons is clicked, it connects to a shape that will be used.
        //each is available seperately and called seperately.
        

        buttons.forEach((item) => {
            const button = document.getElementById(item.id);
            button?.addEventListener("click", () => {
                this.selectTool(item.tool);
                closeShapePicker();
            });
        });
        //remembers whether the pointer of the mouse was dragged, moved, or let go. 
        //to get the drawing or stop the drawing you wanted.

        this.canvas.addEventListener("pointerdown", (event) => this.start(event));
        this.canvas.addEventListener("pointermove", (event) => this.move(event));
        this.canvas.addEventListener("pointerup", (event) => this.finish(event));
        this.canvas.addEventListener("pointercancel", (event) => this.cancel());
    }
    //purpose to tell whether there is a shape being used or a brush.
    public isActive(): boolean {
        return this.currentShape !== null;
    }
    //purpose is to turn of a brush and eraser if a shape is used, to 
    //select shape, and change the button appearance when its selected. 
    public selectTool(shape: shapeKind | null): void {
        this.currentShape = shape;
        isDrawing = false;
        isErasing = false;
        eraserButton.classList.remove("active");
        const buttons =[
            'brush',
            'rectangle',
            'circle',
            'line',
            'triangle',
            "oval",
            "arrow",
            "star",
            "heart",
            "hexagon"];

        buttons.forEach((name)=>{
            const button= document.getElementById(name +'Button');
            button?.classList.toggle("selected", name===(shape ?? 'brush'));

        });
        const selectedShapeName = shape === null ?"Brush" : shape.charAt(0).toUpperCase() + shape.slice(1);
        shapePickerButton.textContent = `Shapes: ${selectedShapeName} ▾`;
    }
    //starts the pointer or size of the shape when a click is made, and stops when its let go.
    private start(event: PointerEvent): void {
        if(!this.currentShape || event.button !== 0) return;
        const position = getCanvasPosition(event);
        this.startX = position.x;
        this.startY = position.y;
        this.dragging = true;
        this.snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = "source-over";
    }

    // give a temporary shape preview while the mouse is clicked down and dragged. 
    private move(event:PointerEvent): void{
        if(!this.dragging || !this.snapshot) return;
        if((event.buttons & 1) === 0){
            this.cancel();
            return;
        }
        this.ctx.putImageData(this.snapshot,0,0);
        this.drawShape(event);
    }
    //purpose make the shape perminantly its size when the mouse is let go. 
    private finish(event:PointerEvent):void {
        if(!this.dragging || !this.snapshot)return;
        this.ctx.putImageData(this.snapshot,0,0);
        this.drawShape(event);
        this.dragging=false;
        this.snapshot = null;
    }
    //purpose snapshot made so in case the user wants the shape to what it was prior.
    private cancel():void {
        if (this.snapshot){
            this.ctx.putImageData(this.snapshot,0,0);
        }
        this.dragging =false;
        this.snapshot =null;
    }
    //purpose the shapes math and position on the canvas is calculated, so that the shape stays
    //the shape at various sizes and on the canvas. 
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
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.beginPath();
        //purpose to decide the shapes instrucions that will be used. 
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
                break;
             case "oval":
        this.ctx.ellipse(
            this.startX + width / 2,
            this.startY + height / 2,
            Math.abs(width / 2),
            Math.abs(height / 2),
            0,
            0,
            Math.PI * 2
        );
        break;

    case "arrow":
        const angle = Math.atan2(y - this.startY, x - this.startX);
        const headLength = 18;

        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(x, y);

        this.ctx.moveTo(x, y);
        this.ctx.lineTo(
            x - headLength * Math.cos(angle - Math.PI / 6),
            y - headLength * Math.sin(angle - Math.PI / 6)
        );

        this.ctx.moveTo(x, y);
        this.ctx.lineTo(
            x - headLength * Math.cos(angle + Math.PI / 6),
            y - headLength * Math.sin(angle + Math.PI / 6)
        );
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
            } else {
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
        this.ctx.bezierCurveTo(
            heartLeft + heartWidth,
            heartTop + heartHeight * 0.75,
            heartLeft + heartWidth,
            heartTop + heartHeight * 0.25,
            heartLeft + heartWidth / 2,
            heartTop + heartHeight * 0.35
        );
        this.ctx.bezierCurveTo(
            heartLeft,
            heartTop + heartHeight * 0.25,
            heartLeft,
            heartTop + heartHeight * 0.75,
            heartLeft + heartWidth / 2,
            heartTop + heartHeight
        );
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
            } else {
                this.ctx.lineTo(pointX, pointY);
            }
        }
        this.ctx.closePath();
        break;
}          //purpose to fill the shape with selected color only when fill option is selected.
         //two exeptions arrows and lines.
        const fillShape = document.getElementById('fillShape')as HTMLInputElement;

        if (fillShape.checked && this.currentShape !== "line" && this.currentShape !== "arrow"){
            this.ctx.fill();
        }
         else {
            this.ctx.stroke();
        }
        this.ctx.restore();
    }
   
}
//purpose make a tool shape but the auto selected is a brush from the list.
const shapeTool = new ShapeTool(canvas, ctx);
shapeTool.selectTool(null);

//purpose to call the eraser button info from the html file
const eraserButton = document.getElementById("eraserButton") as HTMLButtonElement;
// purpose when the eraser button on and off.it also turns off the shape tool. 
eraserButton.addEventListener("click", () => {
    const nextState = !isErasing;
    shapeTool.selectTool(null);

    isErasing = nextState;
    eraserButton.classList.toggle("active", isErasing);
});
//purpose is to call the clear button from the html file to the ts. 
const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
//turns on and off the clear button, clears everything from canvas and but saves it also 
//as a history item. 
clearButton.addEventListener("click", () => {
    clearTimeout(autoSaveTimer);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    recordHistory();
   });

//purpose to call the undo from html file to the ts.
const undoButton =document.getElementById("undo") as HTMLAnchorElement;
//turn on and off the undo button
    undoButton.addEventListener("click", () =>{
        void undoDrawing(); });
    

//call the save button from the html to the ts. 
const saveButton = document.getElementById("saveButton") as HTMLButtonElement;
//turns the current imag into a png image, and download it when the save button is clicked. 
saveButton.addEventListener("click", () => {
    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = image;
    link.download = "drawing.png";
    link.click();
});
// call the color picker input into the ts.
const colorPicker = document.getElementById("colorPicker") as HTMLInputElement;
//connect the html to the color and shapes that are selected. 
//allow user to pick there color for drawing. 
colorPicker.addEventListener("input", () => {
    ctx.strokeStyle = colorPicker.value;
});
//call the brushSize input into the ts.
const brushSize = document.getElementById("brushSize") as HTMLInputElement;
const brushSizeValue = document.getElementById("brushSizeValue") as HTMLSpanElement;
// selects the brush sizes thickness, and displays it. 
brushSize.addEventListener("input", () => {
    ctx.lineWidth = Number(brushSize.value);
    brushSizeValue.textContent = brushSize.value;
});

//purpose is for when the user uses brush they can draw while pressing the button down.
//as well as the eraser when selected. 
canvas.addEventListener("pointerdown", (event) => {
    if (shapeTool.isActive()) return;
    isDrawing = true;
    if(event.button !== 0)return;
    canvas.setPointerCapture(event.pointerId);
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
//when the pointer is up the brush/drag/eraser stop and a history is added.
//a scheduled auto save is also done. 
canvas.addEventListener("pointerup", () => {
    isDrawing = false;
    recordHistory();
    scheduleAutoSave();
});
//drawing stops if an issue arises 
canvas.addEventListener("pointercancel", () => {
    isDrawing = false;
});
//prepares the canvas when it first starts with clear and saves the blank canvas in history.
function initializeDrawing():void{
    ctx?.clearRect(0,0,canvas.width,canvas.height);
    recordHistory();
}
initializeDrawing();
//calls the previous button from html to the ts.
const previousButton=document.getElementById("previous") as HTMLButtonElement;
//when previous is selected it brings up what is saved in the history last. 
//prepares if nothing is found and error messages, and if one is found to the console.
previousButton.addEventListener("click",async ()=>{
    const savedImage=localStorage.getItem(storageKey);
    if(!savedImage){
        alert("No previous drawing found.");
        return;
    }
    try{
        recordHistory();
        await restoreDrawing(savedImage);
        recordHistory();
            console.log("Previous picture restored.")
    }catch(error){
        console.error("Couldn't restore picture.",error);
        alert("Problem getting previous drawing.")
    }
});
// calls the html to the ts. allows user to upload an image, makes a trace guide, or deletes it.
const traceUpload = document.getElementById("traceUpload") as HTMLInputElement;
const traceGuide = document.getElementById("traceGuide") as HTMLImageElement;
const removeTrace = document.getElementById("removeTrace") as HTMLButtonElement;
//stores a temp url for the trace img
let traceURL:string | null =null;
//check for the file,display it, and remove it when the user selects the buttons
traceUpload.addEventListener("change",()=> {
    const file =traceUpload.files?.[0];
    if (!file) return;
    if(!file.type.startsWith("image/")){
        alert("No image file selected.");
        return;
    }
    if(traceURL !== null){
        URL.revokeObjectURL(traceURL);
    }
    traceURL=URL.createObjectURL(file);
    traceGuide.src =traceURL;
    traceGuide.hidden=false;
    removeTrace.addEventListener("click", ()=>{
        traceGuide.hidden =true;
        traceGuide.removeAttribute("src");
        traceUpload.value="";

        if(traceURL !== null){
            URL.revokeObjectURL(traceURL);
            traceURL = null
        }
    })

})


//file path storage for the program to know what we have. 
const songs:string[]=[
    "./music/song1.mp3",
    "./music/song2.mp3",
    "./music/song3.mp3",

];
//keep track of which song is currently selected. 
let currentSong: number =0;
//creates an audio player and a start volume
const audio = new Audio(songs[currentSong])
audio.volume=0.4;
//this whole const section calls the html to the ts.,music,  volume slider,songname
const playMusic = document.getElementById("playMusic") as HTMLButtonElement;
const previousSong = document.getElementById("previousSong") as HTMLButtonElement;
const nextSong = document.getElementById("nextSong") as HTMLButtonElement;
const songName = document.getElementById("songName") as HTMLParagraphElement;
const musicVolume = document.getElementById("musicVolume") as HTMLInputElement;
//puprose is to play or pause music when the button is selected. 
playMusic.addEventListener("click",async() =>{
    if(audio.paused){
        try { 
            await audio.play();
            playMusic.textContent ="⏸"
        }
        catch(error){
            console.error("Music didn't play",error);
        }
     }    else{
            audio.pause();
            playMusic.textContent= "▶";
        }
   
});
// allow user to change song forward or back in either direction. 
//also set up error catching in case it doesn't play. 
function changeSong(direction:number):void{
    const wasPlaying =!audio.paused;
    currentSong=(currentSong + direction +songs.length)% songs.length;
    audio.src = songs[currentSong]!;
    songName.textContent = `Song ${currentSong +1}`;
    if (wasPlaying){
        void audio.play().catch((error)=>{
           console.error("Music didn't play:",error)
         playMusic.textContent = "▶";});
    }else{
        playMusic.textContent="▶";
    }
}
//when the next button is clicked the user can move forward to the next song. 
nextSong.addEventListener('click',()=>{
changeSong(1)});
// when the previous button is clicked the user can move back to a previous song. 
previousSong.addEventListener('click',()=>{
changeSong(-1)});
//when the song ends the song auto goes to the next song on the list.
audio.addEventListener('ended',()=>{
changeSong(1)});
//for the user to be able to adjust the volume
musicVolume.addEventListener('input',()=>{
audio.volume = Number(musicVolume.value)/100;});