import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw, RotateCw, X } from "lucide-react";

const SIZE = 512;
type Position = { x: number; y: number };

export default function PhotoEditor({ source, onApply, onClose }: {
  source: string;
  onApply: (photo: string) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: number; x: number; y: number; position: Position } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialogRef.current?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const next = new Image();
    next.onload = () => {
      if (!active) return;
      if (!next.naturalWidth || !next.naturalHeight) {
        setError("This photo could not be opened. Try a different image.");
        return;
      }
      setImage(next);
    };
    next.onerror = () => {
      if (active) setError("This photo could not be opened. Try a JPG, PNG, or WebP image.");
    };
    next.src = source;
    return () => { active = false; };
  }, [source]);

  const rotated = rotation % 180 !== 0;
  const width = image ? (rotated ? image.naturalHeight : image.naturalWidth) : SIZE;
  const height = image ? (rotated ? image.naturalWidth : image.naturalHeight) : SIZE;
  const scale = Math.max(SIZE / width, SIZE / height) * zoom;
  const limitX = Math.max(0, (width * scale - SIZE) / 2);
  const limitY = Math.max(0, (height * scale - SIZE) / 2);
  const clamp = (point: Position): Position => ({
    x: Math.max(-limitX, Math.min(limitX, point.x)),
    y: Math.max(-limitY, Math.min(limitY, point.y)),
  });
  const offset = clamp(position);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context || !image) return;
    context.clearRect(0, 0, SIZE, SIZE);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, SIZE, SIZE);
    context.save();
    context.translate(SIZE / 2 + offset.x, SIZE / 2 + offset.y);
    context.rotate(rotation * Math.PI / 180);
    context.scale(scale, scale);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    context.restore();
  }, [image, scale, rotation, offset.x, offset.y]);

  const apply = () => {
    if (!image || !canvasRef.current) return;
    try {
      onApply(canvasRef.current.toDataURL("image/jpeg", 0.92));
    } catch {
      setError("We couldn't save this crop. Please upload the photo again.");
    }
  };

  return (
    <dialog ref={dialogRef} className="photo-editor" aria-labelledby="photo-editor-title" aria-describedby="photo-editor-help" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="photo-editor-heading">
        <h2 id="photo-editor-title">Edit profile photo</h2>
        <button type="button" className="photo-editor-close" aria-label="Close photo editor" onClick={onClose}><X size={20} /></button>
      </div>
      <p id="photo-editor-help">Drag to position your photo and zoom to crop. You can also use the arrow keys on the photo.</p>
      <div className="photo-crop-frame">
        <canvas
          ref={canvasRef} width={SIZE} height={SIZE} tabIndex={image ? 0 : -1}
          aria-label="Photo crop preview" aria-describedby="photo-editor-help"
          onPointerDown={(event) => {
            if (!image || (event.pointerType === "mouse" && event.button !== 0) || dragRef.current) return;
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, position: offset };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.id !== event.pointerId) return;
            const ratio = SIZE / event.currentTarget.getBoundingClientRect().width;
            setPosition(clamp({ x: drag.position.x + (event.clientX - drag.x) * ratio, y: drag.position.y + (event.clientY - drag.y) * ratio }));
          }}
          onPointerUp={(event) => {
            if (dragRef.current?.id !== event.pointerId) return;
            dragRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { dragRef.current = null; }}
          onLostPointerCapture={() => { dragRef.current = null; }}
          onKeyDown={(event) => {
            const directions: Record<string, Position> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
            const direction = directions[event.key];
            if (!direction || !image) return;
            event.preventDefault();
            const step = event.shiftKey ? 20 : 5;
            setPosition(clamp({ x: offset.x + direction.x * step, y: offset.y + direction.y * step }));
          }}
        />
        {image && <div className="photo-crop-grid" aria-hidden="true" />}
        {!image && <span className="photo-crop-loading" role="status">{error ? "Photo unavailable" : "Loading photo…"}</span>}
      </div>
      <label className="photo-zoom">
        <span>Zoom <output>{Math.round(zoom * 100)}%</output></span>
        <input type="range" min="1" max="3" step="0.01" value={zoom} disabled={!image} onChange={(event) => {
          setPosition(offset);
          setZoom(Number(event.target.value));
        }} />
      </label>
      <div className="photo-editor-tools">
        <button type="button" className="secondary small" disabled={!image} onClick={() => { setRotation((value) => (value + 90) % 360); setPosition({ x: 0, y: 0 }); }}><RotateCw size={16} /> Rotate</button>
        <button type="button" className="secondary small" disabled={!image} onClick={() => { setRotation(0); setZoom(1); setPosition({ x: 0, y: 0 }); }}><RotateCcw size={16} /> Reset</button>
      </div>
      {error && <p className="photo-editor-error" role="alert">{error}</p>}
      <div className="photo-editor-actions">
        <button type="button" className="secondary small" onClick={onClose}>Cancel</button>
        <button type="button" className="primary small" disabled={!image} onClick={apply}><Check size={16} /> Apply photo</button>
      </div>
    </dialog>
  );
}
