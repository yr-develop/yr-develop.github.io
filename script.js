// DOM要素の取得
const videoElement = document.getElementById('camera-stream');
const snapshotCanvas = document.getElementById('snapshot-canvas'); // QRコードスキャン用の一時的なCanvas
const snapshotContext = snapshotCanvas.getContext('2d');
const qrPreviewCanvas = document.getElementById('qr-preview-canvas');
const qrPreviewContext = qrPreviewCanvas.getContext('2d');
const qrDataDisplay = document.getElementById('qr-data-display');
const decomposeButton = document.getElementById('decompose-button');
const analysisCanvas = document.getElementById('analysis-canvas');
const analysisContext = analysisCanvas.getContext('2d');
const ratioDisplay = document.getElementById('ratio-display');

// カメラ設定
const constraints = {
    video: {
        facingMode: "environment", // 背面カメラを優先 (スマホの場合)
        width: { ideal: 640 },     // 希望する解像度
        height: { ideal: 480 }
    }
};

let localStream = null; // カメラストリームを保持する変数

// カメラアクセスと映像表示
async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = localStream;
        videoElement.onloadedmetadata = () => {
            console.log("カメラ映像の読み込み完了");
            // video要素の実際のサイズをsnapshotCanvasに合わせる
            snapshotCanvas.width = videoElement.videoWidth;
            snapshotCanvas.height = videoElement.videoHeight;
            console.log(`Snapshot Canvas サイズ: ${snapshotCanvas.width}x${snapshotCanvas.height}`);
            // QRコードスキャンを開始
            requestAnimationFrame(scanQRCode);
        };
    } catch (err) {
        console.error("カメラアクセスエラー:", err);
        qrDataDisplay.textContent = `カメラアクセスエラー: ${err.message}`;
        if (err.name === "NotAllowedError") {
            alert("カメラへのアクセスが許可されていません。設定を確認してください。");
        } else if (err.name === "NotFoundError") {
            alert("使用可能なカメラが見つかりませんでした。");
        } else {
            alert("カメラの起動に失敗しました。");
        }
    }
}

function scanQRCode() {
    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA && localStream && localStream.active) {
        snapshotContext.drawImage(videoElement, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
        const imageData = snapshotContext.getImageData(0, 0, snapshotCanvas.width, snapshotCanvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (code) {
            qrDataDisplay.textContent = `QRコードデータ: ${code.data}`;
            // console.log("QRコード検出:", code); // ログは必要に応じてコメントアウト/解除

            // 新しいQRコードが検出された場合のみプレビューを更新
            if (code.data !== lastDetectedQrCodeData) {
                lastDetectedQrCodeData = code.data;
                drawQRCodePreview(code); // ★★★ この行のコメントを解除して有効化 ★★★
            }

        } else {
            // QRコードが見つからない場合、プレビューをクリアするか、最後に検出したものを保持するか
            // 今回は保持する（クリアする場合は lastDetectedQrCodeData = null; なども行う）
        }
    }
    if (localStream && localStream.active) {
        requestAnimationFrame(scanQRCode);
    }
}

// ★★★ 新しく追加する関数 ★★★
// QRコードをプレビューCanvasに描画する関数
function drawQRCodePreview(code) {
    const matrix = code.matrix; // jsQR v1.4.0 からは code.matrix でQRのバイナリ行列を取得
    if (!matrix) {
        console.error("QRコードのmatrixデータが見つかりません。", code);
        // 旧バージョン(jsQR 1.3.x以前)の場合は、code.binaryData と code.matrixWidth を使う必要があった
        // 今回使用している v1.4.0 では code.matrix で直接取得できる
        // もし古いjsQRを使っている場合は、この部分の取得方法を修正する必要がある
        return;
    }

    const matrixWidth = matrix.width;
    const matrixHeight = matrix.height; // 通常、QRコードは正方形なので width と height は同じ

    // Canvasのクリア
    qrPreviewContext.clearRect(0, 0, qrPreviewCanvas.width, qrPreviewCanvas.height);

    // 各モジュール（QRコードの白黒の点）のサイズを計算
    // CanvasサイズをQRコードのモジュール数で割る
    const moduleSizeX = qrPreviewCanvas.width / matrixWidth;
    const moduleSizeY = qrPreviewCanvas.height / matrixHeight;
    const moduleSize = Math.min(moduleSizeX, moduleSizeY); // 小さい方に合わせる（アスペクト比維持）

    // QRコードをCanvasの中央に描画するためのオフセット
    const offsetX = (qrPreviewCanvas.width - moduleSize * matrixWidth) / 2;
    const offsetY = (qrPreviewCanvas.height - moduleSize * matrixHeight) / 2;

    // マトリックスデータを走査して描画
    for (let y = 0; y < matrixHeight; y++) {
        for (let x = 0; x < matrixWidth; x++) {
            const dataIndex = y * matrixWidth + x;
            if (matrix.data[dataIndex]) { // データが1なら黒モジュール
                qrPreviewContext.fillStyle = 'black';
            } else { // データが0なら白モジュール
                qrPreviewContext.fillStyle = 'white';
            }
            // fillRectでモジュールを描画
            // (x * moduleSize) と (y * moduleSize) が各モジュールの左上の座標
            // moduleSize がモジュールの幅と高さ
            // 0.5を加えるのは、ピクセル境界のアンチエイリアスを避けるため（くっきり描画）
            qrPreviewContext.fillRect(
                Math.floor(offsetX + x * moduleSize),
                Math.floor(offsetY + y * moduleSize),
                Math.ceil(moduleSize), // 切り上げで隙間を防ぐ
                Math.ceil(moduleSize)  // 切り上げで隙間を防ぐ
            );
        }
    }
    console.log("QRコードプレビューを描画しました。");
}

// ページ読み込み完了時にカメラを開始
window.addEventListener('load', () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        startCamera();
    } else {
        alert("お使いのブラウザはカメラアクセスに対応していません。");
        qrDataDisplay.textContent = "カメラアクセス非対応ブラウザです。";
    }

    // TODO: 分解ボタンのイベントリスナーなどをここに追加
});

// ページを離れる際にカメラを停止する（リソース解放）
window.addEventListener('beforeunload', () => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
});

// ここまでがステップ2の内容です。
// 次のステップで drawQRCodePreview 関数を実装します。
