import { useEffect, useRef, useState } from "react";
import { BrowserCodeReader, BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import "./qrscanner.css";

type Status = "starting" | "running" | "denied" | "error";

export function QrScanner({ active, onScan }: { active: boolean; onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [status, setStatus] = useState<Status>("starting");

  useEffect(() => {
    if (!active) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }

    let cancelled = false;
    setStatus("starting");
    const videoEl = videoRef.current;

    // Defers the actual getUserMedia call by a tick so that React StrictMode's
    // synchronous mount->cleanup->mount dev-only double-invoke cancels the first
    // (throwaway) attempt before it ever requests the camera — otherwise both
    // attempts race to attach a MediaStream to the same <video>, corrupting it.
    const startTimer = setTimeout(() => {
      const reader = new BrowserQRCodeReader();

      reader
        .decodeFromConstraints({ video: { facingMode: "environment" } }, videoEl ?? undefined, (result, _error, controls) => {
          controlsRef.current = controls;
          if (cancelled || !result) return;
          controls.stop();
          onScanRef.current(result.getText());
        })
        .then((controls) => {
          if (cancelled) {
            controls.stop();
            return;
          }
          controlsRef.current = controls;
          setStatus("running");
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setStatus(err instanceof DOMException && err.name === "NotAllowedError" ? "denied" : "error");
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      controlsRef.current?.stop();
      controlsRef.current = null;
      if (videoEl) BrowserCodeReader.cleanVideoSource(videoEl);
    };
  }, [active]);

  return (
    <div className="qr-scanner">
      <div className="qr-scanner-frame">
        <video ref={videoRef} className="qr-scanner-video" muted playsInline />
        {status === "running" && <div className="qr-scanner-reticle" aria-hidden="true" />}
      </div>
      {status === "denied" && (
        <p className="qr-scanner-message">
          Permissão de câmera negada. Autorize o acesso nas configurações do navegador, ou use "Digitar código" acima.
        </p>
      )}
      {status === "error" && (
        <p className="qr-scanner-message">Não foi possível acessar a câmera neste dispositivo. Use "Digitar código" acima.</p>
      )}
    </div>
  );
}
