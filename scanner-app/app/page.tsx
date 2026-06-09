"use client";
import { useState, useRef, useEffect } from "react";

type Status = "idle" | "loading" | "success" | "error";

interface Result {
  nfc: string | null;
  camera: string | null;
  location: string | null;
}

export default function Home() {
  const [nfcStatus, setNfcStatus] = useState<Status>("idle");
  const [cameraStatus, setCameraStatus] = useState<Status>("idle");
  const [locationStatus, setLocationStatus] = useState<Status>("idle");
  const [results, setResults] = useState<Result>({ nfc: null, camera: null, location: null });
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    };
  }, [cameraStream]);

  // NFC Scan
  const handleNFC = async () => {
    setNfcStatus("loading");
    setResults(r => ({ ...r, nfc: null }));
    try {
      if (!("NDEFReader" in window)) throw new Error("Web NFC not supported on this device/browser.");
      // @ts-ignore
      const ndef = new window.NDEFReader();
      await ndef.scan();
      setNfcStatus("loading");
      ndef.onreading = (event: any) => {
        const decoder = new TextDecoder();
        let text = "";
        for (const record of event.message.records) {
          if (record.recordType === "text") text += decoder.decode(record.data) + " ";
          else text += `[${record.recordType}] `;
        }
        setResults(r => ({ ...r, nfc: text.trim() || `Tag UID: ${event.serialNumber}` }));
        setNfcStatus("success");
      };
      ndef.onerror = () => {
        setNfcStatus("error");
        setResults(r => ({ ...r, nfc: "Failed to read NFC tag." }));
      };
    } catch (e: any) {
      setNfcStatus("error");
      setResults(r => ({ ...r, nfc: e.message || "NFC error." }));
    }
  };

  // Camera
  const handleCamera = async () => {
    if (cameraStatus === "success" && cameraStream) {
      // Capture photo
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")!.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setResults(r => ({ ...r, camera: dataUrl }));
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
        setCameraStatus("idle");
      }
      return;
    }
    setCameraStatus("loading");
    setResults(r => ({ ...r, camera: null }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      setCameraStream(stream);
      setCameraStatus("success");
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (e: any) {
      setCameraStatus("error");
      setResults(r => ({ ...r, camera: e.message || "Camera access denied." }));
    }
  };

  // Location
  const handleLocation = () => {
    setLocationStatus("loading");
    setResults(r => ({ ...r, location: null }));
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setResults(r => ({ ...r, location: "Geolocation not supported." }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setResults(r => ({
          ...r,
          location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${Math.round(accuracy)}m)`
        }));
        setLocationStatus("success");
      },
      (err) => {
        setLocationStatus("error");
        setResults(r => ({ ...r, location: err.message || "Location denied." }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const statusIcon = (s: Status) => {
    if (s === "loading") return <span className="spinner" />;
    if (s === "success") return <span className="icon-success">✓</span>;
    if (s === "error") return <span className="icon-error">✕</span>;
    return null;
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1117; color: #e8eaf0; min-height: 100vh; }
        .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
        .card { background: #1a1d27; border: 1px solid #2a2d3e; border-radius: 20px; padding: 32px 28px; width: 100%; max-width: 400px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, #4f8ef7, #a259f7); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 24px; }
        h1 { font-size: 22px; font-weight: 600; color: #fff; margin-bottom: 6px; }
        .subtitle { font-size: 14px; color: #6b7280; }
        .btns { display: flex; flex-direction: column; gap: 14px; }
        .btn { display: flex; align-items: center; gap: 16px; background: #22263a; border: 1px solid #2e3350; border-radius: 14px; padding: 18px 20px; cursor: pointer; transition: all 0.2s; width: 100%; text-align: left; color: inherit; }
        .btn:hover { background: #272b42; border-color: #3d4266; transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        .btn-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .nfc .btn-icon { background: #1a2d4a; }
        .cam .btn-icon { background: #1a3a2a; }
        .loc .btn-icon { background: #3a2a1a; }
        .btn-text { flex: 1; }
        .btn-label { font-size: 15px; font-weight: 600; color: #e8eaf0; margin-bottom: 3px; }
        .btn-desc { font-size: 12px; color: #6b7280; }
        .btn-status { margin-left: auto; }
        .spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid #3d4266; border-top-color: #4f8ef7; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .icon-success { color: #34d399; font-size: 18px; font-weight: 700; }
        .icon-error { color: #f87171; font-size: 18px; font-weight: 700; }
        .result-box { margin-top: 10px; background: #131620; border: 1px solid #2a2d3e; border-radius: 10px; padding: 12px 14px; font-size: 12px; color: #94a3b8; word-break: break-all; line-height: 1.6; }
        .result-img { margin-top: 10px; border-radius: 10px; overflow: hidden; }
        .result-img img { width: 100%; display: block; border-radius: 10px; }
        .capture-btn { display: block; width: 100%; margin-top: 8px; padding: 10px; background: #4f8ef7; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
        video { width: 100%; border-radius: 10px; display: block; background: #000; max-height: 220px; object-fit: cover; }
        canvas { display: none; }
        .divider { height: 1px; background: #2a2d3e; margin: 28px 0; }
        .footer { text-align: center; font-size: 12px; color: #3d4266; }
      `}</style>

      <div className="page">
        <div className="card">
          <div className="header">
            <div className="logo">📡</div>
            <h1>Device Scanner</h1>
            <p className="subtitle">NFC · Camera · Location</p>
          </div>

          <div className="btns">
            {/* NFC Button */}
            <div>
              <button className="btn nfc" onClick={handleNFC} disabled={nfcStatus === "loading"}>
                <div className="btn-icon">📶</div>
                <div className="btn-text">
                  <div className="btn-label">Scan NFC Tag</div>
                  <div className="btn-desc">Hold device near NFC tag</div>
                </div>
                <div className="btn-status">{statusIcon(nfcStatus)}</div>
              </button>
              {results.nfc && <div className="result-box">📋 {results.nfc}</div>}
            </div>

            {/* Camera Button */}
            <div>
              <button className="btn cam" onClick={handleCamera} disabled={cameraStatus === "loading"}>
                <div className="btn-icon">📷</div>
                <div className="btn-text">
                  <div className="btn-label">
                    {cameraStatus === "success" ? "Capture Photo" : "Open Camera"}
                  </div>
                  <div className="btn-desc">
                    {cameraStatus === "success" ? "Tap to take a photo" : "Access device camera"}
                  </div>
                </div>
                <div className="btn-status">{statusIcon(cameraStatus === "success" ? "idle" : cameraStatus)}</div>
              </button>
              {cameraStatus === "success" && (
                <div style={{ marginTop: 10 }}>
                  <video ref={videoRef} autoPlay playsInline muted />
                  <canvas ref={canvasRef} />
                </div>
              )}
              {results.camera && (
                <div className="result-img">
                  <img src={results.camera} alt="Captured" />
                </div>
              )}
              {cameraStatus === "error" && results.camera && (
                <div className="result-box">⚠️ {results.camera}</div>
              )}
            </div>

            {/* Location Button */}
            <div>
              <button className="btn loc" onClick={handleLocation} disabled={locationStatus === "loading"}>
                <div className="btn-icon">📍</div>
                <div className="btn-text">
                  <div className="btn-label">Get Location</div>
                  <div className="btn-desc">Fetch GPS coordinates</div>
                </div>
                <div className="btn-status">{statusIcon(locationStatus)}</div>
              </button>
              {results.location && locationStatus !== "error" && (
                <div className="result-box">🌍 {results.location}</div>
              )}
              {locationStatus === "error" && results.location && (
                <div className="result-box">⚠️ {results.location}</div>
              )}
            </div>
          </div>

          <div className="divider" />
          <div className="footer">Permissions requested on first use</div>
        </div>
      </div>
    </>
  );
}
