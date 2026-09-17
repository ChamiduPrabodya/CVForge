import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, FileText, Upload } from "lucide-react";
import { extractResumeText, parseResumeText } from "./resumeImport";
import type { CVData } from "./main";
import { requestAI } from "./ai";

export default function ImportResume({ back, complete }: { back: () => void; complete: (data: Partial<CVData>, text: string, filename: string) => void }) {
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<Partial<CVData> | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const detect = async (source: string) => {
    if (source.trim().length < 20) throw new Error("There is not enough readable text. Try another file or paste your CV below.");
    const result = await requestAI<{ details: Partial<CVData> }>("import", { text: source });
    setDetails(result.details);
  };

  const read = async (file?: File) => {
    if (!file || inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(""); setDetails(null); setText(""); setFilename("");
    try {
      const source = await extractResumeText(file);
      setText(source); setFilename(file.name);
      try { await detect(source); }
      catch (reason) { setError(reason instanceof Error ? reason.message : "AI import failed. Try basic import below."); }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "";
      setError(/password/i.test(message) ? "This PDF is password-protected. Upload an unlocked copy or paste its text below." : /Choose|readable|empty|enough|scanned/.test(message) ? message : "We could not read this file. Try a different copy or paste your CV text below.");
    } finally { setBusy(false); inFlight.current = false; if (input.current) input.current.value = ""; }
  };
  const review = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setDetails(null); setError("");
    try { await detect(text); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not read your CV."); }
    finally { setBusy(false); inFlight.current = false; }
  };
  const basicImport = () => {
    try { setDetails(parseResumeText(text)); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not read your CV."); }
  };
  return <main className="import-page">
    <button className="text-button" onClick={back} disabled={busy}><ArrowLeft size={16} /> Back to home</button>
    <div className="page-intro"><span className="eyebrow">GIVE YOUR EXPERIENCE A FRESH LOOK</span><h1>Improve your resume</h1><p>Add your existing CV. We’ll fill in your details, then you can choose a new template and make it yours.</p></div>
    <section className="import-card">
      <div className={`import-dropzone${busy ? " is-busy" : ""}`} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void read(event.dataTransfer.files[0]); }}>
        <Upload size={32} aria-hidden="true" /><h2>Upload your existing CV</h2><p>Drop your file here or choose it from your device.</p>
        <input ref={input} type="file" accept=".pdf,.docx,.txt" aria-label="Upload existing CV" disabled={busy} onChange={event => void read(event.target.files?.[0])} hidden />
        <button className="primary" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Reading your CV…" : "Choose file"}</button>
        <small>PDF, Word (.docx), or TXT · Up to 10 MB</small>
      </div>
      <p className="import-privacy">Your CV text is sent to Google Gemini to organize and auto-fill your details. Review the results before choosing a template. Scanned images and photos are not imported.</p>
      {busy && <p role="status">Reading your CV and organizing details with AI…</p>}
      {error && <p className="import-error" role="alert">{error}</p>}
      <label className="field"><span>{filename ? `Text from ${filename}` : "Or paste your CV text"}</span><textarea rows={details ? 6 : 10} value={text} disabled={busy} placeholder={"Paste your CV here, including contact details, experience, education, and skills…"} onChange={event => { setText(event.target.value); setDetails(null); setError(""); }} /></label>
      <button className="secondary" disabled={busy || !text.trim()} onClick={() => void review()}><FileText size={16} /> {details ? "Read details again with AI" : "Read my CV with AI"}</button>
      {error && text.trim() && <button className="secondary" disabled={busy} onClick={basicImport}>Use basic import</button>}
    </section>
    {details && <section className="import-card import-review" aria-label="Imported details">
      <h2>Your details are ready to review</h2><p>Check your contact information below. You can edit every section in the builder after choosing a template.</p>
      <div className="import-fields">{([['fullName', 'Full name'], ['title', 'Professional title'], ['email', 'Email'], ['phone', 'Phone'], ['location', 'Location'], ['website', 'Website'], ['linkedin', 'LinkedIn']] as const).map(([key, label]) => <label className="field" key={key}><span>{label}</span><input value={details[key] ?? ""} onChange={event => setDetails({ ...details, [key]: event.target.value })} /></label>)}</div>
      <label className="field"><span>Profile / summary</span><textarea rows={4} value={details.summary ?? ""} onChange={event => setDetails({ ...details, summary: event.target.value })} /></label>
      <div className="import-counts"><span>{details.experience?.length ?? 0} work entries</span><span>{details.education?.length ?? 0} education entries</span><span>{details.skills?.length ?? 0} skills</span></div>
      <p className="hint">Automatic detection can need corrections, especially for CVs with columns or unusual headings. Your source text stays available in the builder for reference.</p>
      <button className="primary" onClick={() => complete(details, text, filename)}>Choose my template <ArrowRight size={16} /></button>
    </section>}
  </main>;
}
