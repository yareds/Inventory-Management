import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  X,
  FlipHorizontal,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Volume2,
  VolumeX,
  Keyboard,
  Barcode as BarcodeIcon,
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string, formatName?: string) => void;
  title?: string;
  subtitle?: string;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Barcode & QR Scanner',
  subtitle = 'Point camera at any 1D barcode (UPC, EAN, Code 128) or QR code',
}: BarcodeScannerModalProps) {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-camera-stream-box';

  // Sound beep on success
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.13);
    } catch {
      // Audio context might be blocked or unsupported
    }
  };

  // Enumerate cameras when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setCameraError(null);
    setLastScanned(null);

    async function initCamera() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/environment facing camera on phones
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError('No video cameras found on your device.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('Camera enumeration error:', err);
        setCameraError(
          err?.message || 'Unable to access camera permissions. You can also enter the barcode manually below.'
        );
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  // Start scanner when camera is selected
  useEffect(() => {
    if (!isOpen || !selectedCameraId) return;

    let isSubscribed = true;

    async function startCamera() {
      try {
        if (html5QrCodeRef.current) {
          await stopScanner();
        }

        const scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false,
        });

        html5QrCodeRef.current = scanner;

        const qrCodeSuccessCallback = (decodedText: string, decodedResult: any) => {
          if (!isSubscribed) return;
          playBeep();
          setLastScanned(decodedText);
          onScanSuccess(decodedText, decodedResult?.result?.format?.formatName);
          // Auto close after brief visual feedback
          setTimeout(() => {
            if (isSubscribed) {
              onClose();
            }
          }, 350);
        };

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.0,
        };

        await scanner.start(selectedCameraId, config, qrCodeSuccessCallback, undefined);
        if (isSubscribed) {
          setIsScanning(true);
          setCameraError(null);
        }
      } catch (err: any) {
        if (isSubscribed) {
          console.warn('Failed to start scanner:', err);
          setIsScanning(false);
          setCameraError(
            err?.message || 'Camera permission denied or camera currently in use by another tab.'
          );
        }
      }
    }

    startCamera();

    return () => {
      isSubscribed = false;
      stopScanner();
    };
  }, [isOpen, selectedCameraId]);

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch (e) {
      console.warn('Error stopping scanner:', e);
    } finally {
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playBeep();
    onScanSuccess(manualCode.trim(), 'MANUAL');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BarcodeIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">{title}</h3>
              <p className="text-[11px] text-slate-500 truncate max-w-xs">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Camera Viewport */}
          <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-square flex items-center justify-center shadow-inner">
            <div id={scannerContainerId} className="w-full h-full" />

            {/* Target reticle overlay */}
            {isScanning && !lastScanned && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-40 border-2 border-blue-400/80 rounded-xl relative shadow-lg">
                  {/* Glowing scanline */}
                  <div className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_8px_#38bdf8] animate-pulse top-1/2 -translate-y-1/2" />
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-white" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-white" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-white" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-white" />
                </div>
              </div>
            )}

            {/* Success feedback overlay */}
            {lastScanned && (
              <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 animate-in zoom-in-95">
                <CheckCircle className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
                <span className="text-xs font-semibold text-emerald-200">Barcode Captured!</span>
                <span className="text-sm font-mono font-bold mt-1 text-white bg-emerald-800/60 px-3 py-1 rounded-md border border-emerald-500/40">
                  {lastScanned}
                </span>
              </div>
            )}

            {/* Error or Permission warning */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 text-white p-5 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                <h4 className="text-xs font-bold text-slate-100">Camera Unavailable</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => setSelectedCameraId(selectedCameraId)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                </button>
              </div>
            )}
          </div>

          {/* Camera controls toolbar */}
          <div className="flex items-center justify-between gap-2 text-xs">
            {cameras.length > 1 ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <FlipHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 truncate max-w-[180px]"
                >
                  {cameras.map((c, i) => (
                    <option key={c.id} value={c.id}>
                      {c.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-slate-400" />
                <span>{cameras.length === 1 ? 'Live Camera Feed' : 'Searching for camera...'}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg border transition ${
                soundEnabled
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}
              title={soundEnabled ? 'Mute beep sound' : 'Enable beep sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Alternative Manual / USB Handheld Scanner Input */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 mb-1.5">
              <Keyboard className="w-3.5 h-3.5 text-slate-400" />
              <span>Or type / scan with handheld USB scanner</span>
            </div>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Scan or enter barcode / SKU..."
                className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
              >
                Apply
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>Supported: UPC, EAN-13, Code 128, QR</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
