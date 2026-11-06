function countDown(number:number):void {
    console.log(number);

    if (number >1){
        countDown(number -1);
    }
}
countDown(5);
async function loadSettings():Promise<string>{
    const message = await Promise.resolve("drawing  settings loaded!")
    return message;
}
function validateBrushSize(size:number):number{
    if(size < 1 || size >50){
        throw new Error ("Brush size must be between 1 and 50.")
}
return size;
}