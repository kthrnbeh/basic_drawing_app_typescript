function countDown(number) {
    console.log(number);
    if (number > 1) {
        countDown(number - 1);
    }
}
countDown(5);
async function loadSettings() {
    const message = await Promise.resolve("drawing  settings loaded!");
    return message;
}
function validateBrushSize(size) {
    if (size < 1 || size > 50) {
        throw new Error("Brush size must be between 1 and 50.");
    }
    return size;
}
async function runPractice() {
    const settings = await loadSettings();
    console.log(settings);
    try {
        const size = validateBrushSize(60);
        console.log("valid brush size", size);
    }
    catch (error) {
        if (error instanceof Error) {
            console.log("error caught", error.message);
        }
    }
}
runPractice();
export {};
//# sourceMappingURL=practice.js.map