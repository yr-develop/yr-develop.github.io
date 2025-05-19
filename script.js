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

// QRコードスキャン関数
function scanQRCode() {
    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA && localStream && localStream.active) {
        // videoの現在のフレームをsnapshotCanvasに描画
        snapshotContext.drawImage(videoElement, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

        // snapshotCanvasからImageDataを取得
        const imageData = snapshotContext.getImageData(0, 0, snapshotCanvas.width, snapshotCanvas.height);

        // jsQRでQRコードを検出
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert", // 通常のQRコードのみ（反転色は試行しない）
        });

        if (code) {
            // QRコードが検出された場合
            qrDataDisplay.textContent = `QRコードデータ: ${code.data}`;
            console.log("QRコード検出:", code);
            console.log("データ:", code.data);
            console.log("位置:", code.location);

            // ここで一度スキャンを止めるか、連続スキャンするか選べる
            // 今回は連続スキャンを維持し、最新のものを表示
            // drawQRCodePreview(code); // 次のステップで実装

        } else {
            // QRコードが見つからない場合（何もしないか、メッセージを出すなど）
            // qrDataDisplay.textContent = 'QRコードをスキャン中...'; // 頻繁に更新されるのでコメントアウト推奨
        }
    }
    // 次のフレームで再度スキャン (ブラウザが最適なタイミングで呼び出す)
    if (localStream && localStream.active) {
        requestAnimationFrame(scanQRCode);
    }
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