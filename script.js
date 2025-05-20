// --- PerspectiveTransform.js by Paul Debruijn (MIT License) ---
// Source: https://github.com/PaulDebruijn/PerspectiveTransformJs
// Slightly adapted for inclusion.
class PerspectiveTransform {
    constructor(p1x,p1y,p2x,p2y,p3x,p3y,p4x,p4y, p1X,p1Y,p2X,p2Y,p3X,p3Y,p4X,p4Y) {
        this.p1x = p1x; this.p1y = p1y; this.p2x = p2x; this.p2y = p2y;
        this.p3x = p3x; this.p3y = p3y; this.p4x = p4x; this.p4y = p4y;
        this.p1X = p1X; this.p1Y = p1Y; this.p2X = p2X; this.p2Y = p2Y;
        this.p3X = p3X; this.p3Y = p3Y; this.p4X = p4X; this.p4Y = p4Y;

        const S = this.solve([
            [p1x,p1y,1,0,0,0,-p1X*p1x,-p1X*p1y],
            [p2x,p2y,1,0,0,0,-p2X*p2x,-p2X*p2y],
            [p3x,p3y,1,0,0,0,-p3X*p3x,-p3X*p3y],
            [p4x,p4y,1,0,0,0,-p4X*p4x,-p4X*p4y],
            [0,0,0,p1x,p1y,1,-p1Y*p1x,-p1Y*p1y],
            [0,0,0,p2x,p2y,1,-p2Y*p2x,-p2Y*p2y],
            [0,0,0,p3x,p3y,1,-p3Y*p3x,-p3Y*p3y],
            [0,0,0,p4x,p4y,1,-p4Y*p4x,-p4Y*p4y]
        ], [p1X,p2X,p3X,p4X,p1Y,p2Y,p3Y,p4Y]);

        this.a = S[0]; this.b = S[1]; this.c = S[2];
        this.d = S[3]; this.e = S[4]; this.f = S[5];
        this.g = S[6]; this.h = S[7];
    }

    transform(x,y) {
        const D = this.g*x + this.h*y + 1;
        return [(this.a*x + this.b*y + this.c)/D, (this.d*x + this.e*y + this.f)/D];
    }
    
    solve(A, b) {
        const n = A.length;
        for (let i = 0; i < n; i++) {
            let maxEl = Math.abs(A[i][i]);
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(A[k][i]) > maxEl) {
                    maxEl = Math.abs(A[k][i]);
                    maxRow = k;
                }
            }
            for (let k = i; k < n; k++) {
                let tmp = A[maxRow][k];
                A[maxRow][k] = A[i][k];
                A[i][k] = tmp;
            }
            let tmp = b[maxRow];
            b[maxRow] = b[i];
            b[i] = tmp;

            for (let k = i + 1; k < n; k++) {
                let c = -A[k][i] / A[i][i];
                for (let j = i; j < n; j++) {
                    if (i === j) A[k][j] = 0;
                    else A[k][j] += c * A[i][j];
                }
                b[k] += c * b[i];
            }
        }
        const x = new Array(n);
        for (let i = n - 1; i > -1; i--) {
            x[i] = b[i] / A[i][i];
            for (let k = i - 1; k > -1; k--) {
                b[k] -= A[k][i] * x[i];
            }
        }
        return x;
    }
}
// --- End of PerspectiveTransform.js ---


// --- Color utility functions ---
function getModuleAverageColor(sourceCtx, sx, sy, sWidth, sHeight) {
    if (sWidth < 1 || sHeight < 1) return { r: 255, g: 255, b: 255 };
    const imageData = sourceCtx.getImageData(Math.floor(sx), Math.floor(sy), Math.ceil(sWidth), Math.ceil(sHeight));
    const data = imageData.data;
    let r = 0, g = 0, b = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
    }
    if (count === 0) return { r: 255, g: 255, b: 255 };
    return {
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count)
    };
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// --- Global Threshold Variables & DOM Elements ---
let L_WHITE_THRESHOLD_VAR = 90;
let S_GRAY_THRESHOLD_VAR = 40;
let L_BLACK_THRESHOLD_VAR = 20;
const BINARY_BRIGHTNESS_THRESHOLD = 128;

let whiteLThresholdSlider, whiteLThresholdValueSpan;
let graySThresholdSlider, graySThresholdValueSpan;
let blackLThresholdSlider, blackLThresholdValueSpan;
let autoAdjustThresholdsButton;

let currentAnimatedModules = [];
let moduleCountGlobal = 0;
let canvasModuleSize = 0;
let animationFrameId = null;
let isDecomposed = false;
let correctedQrImageCanvas = null;
let currentQrVersion = null;
let useOriginalColorsCheckboxElement = null;
let sortMethodRadios = null;
let qrCanvas, ctx; // Define qrCanvas and ctx globally for clearCanvasAndData

window.addEventListener('load', () => {
    const imageInput = document.getElementById('qrImageInput');
    qrCanvas = document.getElementById('qrCanvas'); // Assign to global qrCanvas
    ctx = qrCanvas.getContext('2d'); // Assign to global ctx
    const decomposeButton = document.getElementById('decomposeButton');
    const qrDataOutput = document.getElementById('qrDataOutput');
    const ratioOutput = document.getElementById('ratioOutput');
    const statusMessage = document.getElementById('statusMessage');
    
    useOriginalColorsCheckboxElement = document.getElementById('useOriginalColorsCheckbox');
    sortMethodRadios = document.getElementsByName('sortMethod');

    whiteLThresholdSlider = document.getElementById('whiteLThresholdSlider');
    whiteLThresholdValueSpan = document.getElementById('whiteLThresholdValue');
    graySThresholdSlider = document.getElementById('graySThresholdSlider');
    graySThresholdValueSpan = document.getElementById('graySThresholdValue');
    blackLThresholdSlider = document.getElementById('blackLThresholdSlider');
    blackLThresholdValueSpan = document.getElementById('blackLThresholdValue');
    autoAdjustThresholdsButton = document.getElementById('autoAdjustThresholdsButton');

    L_WHITE_THRESHOLD_VAR = parseInt(whiteLThresholdSlider.value);
    whiteLThresholdValueSpan.textContent = L_WHITE_THRESHOLD_VAR;
    S_GRAY_THRESHOLD_VAR = parseInt(graySThresholdSlider.value);
    graySThresholdValueSpan.textContent = S_GRAY_THRESHOLD_VAR;
    L_BLACK_THRESHOLD_VAR = parseInt(blackLThresholdSlider.value);
    blackLThresholdValueSpan.textContent = L_BLACK_THRESHOLD_VAR;
    
    const canvasSize = document.getElementById('qrCanvasContainer').clientWidth;
    qrCanvas.width = canvasSize; qrCanvas.height = canvasSize;
    ctx.imageSmoothingEnabled = false;

    imageInput.addEventListener('change', handleImage);
    decomposeButton.addEventListener('click', () => {
        if (currentAnimatedModules.length > 0) {
            isDecomposed = !isDecomposed;
            decomposeButton.textContent = isDecomposed ? "元に戻す" : "分解";
            sortAndAnimateModules(isDecomposed);
        }
    });
    useOriginalColorsCheckboxElement.addEventListener('change', () => {
        if (currentAnimatedModules.length > 0) drawCurrentModules();
    });
    sortMethodRadios.forEach(radio => radio.addEventListener('change', () => {
        if (currentAnimatedModules.length > 0) {
            if(isDecomposed) sortAndAnimateModules(true);
            else drawCurrentModules();
        }
    }));

    whiteLThresholdSlider.addEventListener('input', (e) => {
        L_WHITE_THRESHOLD_VAR = parseInt(e.target.value);
        whiteLThresholdValueSpan.textContent = L_WHITE_THRESHOLD_VAR;
        if (correctedQrImageCanvas) reAnalyzeAndRedraw();
    });
    graySThresholdSlider.addEventListener('input', (e) => {
        S_GRAY_THRESHOLD_VAR = parseInt(e.target.value);
        graySThresholdValueSpan.textContent = S_GRAY_THRESHOLD_VAR;
        if (correctedQrImageCanvas) reAnalyzeAndRedraw();
    });
    blackLThresholdSlider.addEventListener('input', (e) => {
        L_BLACK_THRESHOLD_VAR = parseInt(e.target.value);
        blackLThresholdValueSpan.textContent = L_BLACK_THRESHOLD_VAR;
        if (correctedQrImageCanvas) reAnalyzeAndRedraw();
    });
    autoAdjustThresholdsButton.addEventListener('click', autoAdjustThresholds);


    async function handleImage(event) {
        const file = event.target.files[0];
        if (!file) { statusMessage.textContent = 'ファイルが選択されていません。'; return; }
        decomposeButton.disabled = true;
        statusMessage.textContent = '画像を処理中...';
        clearCanvasAndData();

        let codeObject = null;

        try {
            const img = await loadImageAsync(file);
            const sourceCanvas = document.createElement('canvas');
            sourceCanvas.width = img.width; sourceCanvas.height = img.height;
            const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true }); 
            sourceCtx.drawImage(img, 0, 0);
            const sourceImageData = sourceCtx.getImageData(0, 0, img.width, img.height);
            
            codeObject = jsQR(sourceImageData.data, sourceImageData.width, sourceImageData.height, { inversionAttempts: "dontInvert" });

            if (codeObject && codeObject.version && codeObject.location && validateLocation(codeObject.location)) {
                currentQrVersion = codeObject.version;
                statusMessage.textContent = 'QRコード検出、歪み補正中...';
                qrDataOutput.textContent = codeObject.data;
                
                const warpedCanvasSize = 256;
                const warpedCanvas = document.createElement('canvas');
                warpedCanvas.width = warpedCanvasSize; warpedCanvas.height = warpedCanvasSize;
                const warpedCtx = warpedCanvas.getContext('2d', { willReadFrequently: true }); 
                warpedCtx.imageSmoothingEnabled = false;
                performPerspectiveWarp(sourceImageData, warpedCanvas, codeObject.location);
                
                correctedQrImageCanvas = document.createElement('canvas');
                correctedQrImageCanvas.width = warpedCanvas.width; correctedQrImageCanvas.height = warpedCanvas.height;
                const correctedCtx = correctedQrImageCanvas.getContext('2d', { willReadFrequently: true }); 
                correctedCtx.imageSmoothingEnabled = false;
                correctedCtx.drawImage(warpedCanvas, 0, 0);

                moduleCountGlobal = (currentQrVersion * 4) + 17;
                
                reAnalyzeAndRedraw(false);

                decomposeButton.style.display = 'inline-block';
                decomposeButton.disabled = false;
                isDecomposed = false;
                decomposeButton.textContent = "分解";
                statusMessage.textContent = 'QRコードを歪み補正し、モジュール解析しました。';

            } else {
                currentQrVersion = null;
                let errorMsg = 'QRコードが見つからないか、必要な情報(バージョン/位置情報)が取得できませんでした。';
                if (codeObject && codeObject.location && !validateLocation(codeObject.location)) { errorMsg = 'QRコードの位置情報が不正です。';}
                statusMessage.textContent = errorMsg;
                qrDataOutput.textContent = '-'; ratioOutput.textContent = '-';
                decomposeButton.style.display = 'none';
            }
        } catch (error) {
            currentQrVersion = null;
            console.error("画像処理エラー:", error);
            statusMessage.textContent = `エラーが発生しました: ${error.message}`;
            qrDataOutput.textContent = '-'; ratioOutput.textContent = '-';
            decomposeButton.style.display = 'none';
        }
    }

    function reAnalyzeAndRedraw(animateSort = true) {
        if (!correctedQrImageCanvas || moduleCountGlobal === 0) return;

        const binaryAnalysis = analyzeQrModulesBinary(correctedQrImageCanvas, moduleCountGlobal);
        const colorAnalysis = analyzeQrModulesWithColor(correctedQrImageCanvas, moduleCountGlobal);
        
        canvasModuleSize = qrCanvas.width / moduleCountGlobal;
        const sourceModuleActualWidth = correctedQrImageCanvas.width / moduleCountGlobal;
        const sourceModuleActualHeight = correctedQrImageCanvas.height / moduleCountGlobal;

        const newModules = [];
        let binaryBlackCount = 0;
        for (let i = 0; i < moduleCountGlobal * moduleCountGlobal; i++) {
            const binaryMod = binaryAnalysis.modules[i];
            const colorMod = colorAnalysis.modules.find(m => m.id === binaryMod.id);
            if (binaryMod.isBinaryBlack) binaryBlackCount++;

            const existingModule = currentAnimatedModules.find(m => m.id === binaryMod.id);

            newModules.push({
                id: binaryMod.id,
                originalGridX: binaryMod.originalGridX,
                originalGridY: binaryMod.originalGridY,
                isBinaryBlack: binaryMod.isBinaryBlack,
                averageRgb: colorMod.averageRgb,
                hexColor: colorMod.hexColor,
                hslColor: colorMod.hslColor,
                classification: colorMod.classification,
                currentX: existingModule ? existingModule.currentX : binaryMod.originalGridX * canvasModuleSize,
                currentY: existingModule ? existingModule.currentY : binaryMod.originalGridY * canvasModuleSize,
                targetX: existingModule ? existingModule.targetX : binaryMod.originalGridX * canvasModuleSize,
                targetY: existingModule ? existingModule.targetY : binaryMod.originalGridY * canvasModuleSize,
                sourceRect: {
                    x: binaryMod.originalGridX * sourceModuleActualWidth,
                    y: binaryMod.originalGridY * sourceModuleActualHeight,
                    width: sourceModuleActualWidth,
                    height: sourceModuleActualHeight
                }
            });
        }
        currentAnimatedModules = newModules;
        
        const versionText = currentQrVersion !== null ? `Ver: ${currentQrVersion}` : 'Ver: N/A';
        ratioOutput.textContent = `白(分類): ${colorAnalysis.counts.white}, 黒(分類): ${colorAnalysis.counts.black}, 色: ${colorAnalysis.counts.color} (${versionText})`;
        console.log(`Re-analyzed. Binary: Black=${binaryBlackCount}, White=${moduleCountGlobal*moduleCountGlobal - binaryBlackCount}`);

        if (isDecomposed && animateSort) {
            sortAndAnimateModules(true);
        } else {
            drawCurrentModules();
        }
    }

    function autoAdjustThresholds() {
        if (!correctedQrImageCanvas || currentAnimatedModules.length === 0) {
            statusMessage.textContent = "まず画像を読み込んでください。";
            return;
        }

        statusMessage.textContent = "閾値を自動調整中...";
        const allHslValues = currentAnimatedModules.map(m => m.hslColor);
        
        const sumS = allHslValues.reduce((acc, hsl) => acc + hsl.s, 0);
        const avgS = allHslValues.length > 0 ? Math.round(sumS / allHslValues.length) : 40; // Handle empty array
        S_GRAY_THRESHOLD_VAR = Math.min(100, Math.max(0, avgS));
        graySThresholdSlider.value = S_GRAY_THRESHOLD_VAR;
        graySThresholdValueSpan.textContent = S_GRAY_THRESHOLD_VAR;

        const sortedL = allHslValues.map(hsl => hsl.l).sort((a, b) => b - a);
        const percentileIndex = Math.floor(sortedL.length * 0.1);
        const lAt90Percentile = sortedL.length > 0 ? sortedL[percentileIndex] : 90;
        L_WHITE_THRESHOLD_VAR = Math.min(100, Math.max(0, lAt90Percentile));
        whiteLThresholdSlider.value = L_WHITE_THRESHOLD_VAR;
        whiteLThresholdValueSpan.textContent = L_WHITE_THRESHOLD_VAR;
        
        L_BLACK_THRESHOLD_VAR = Math.min(100, Math.max(0, Math.round(L_WHITE_THRESHOLD_VAR / 4.5)));
        if (L_BLACK_THRESHOLD_VAR >= L_WHITE_THRESHOLD_VAR && L_WHITE_THRESHOLD_VAR > 0) {
             L_BLACK_THRESHOLD_VAR = Math.max(0, L_WHITE_THRESHOLD_VAR - 10);
        } else if (L_WHITE_THRESHOLD_VAR === 0 && L_BLACK_THRESHOLD_VAR === 0) {
             L_BLACK_THRESHOLD_VAR = 5;
        }

        blackLThresholdSlider.value = L_BLACK_THRESHOLD_VAR;
        blackLThresholdValueSpan.textContent = L_BLACK_THRESHOLD_VAR;

        console.log(`Auto-adjusted thresholds: White L >= ${L_WHITE_THRESHOLD_VAR}, Gray S <= ${S_GRAY_THRESHOLD_VAR}, Black L <= ${L_BLACK_THRESHOLD_VAR}`);
        reAnalyzeAndRedraw();
        statusMessage.textContent = "閾値を自動調整しました。";
    }
    
    function analyzeQrModulesBinary(sourceCanvas, moduleCount) {
        const sourceCtx = sourceCanvas.getContext('2d');
        const modules = [];
        let blackModulesCount = 0;

        const modulePixelWidth = sourceCanvas.width / moduleCount;
        const modulePixelHeight = sourceCanvas.height / moduleCount;

        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                const sx = (col + 0.5) * modulePixelWidth; 
                const sy = (row + 0.5) * modulePixelHeight;
                
                const sx_floor = Math.floor(sx);
                const sy_floor = Math.floor(sy);

                if (sx_floor < 0 || sx_floor >= sourceCanvas.width || sy_floor < 0 || sy_floor >= sourceCanvas.height) {
                    modules.push({
                        id: row * moduleCount + col,
                        originalGridX: col,
                        originalGridY: row,
                        isBinaryBlack: false 
                    });
                    continue;
                }
                
                const pixelData = sourceCtx.getImageData(sx_floor, sy_floor, 1, 1).data;
                const r = pixelData[0];
                const g = pixelData[1];
                const b = pixelData[2];
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
                const isBlack = brightness < BINARY_BRIGHTNESS_THRESHOLD;

                if (isBlack) blackModulesCount++;
                
                modules.push({
                    id: row * moduleCount + col,
                    originalGridX: col,
                    originalGridY: row,
                    isBinaryBlack: isBlack 
                });
            }
        }
        return { modules, blackModulesCount };
    }

    function analyzeQrModulesWithColor(sourceCanvas, moduleCount) {
        const sourceCtx = sourceCanvas.getContext('2d');
        const modules = [];
        const counts = { white: 0, black: 0, color: 0 };

        const modulePixelWidth = sourceCanvas.width / moduleCount;
        const modulePixelHeight = sourceCanvas.height / moduleCount;

        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                const sx = col * modulePixelWidth;
                const sy = row * modulePixelHeight;
                
                const avgRgb = getModuleAverageColor(sourceCtx, sx, sy, modulePixelWidth, modulePixelHeight);
                const hex = rgbToHex(avgRgb.r, avgRgb.g, avgRgb.b);
                const hsl = rgbToHsl(avgRgb.r, avgRgb.g, avgRgb.b);
                
                let classification = 'color';
                if (hsl.l >= L_WHITE_THRESHOLD_VAR && hsl.s <= S_GRAY_THRESHOLD_VAR) {
                    classification = 'white';
                } else if (hsl.l <= L_BLACK_THRESHOLD_VAR && hsl.s <= S_GRAY_THRESHOLD_VAR) { 
                    classification = 'black';
                } else if (L_BLACK_THRESHOLD_VAR > 0 && hsl.l <= L_BLACK_THRESHOLD_VAR * 1.2 && hsl.s <= S_GRAY_THRESHOLD_VAR * 1.5) {
                     classification = 'black';
                }

                counts[classification]++;
                
                modules.push({
                    id: row * moduleCount + col,
                    originalGridX: col,
                    originalGridY: row,
                    averageRgb: avgRgb,
                    hexColor: hex,
                    hslColor: hsl,
                    classification: classification
                });
            }
        }
        return { modules, counts };
    }

    function drawCurrentModules() {
        ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
        if (currentAnimatedModules.length === 0) return;

        const useOriginal = useOriginalColorsCheckboxElement.checked;
        const selectedSortMethod = document.querySelector('input[name="sortMethod"]:checked').value;
        ctx.imageSmoothingEnabled = !useOriginal;

        for (const module of currentAnimatedModules) {
            if (useOriginal && correctedQrImageCanvas && module.sourceRect) {
                ctx.drawImage(
                    correctedQrImageCanvas,
                    module.sourceRect.x, module.sourceRect.y,
                    module.sourceRect.width, module.sourceRect.height,
                    Math.round(module.currentX), Math.round(module.currentY),
                    Math.ceil(canvasModuleSize), Math.ceil(canvasModuleSize)
                );
            } else {
                if (selectedSortMethod === 'binaryOld') {
                    ctx.fillStyle = module.isBinaryBlack ? '#000000' : '#FFFFFF';
                } else { 
                    switch (module.classification) {
                        case 'white': ctx.fillStyle = '#FFFFFF'; break;
                        case 'black': ctx.fillStyle = '#000000'; break;
                        default:      ctx.fillStyle = module.hexColor; break;
                    }
                }
                ctx.fillRect(
                    Math.round(module.currentX), Math.round(module.currentY),
                    Math.ceil(canvasModuleSize), Math.ceil(canvasModuleSize)
                );
            }
        }
    }
    
    const classificationOrder = { 'white': 0, 'black': 1, 'color': 2 };

    function sortAndAnimateModules(decompose) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        decomposeButton.disabled = true;

        let currentTargetIndex = 0;
        const modulesToPlace = [...currentAnimatedModules];
        const selectedSortMethod = document.querySelector('input[name="sortMethod"]:checked').value;

        if (decompose) {
            modulesToPlace.sort((a, b) => {
                if (selectedSortMethod === 'binaryOld') {
                    const binaryDiff = (a.isBinaryBlack ? 1 : 0) - (b.isBinaryBlack ? 1 : 0); 
                    if (binaryDiff !== 0) return binaryDiff;
                    return a.id - b.id;
                } else {
                    const classDiff = classificationOrder[a.classification] - classificationOrder[b.classification];
                    if (classDiff !== 0) return classDiff;

                    if (a.classification === 'color' && selectedSortMethod === 'hue') {
                        const hueDiff = a.hslColor.h - b.hslColor.h;
                        if (hueDiff !== 0) return hueDiff;
                        const satDiff = a.hslColor.s - b.hslColor.s;
                        if (satDiff !== 0) return satDiff;
                        return a.hslColor.l - b.hslColor.l;
                    }
                    return a.id - b.id;
                }
            });
        } else { 
             modulesToPlace.sort((a,b) => a.id - b.id);
        }
        
        modulesToPlace.forEach(sortedModule => {
            const moduleInCurrent = currentAnimatedModules.find(m => m.id === sortedModule.id);
            if(!moduleInCurrent) return;
            if (decompose) {
                 moduleInCurrent.targetX = (currentTargetIndex % moduleCountGlobal) * canvasModuleSize;
                 moduleInCurrent.targetY = Math.floor(currentTargetIndex / moduleCountGlobal) * canvasModuleSize;
            } else {
                 moduleInCurrent.targetX = moduleInCurrent.originalGridX * canvasModuleSize;
                 moduleInCurrent.targetY = moduleInCurrent.originalGridY * canvasModuleSize;
            }
            currentTargetIndex++;
        });
        animateModules();
    }
    
    function lerp(start, end, amount) { return (1 - amount) * start + amount * end; }

    function animateModules() {
        let allInPlace = true;
        for (const module of currentAnimatedModules) {
            module.currentX = lerp(module.currentX, module.targetX, 0.15);
            module.currentY = lerp(module.currentY, module.targetY, 0.15);
            if (Math.abs(module.currentX - module.targetX) > 0.5 || Math.abs(module.currentY - module.targetY) > 0.5) {
                allInPlace = false;
            }
        }
        drawCurrentModules();
        if (!allInPlace) {
            animationFrameId = requestAnimationFrame(animateModules);
        } else {
            for (const module of currentAnimatedModules) {
                module.currentX = module.targetX;
                module.currentY = module.targetY;
            }
            drawCurrentModules();
            animationFrameId = null;
            decomposeButton.disabled = false; 
        }
    }

    function clearCanvasAndData() {
        // ctx はグローバルで定義されている
        if (ctx && qrCanvas) { // 念のため存在チェック
            ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
        }
        currentAnimatedModules = [];
        correctedQrImageCanvas = null;
        moduleCountGlobal = 0;
        currentQrVersion = null;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    function loadImageAsync(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = (err) => reject(new Error("画像の読み込みに失敗しました。"));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error("ファイルリーダーでエラーが発生しました。"));
            reader.readAsDataURL(file);
        });
    }

    function validateLocation(location) {
        const points = ['topLeftCorner', 'topRightCorner', 'bottomRightCorner', 'bottomLeftCorner'];
        for (const pointName of points) {
            if (!location[pointName] || typeof location[pointName].x !== 'number' || typeof location[pointName].y !== 'number') {
                console.warn(`Invalid location point: ${pointName}`, location[pointName]);
                return false;
            }
        }
        return true;
    }

    function performPerspectiveWarp(sourceImageData, targetCanvas, qrLocation) {
        const targetCtx = targetCanvas.getContext('2d'); // ここでは willReadFrequently は targetCanvas が読み取り主体なら設定
        const targetWidth = targetCanvas.width;
        const targetHeight = targetCanvas.height;
        const targetPixelData = targetCtx.createImageData(targetWidth, targetHeight);

        const loc = qrLocation;
        const transformer = new PerspectiveTransform(
            0, 0, targetWidth, 0, 0, targetHeight, targetWidth, targetHeight,
            loc.topLeftCorner.x, loc.topLeftCorner.y,
            loc.topRightCorner.x, loc.topRightCorner.y,
            loc.bottomLeftCorner.x, loc.bottomLeftCorner.y,
            loc.bottomRightCorner.x, loc.bottomRightCorner.y
        );

        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                const [srcX, srcY] = transformer.transform(x + 0.5, y + 0.5);
                const sx_floor = Math.floor(srcX);
                const sy_floor = Math.floor(srcY);

                const targetPixelIndex = (y * targetWidth + x) * 4;
                if (sx_floor >= 0 && sx_floor < sourceImageData.width && sy_floor >= 0 && sy_floor < sourceImageData.height) {
                    const sourcePixelIndex = (sy_floor * sourceImageData.width + sx_floor) * 4;
                    targetPixelData.data[targetPixelIndex]     = sourceImageData.data[sourcePixelIndex];
                    targetPixelData.data[targetPixelIndex + 1] = sourceImageData.data[sourcePixelIndex + 1];
                    targetPixelData.data[targetPixelIndex + 2] = sourceImageData.data[sourcePixelIndex + 2];
                    targetPixelData.data[targetPixelIndex + 3] = sourceImageData.data[sourcePixelIndex + 3];
                } else {
                    targetPixelData.data[targetPixelIndex] = 255; 
                    targetPixelData.data[targetPixelIndex + 1] = 255;
                    targetPixelData.data[targetPixelIndex + 2] = 255;
                    targetPixelData.data[targetPixelIndex + 3] = 255; 
                }
            }
        }
        targetCtx.putImageData(targetPixelData, 0, 0);
    }

    statusMessage.textContent = '上のボタンからQRコードを含む画像ファイルを選択してください。';
});
