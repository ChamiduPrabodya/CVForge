import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, Info, LoaderCircle, Sparkles, Upload } from "lucide-react";
import { extractResumeText, parseResumeText } from "./resumeImport";
import type { CVData } from "../../types/resume";
import { requestAI } from "../../services/ai";

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
    <header className="import-heading">
      <div className="page-intro"><span className="eyebrow">A FRESH START FOR YOUR NEXT CHAPTER</span><h1>Improve your resume<span>.</span></h1><p>Bring your experience. We’ll help give it a fresh look.</p></div>
      <ol className="import-steps" aria-label="Resume improvement steps">
        <li className={details ? "is-complete" : "is-current"} aria-current={!details ? "step" : undefined}><span>{details ? <Check size={15} /> : "01"}</span>Add your CV</li>
        <li className={details ? "is-current" : ""} aria-current={details ? "step" : undefined}><span>02</span>Review details</li>
        <li><span>03</span>Choose a design</li>
      </ol>
    </header>
    <div className="import-workspace">
      <section className="import-card import-upload" aria-labelledby="import-upload-title" aria-busy={busy}>
        <div className="import-card-heading"><span className="import-section-icon"><Upload size={19} /></span><div><h2 id="import-upload-title">Upload your CV</h2><p>Start with the resume you already have.</p></div><span className="import-option">OPTION 01</span></div>
        <div className={`import-dropzone${busy ? " is-busy" : ""}`} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void read(event.dataTransfer.files[0]); }}>
          <span className="import-file-icon">{busy ? <LoaderCircle className="import-spinner" size={30} /> : <FileText size={30} />}</span>
          <h3>{busy ? "Finding the details in your CV…" : filename ? "Your CV is uploaded" : "Drop your CV here"}</h3>
          <p>{filename || "or choose a file from your device"}</p>
          <button className="primary" disabled={busy} onClick={() => input.current?.click()}><Upload size={16} />{busy ? "Reading your CV…" : filename ? "Choose another file" : "Choose file"}</button>
          <small>PDF, Word (.docx), or TXT · Up to 10 MB</small>
          <input ref={input} type="file" accept=".pdf,.docx,.txt" aria-label="Upload existing CV" disabled={busy} onChange={event => void read(event.target.files?.[0])} hidden />
        </div>
        <p className="import-file-tip"><Info size={15} />Use a document with selectable text. Scanned images and photos aren’t supported.</p>
      </section>
      <section className="import-card import-paste" aria-labelledby="import-paste-title" aria-busy={busy}>
        <div className="import-card-heading"><span className="import-section-icon"><FileText size={19} /></span><div><h2 id="import-paste-title">Paste your CV text</h2><p>No file handy? Add your details here.</p></div><span className="import-option">OPTION 02</span></div>
        <label className="field import-text-field"><span>{filename ? `Text from ${filename}` : "Or paste your CV text"}</span><textarea rows={10} value={text} disabled={busy} placeholder={"Your name and contact details\n\nWork experience\nYour roles, companies, and achievements…\n\nEducation & skills\nYour qualifications and what you do best…"} onChange={event => { setText(event.target.value); setDetails(null); setError(""); }} /></label>
        <div className="import-paste-actions"><span>Include your experience, education, and skills.</span><button className="primary" disabled={busy || !text.trim()} onClick={() => void review()}><Sparkles size={16} /> {details ? "Read details again with AI" : "Read my CV with AI"}<ArrowRight size={16} /></button></div>
      </section>
    </div>
    {busy && <p className="import-status" role="status"><LoaderCircle className="import-spinner" size={17} />Reading your CV and organizing details with AI…</p>}
    {error && <div className="import-error"><p role="alert">{error}</p>{text.trim() && <button className="secondary" disabled={busy} onClick={basicImport}>Use basic import</button>}</div>}
    <div className="import-privacy"><Sparkles size={18} /><p><strong>A little help with the details.</strong> Your CV text is sent to Google Gemini to organize and auto-fill your information. You’ll review the results before choosing a template.</p></div>
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
