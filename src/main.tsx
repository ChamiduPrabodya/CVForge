import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Copy,
  Download,
  FileText,
  GripVertical,
  LayoutTemplate,
  Mail,
  MapPin,
  Menu,
  MoreHorizontal,
  Palette,
  PenLine,
  Phone,
  Plus,
  Printer,
  Rocket,
  Save,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import "./styles.css";
import PhotoEditor from "./PhotoEditor";
import carelineTemplate from "./templates/careline.json";
import saleslineTemplate from "./templates/salesline.json";
import boutiqueTemplate from "./templates/boutique.json";
import ivoryTemplate from "./templates/ivory.json";
import mercadoTemplate from "./templates/mercado.json";

type Experience = {
  id: string;
  title: string;
  company: string;
  location: string;
  start: string;
  end: string;
  description: string;
};
type Education = {
  id: string;
  degree: string;
  description?: string;
  school: string;
  location: string;
  start: string;
  end: string;
};
type Project = { id: string; name: string; description: string; tech: string; url?: string; github?: string };
type Certification = { id: string; name: string; organization: string; date: string; url: string };
type Language = { id: string; language: string; proficiency: string };
type Achievement = { id: string; text: string };
type Volunteer = { id: string; role: string; organization: string; location: string; start: string; end: string; description: string };
type Reference = { id: string; name: string; relationship: string; email: string; phone: string };
type DesignSettings = { accent: string; font: string; spacing: number; bodyFontSize: number; nameFontSize: number; headingFont?: string; secondaryAccent?: string; background?: string };
type AuthUser = { id: string; email: string; role: "admin" | "user" };
type CVData = {
  id: string;
  name: string;
  template: string;
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  photo: string;
  originalPhoto?: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
  achievements: Achievement[];
  volunteer: Volunteer[];
  references: Reference[];
  design: DesignSettings;
  sections: string[];
  templateConfig?: Template;
};
type Template = {
  id: string;
  name: string;
  category: string;
  description: string;
  ats?: boolean;
  style: string;
  design?: DesignSettings;
  status?: "draft" | "published";
  version?: number;
  layout?: "single" | "two-column";
  sidebarPosition?: "left" | "right";
  sidebarWidth?: number;
  headerAlign?: "left" | "center";
  showPhoto?: boolean;
  photoShape?: "circle" | "rounded" | "square";
  pageSize?: "a4" | "letter";
  pageMargin?: number;
  density?: "compact" | "standard" | "relaxed";
  divider?: "line" | "accent" | "none";
  skillStyle?: "chips" | "plain" | "bars";
  contactStyle?: "inline" | "stacked";
  sections?: string[];
  sidebarSections?: string[];
  sectionLabels?: Record<string, string>;
};
const newSystemTemplateDraft = (): Template => ({
  id: "",
  name: "",
  category: "Custom",
  description: "A new CVForge template.",
  style: "custom",
  ats: true,
  status: "draft",
  version: 1,
  layout: "single",
  sidebarPosition: "left",
  sidebarWidth: 32,
  headerAlign: "left",
  showPhoto: true,
  photoShape: "circle",
  pageSize: "a4",
  pageMargin: 42,
  density: "standard",
  divider: "line",
  skillStyle: "chips",
  contactStyle: "inline",
  sections: [...initialCV.sections],
  sidebarSections: ["skills", "languages", "certifications"],
  sectionLabels: {},
  design: { accent: "#514ed0", secondaryAccent: "#697386", background: "#ffffff", font: "Inter", headingFont: "Inter", spacing: 1, bodyFontSize: 11, nameFontSize: 28 },
});
const uid = () => Math.random().toString(36).slice(2, 9);
const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const getToken = () => localStorage.getItem("cvforge-auth-token");
const getOwnerKey = () => {
  const key = localStorage.getItem("cvforge-owner-key");
  if (key) return key;
  const next = crypto.randomUUID();
  localStorage.setItem("cvforge-owner-key", next);
  return next;
};
async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(options?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, { ...options, headers, signal: options?.signal ?? AbortSignal.timeout(15000) });
  } catch {
    throw new Error("Unable to reach the server. Please try again shortly.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(typeof body?.error === "string" ? body.error : `API request failed (${response.status})`);
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}
const initialCV: CVData = {
  id: uid(),
  name: "Untitled CV",
  template: "custom",
  fullName: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  linkedin: "",
  photo: "",
  originalPhoto: "",
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
  achievements: [],
  volunteer: [],
  references: [],
  design: { accent: "#2563eb", font: "Inter", spacing: 1, bodyFontSize: 11, nameFontSize: 28 },
  sections: ["summary", "experience", "education", "skills", "projects", "certifications", "languages", "achievements", "volunteer", "references"],
};
const hydrateCV = (stored: Partial<CVData>): CVData => ({
  ...initialCV,
  ...stored,
  projects: stored.projects ?? initialCV.projects,
  certifications: stored.certifications ?? initialCV.certifications,
  languages: stored.languages ?? initialCV.languages,
  achievements: stored.achievements ?? initialCV.achievements,
  volunteer: stored.volunteer ?? initialCV.volunteer,
  references: stored.references ?? initialCV.references,
  design: { ...initialCV.design, ...(stored.design ?? {}) },
  sections: Array.isArray(stored.sections) ? [...new Set(stored.sections.filter((section) => initialCV.sections.includes(section)))] : [...initialCV.sections],
});
// A document can be edited before any reusable templates have been created.
const documentTemplate = (cv: CVData): Template => cv.templateConfig ?? bundledTemplates.find((template) => template.style === cv.template) ?? {
  id: "",
  name: "Your design",
  category: "Custom",
  description: "",
  style: cv.template || "custom",
};
const bundledTemplates: Template[] = [carelineTemplate as Template, saleslineTemplate as Template, boutiqueTemplate as Template, ivoryTemplate as Template, mercadoTemplate as Template];
const categories = [
  "All",
  "Professional",
  "Healthcare",
  "Sales & Retail",
  "Modern",
  "Minimal",
  "Creative",
  "Executive",
  "ATS-Friendly",
  "Student",
  "Experienced",
  "Custom",
];
const sectionTitles: Record<string, string> = {
  summary: "Profile",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Selected Projects",
  certifications: "Certifications",
  languages: "Languages",
  achievements: "Achievements",
  volunteer: "Volunteer Experience",
  references: "References",
};
const nav = [
  { id: "home", label: "Home" },
  { id: "templates", label: "Templates" },
  { id: "builder", label: "CV Builder" },
  { id: "dashboard", label: "My CVs" },
  { id: "ats", label: "ATS Checker" },
  { id: "cover", label: "Cover Letter" },
];

function App() {
  const [page, setPage] = useState(() => {
      try { return localStorage.getItem("cvforge-auth-user") ? "dashboard" : "home"; } catch { return "home"; }
    }),
    [cv, setCV] = useState<CVData>(initialCV),
    [toast, setToast] = useState(""),
    [mobile, setMobile] = useState(false),
    [customTemplates, setCustomTemplates] = useState<Template[]>([]),
    [systemTemplates, setSystemTemplates] = useState<Template[]>(bundledTemplates),
    [auth, setAuth] = useState<AuthUser | null>(() => {
      try { return JSON.parse(localStorage.getItem("cvforge-auth-user") || "null"); } catch { return null; }
    });
  useEffect(() => {
    const saved = localStorage.getItem("cvforge-doc");
    if (saved)
      try {
        const stored = JSON.parse(saved);
        if (stored.fullName === "Alex Morgan" && stored.name === "Software Engineer CV") localStorage.removeItem("cvforge-doc");
        else setCV(hydrateCV(stored));
      } catch {}
  }, []);
  useEffect(() => {
    try {
      const savedTemplates = JSON.parse(localStorage.getItem("cvforge-custom-templates") || "[]");
      if (Array.isArray(savedTemplates)) setCustomTemplates(savedTemplates);
    } catch {}
  }, []);
  useEffect(() => {
    void apiRequest<Template[]>("/templates/public")
      .then((items) => setSystemTemplates([...bundledTemplates.filter((template) => !items.some((item) => item.id === template.id)), ...items]))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!auth) return;
    void apiRequest<{ user: AuthUser }>("/auth/me")
      .then(({ user }) => {
        localStorage.setItem("cvforge-auth-user", JSON.stringify(user));
        setAuth(user);
      })
      .catch(() => {
        localStorage.removeItem("cvforge-auth-token");
        localStorage.removeItem("cvforge-auth-user");
        setAuth(null);
        setPage("login");
      });
  }, []);
  useEffect(() => {
    if (!auth) return;
    void apiRequest<{ document: CVData }[]>("/cvs")
      .then((records) => {
        if (!records[0]?.document) return;
        const remoteCV = hydrateCV(records[0].document);
        setCV(remoteCV);
        localStorage.setItem("cvforge-doc", JSON.stringify(remoteCV));
      })
      .catch(() => {});
    void apiRequest<Template[]>("/templates")
      .then((templates) => {
        setCustomTemplates(templates);
        localStorage.setItem("cvforge-custom-templates", JSON.stringify(templates));
      })
      .catch(() => {});
  }, [auth]);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const completeAuth = (session: { token: string; user: AuthUser }) => {
    localStorage.setItem("cvforge-auth-token", session.token);
    localStorage.setItem("cvforge-auth-user", JSON.stringify(session.user));
    setAuth(session.user);
    setPage("dashboard");
    notify(`Welcome${session.user.role === "admin" ? " back, admin" : ""}.`);
  };
  const logout = () => {
    localStorage.removeItem("cvforge-auth-token");
    localStorage.removeItem("cvforge-auth-user");
    setAuth(null);
    setPage("home");
    notify("You have been logged out.");
  };
  const goToPage = (nextPage: string) => {
    if (nextPage === "admin" && auth?.role !== "admin") {
      setPage(auth ? "dashboard" : "login");
      notify("Admin access is restricted to administrator accounts.");
      return;
    }
    setPage(nextPage);
  };
  useEffect(() => {
    if (page === "admin" && auth?.role !== "admin") setPage(auth ? "dashboard" : "login");
  }, [page, auth]);
  const choose = (template: Template) => {
    setCV((p) => ({ ...p, template: template.style, templateConfig: template, design: { ...p.design, ...(template.design ?? {}) } }));
    setPage("builder");
    notify("Template selected — your information is preserved.");
  };
  const saveCustomTemplate = (design: DesignSettings) => {
    const name = window.prompt("Name your reusable template", "My custom template")?.trim();
    if (!name) return;
    const template: Template = { ...documentTemplate(cv), id: `saved-${uid()}`, name, category: "Custom", description: "Your saved layout, colors, type scale, and spacing.", style: cv.template, design };
    setCustomTemplates((items) => {
      const next = [...items, template];
      localStorage.setItem("cvforge-custom-templates", JSON.stringify(next));
      return next;
    });
    if (!auth) { notify("Custom template saved locally. Log in to sync it."); return; }
    void apiRequest(`/templates/${encodeURIComponent(template.id)}`, {
      method: "PUT",
      body: JSON.stringify({ template }),
    }).then(() => notify("Custom template saved to MongoDB.")).catch(() => notify("Custom template saved locally — MongoDB is unavailable."));
  };
  const save = async () => {
    let savedLocally = false;
    try {
      localStorage.setItem("cvforge-doc", JSON.stringify(cv));
      savedLocally = true;
    } catch {}
    if (!auth) {
      notify(savedLocally ? "CV saved locally. Log in to sync it to MongoDB." : "Browser storage is full. Use a smaller photo or log in to save your CV.");
      return;
    }
    try {
      await apiRequest(`/cvs/${encodeURIComponent(cv.id)}`, {
        method: "PUT",
        body: JSON.stringify({ document: cv }),
      });
      notify("CV saved to MongoDB.");
    } catch {
      notify(savedLocally ? "CV saved locally — MongoDB is unavailable." : "Your CV could not be saved. Please try again or use a smaller photo.");
    }
  };
  return (
    <>
      <header className="topbar">
        <button className="brand" onClick={() => setPage("home")}>
          <span>✦</span> CVForge
        </button>
        <nav>
          {nav.slice(0, 2).map((n) => (
            <button
              className={page === n.id ? "active" : ""}
              onClick={() => goToPage(n.id)}
              key={n.id}
            >
              {n.label}
            </button>
          ))}
          <button onClick={() => goToPage("builder")}>How it works</button>
          <button onClick={() => goToPage("home")}>Pricing</button>
          {auth?.role === "admin" && <button className={page === "admin" ? "active" : ""} onClick={() => goToPage("admin")}>Admin</button>}
        </nav>
        <div className="top-actions">
          {auth ? <button className="login" onClick={logout}>{auth.role === "admin" ? "Admin" : auth.email.split("@")[0]} · Log out</button> : <button className="login" onClick={() => setPage("login")}>Log in</button>}
          <button
            className="primary small"
            onClick={() => goToPage("templates")}
          >
            Create CV <ArrowRight size={15} />
          </button>
        </div>
        <button className="menu" onClick={() => setMobile(!mobile)}>
          <Menu />
        </button>
      </header>
      {mobile && (
        <div className="mobile-nav">
          {nav.map((n) => (
            <button
              onClick={() => {
                goToPage(n.id);
                setMobile(false);
              }}
              key={n.id}
            >
              {n.label}
            </button>
          ))}
        </div>
      )}
      {page === "home" && <Home go={setPage} />}{" "}
      {page === "templates" && <Templates cv={cv} templates={[...systemTemplates, ...customTemplates]} choose={choose} startBlank={() => { setCV({ ...initialCV, id: uid() }); setPage("builder"); }} />}{" "}
      {page === "builder" && (
        <Builder cv={cv} setCV={setCV} save={save} notify={notify} saveCustomTemplate={saveCustomTemplate} changeTemplate={() => setPage("templates")} />
      )}{" "}
      {page === "dashboard" && <Dashboard cv={cv} go={setPage} save={save} auth={auth} />}{" "}
      {page === "ats" && <ATS cv={cv} />}{" "}
      {page === "cover" && <Cover cv={cv} notify={notify} />}
      {page === "login" && <AuthPage onComplete={completeAuth} />}
      {page === "admin" && auth?.role === "admin" && <AdminPage notify={notify} auth={auth} />}
      {toast && (
        <div className="toast">
          <CircleCheck size={18} />
          {toast}
        </div>
      )}
    </>
  );
}

function Home({ go }: { go: (v: string) => void }) {
  return (
    <main className="home">
      <section className="hero">
        <div className="eyebrow">
          <Sparkles size={14} /> The smarter way to shape your story
        </div>
        <h1>
          Create a professional CV
          <br />
          <em>that gets noticed.</em>
        </h1>
        <p>
          Build a beautiful, ATS-friendly CV in minutes. Add your experience,
          customize your design, and download it with confidence.
        </p>
        <div className="hero-actions">
          <button className="primary" onClick={() => go("templates")}>
            Create my CV <ArrowRight size={17} />
          </button>
          <button className="secondary" onClick={() => go("templates")}>
            Explore templates
          </button>
        </div>
        <div className="trust">
          <span>✦ No credit card required</span>
          <span>✦ Flexible CV design</span>
          <span>✦ Export as PDF</span>
        </div>
      </section>
      <section className="hero-visual">
        <div className="floating-note top">
          <Sparkles size={15} />
          <span>
            <b>Smart suggestions</b>
            <small>Make every word count</small>
          </span>
        </div>
        <MiniCV />
        <div className="floating-note bottom">
          <span className="score">✓</span>
          <span>
            <b>ATS ready</b>
            <small>Excellent match score</small>
          </span>
          <CircleCheck size={20} />
        </div>
      </section>
      <section className="proof">
        <span>Built for focused, modern job applications</span>
        <b>Clear</b>
        <b>Professional</b>
        <b>Flexible</b>
        <b>Private</b>
      </section>
      <section className="features">
        <div>
          <span className="eyebrow">MAKE IT YOURS</span>
          <h2>
            Everything you need.
            <br />
            Nothing you don’t.
          </h2>
        </div>
        <div className="feature-grid">
          <Feature
            icon={<LayoutTemplate />}
            title="Design that opens doors"
            text="Create your own design with custom colors, typography, and spacing."
          />
          <Feature
            icon={<Zap />}
            title="Built for momentum"
            text="Live preview and effortless editing keep you in the flow."
          />
          <Feature
            icon={<WandSparkles />}
            title="A little smarter"
            text="Helpful AI prompts turn your experience into compelling copy."
          />
        </div>
      </section>
    </main>
  );
}
function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="feature">
      <i>{icon}</i>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function AuthPage({ onComplete }: { onComplete: (session: { token: string; user: AuthUser }) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError(""); setLoading(true);
    try {
      const session = await apiRequest<{ token: string; user: AuthUser }>(`/auth/${mode}`, { method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase(), password }) });
      onComplete(session);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };
  return <main className="auth-page"><section className="auth-panel"><div className="auth-brand"><span>✦</span> CVForge</div><span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "START FOR FREE"}</span><h1>{mode === "login" ? "Good to see you." : "Create your account."}</h1><p>{mode === "login" ? "Sign in to save your CVs and custom templates securely." : "Your CVs and saved designs will be available whenever you return."}</p><form onSubmit={submit}><label className="field"><span>Email address</span><input type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required disabled={loading} /></label><label className="field"><span>Password</span><input type="password" name="password" autoComplete={mode === "register" ? "new-password" : "current-password"} disabled={loading} value={password} minLength={8} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required /></label>{error && <div className="auth-error" role="alert">{error}</div>}<button className="primary auth-submit" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}<ArrowRight size={16} /></button></form><button className="auth-switch" disabled={loading} onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "New to CVForge? Create an account" : "Already have an account? Log in"}</button></section><aside className="auth-aside"><span className="eyebrow">YOUR WORK, YOURS</span><h2>Build it once.<br/><em>Take it anywhere.</em></h2><div><CircleCheck size={18}/><span><b>Private account storage</b><small>Your CVs are saved to your account.</small></span></div><div><CircleCheck size={18}/><span><b>Custom templates</b><small>Keep the visual styles you create.</small></span></div></aside></main>;
}

function AdminPage({ notify, auth }: { notify: (message: string) => void; auth: AuthUser }) {
  const [overview, setOverview] = useState<{ userCount: number; cvCount: number; customTemplateCount: number; systemTemplateCount: number } | null>(null);
  const [users, setUsers] = useState<{ id: string; email: string; role: string; createdAt: string }[]>([]);
  const [documents, setDocuments] = useState<{ id: string; title: string; owner: string; updatedAt: string }[]>([]);
  const [templateRecords, setTemplateRecords] = useState<Template[]>([]);
  const [draftTemplate, setDraftTemplate] = useState<Template>(newSystemTemplateDraft);
  const load = () => Promise.all([
    apiRequest<{ userCount: number; cvCount: number; customTemplateCount: number; systemTemplateCount: number }>("/admin/overview"),
    apiRequest<{ id: string; email: string; role: string; createdAt: string }[]>("/admin/users"),
    apiRequest<{ id: string; title: string; owner: string; updatedAt: string }[]>("/admin/cvs"),
    apiRequest<Template[]>("/admin/system-templates"),
  ]).then(([stats, accountRecords, cvRecords, templateData]) => { setOverview(stats); setUsers(accountRecords); setDocuments(cvRecords); setTemplateRecords(templateData); }).catch(() => notify("Could not load admin data."));
  useEffect(() => { void load(); }, []);
  const saveTemplate = async (template: Template) => {
    try { await apiRequest(`/admin/system-templates/${encodeURIComponent(template.id)}`, { method: "PUT", body: JSON.stringify({ template }) }); notify("System template updated."); }
    catch { notify("Could not update the template."); }
  };
  const saveDesignedTemplate = async (status: "draft" | "published") => {
    if (!draftTemplate.name.trim()) { notify("Add a name for the new template."); return; }
    const template: Template = {
      ...draftTemplate,
      id: draftTemplate.id || `admin-${Date.now().toString(36)}-${uid()}`,
      name: draftTemplate.name.trim(),
      description: draftTemplate.description.trim() || "A new CVForge template.",
      status,
      version: draftTemplate.version ?? 1,
    };
    try {
      const saved = await apiRequest<Template>(`/admin/system-templates/${encodeURIComponent(template.id)}`, { method: "PUT", body: JSON.stringify({ template }) });
      setTemplateRecords((items) => items.some((item) => item.id === saved.id) ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved]);
      setDraftTemplate(saved);
      notify(status === "published" ? "Template published for users." : "Template saved as a private draft.");
      void load();
    } catch { notify("Could not save the template."); }
  };
  const duplicateTemplate = (source: Template) => setDraftTemplate({ ...newSystemTemplateDraft(), ...source, id: "", name: `${source.name} copy`, status: "draft", version: (source.version ?? 1) + 1, design: { ...newSystemTemplateDraft().design!, ...(source.design ?? {}) }, sections: [...(source.sections ?? initialCV.sections)], sidebarSections: [...(source.sidebarSections ?? [])], sectionLabels: { ...(source.sectionLabels ?? {}) } });
  const deleteDocument = async (id: string) => {
    if (!window.confirm("Delete this CV permanently?")) return;
    try { await apiRequest(`/admin/cvs/${id}`, { method: "DELETE" }); setDocuments((items) => items.filter((item) => item.id !== id)); notify("CV deleted."); }
    catch { notify("Could not delete the CV."); }
  };
  const updateUserRole = async (id: string, role: "admin" | "user") => {
    try {
      const updated = await apiRequest<{ id: string; email: string; role: string; createdAt: string }>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
      setUsers((items) => items.map((user) => user.id === id ? updated : user));
      notify("Account role updated.");
    } catch { notify("Could not update the account role."); }
  };
  const deleteUser = async (id: string, email: string) => {
    if (!window.confirm(`Delete ${email} and all of their saved CVs and custom templates?`)) return;
    try {
      await apiRequest(`/admin/users/${id}`, { method: "DELETE" });
      setUsers((items) => items.filter((user) => user.id !== id));
      setDocuments((items) => items.filter((document) => document.owner !== email));
      notify("Account and its saved data deleted.");
      void load();
    } catch { notify("Could not delete the account."); }
  };
  return <main className="admin-page">
    <div className="admin-heading"><div><span className="eyebrow">ADMIN CONSOLE</span><h1>Manage CVForge data.</h1><p>Users, saved CVs, and template records are managed from MongoDB.</p></div><button className="secondary compact" onClick={() => void load()}>Refresh</button></div>
    <div className="admin-stats"><article><b>{overview?.userCount ?? "—"}</b><span>Accounts</span></article><article><b>{overview?.cvCount ?? "—"}</b><span>CV documents</span></article><article><b>{overview?.customTemplateCount ?? "—"}</b><span>Custom templates</span></article><article><b>{overview?.systemTemplateCount ?? "—"}</b><span>System templates</span></article></div>
    <section className="admin-section template-designer">
      <div className="admin-section-title"><h2>Template designer</h2><p>Create a new template with a layout, visual style, and ATS setting. Publishing makes it available to all users.</p></div>
      <div className="template-designer-grid">
        <div className="template-designer-controls">
          <div className="fields two"><Input label="Template name" value={draftTemplate.name} onChange={(name) => setDraftTemplate((draft) => ({ ...draft, name }))} placeholder="e.g. Horizon" /><Input label="Category" value={draftTemplate.category} onChange={(category) => setDraftTemplate((draft) => ({ ...draft, category }))} placeholder="e.g. Professional" /></div>
          <label className="field"><span>Start from an existing template</span><select defaultValue="" onChange={(event) => { const source = templateRecords.find((item) => item.id === event.target.value); if (source) duplicateTemplate(source); event.currentTarget.value = ""; }}><option value="">Blank designer</option>{templateRecords.map((template) => <option value={template.id} key={template.id}>{template.name} · v{template.version ?? 1}</option>)}</select></label>
          <Input label="Short description" value={draftTemplate.description} onChange={(description) => setDraftTemplate((draft) => ({ ...draft, description }))} placeholder="What makes this template useful?" />
          <div className="fields two"><label className="designer-toggle"><input type="checkbox" checked={Boolean(draftTemplate.ats)} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, ats: event.target.checked }))} /> ATS-friendly</label></div>
          <div className="designer-style-row"><label className="field"><span>Accent color</span><input className="designer-color" type="color" value={draftTemplate.design?.accent ?? "#514ed0"} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, design: { ...(draft.design ?? newSystemTemplateDraft().design!), accent: event.target.value } }))} /></label><label className="field"><span>Font family</span><select value={draftTemplate.design?.font ?? "Inter"} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, design: { ...(draft.design ?? newSystemTemplateDraft().design!), font: event.target.value } }))}><option>Times New Roman</option><option>Arial</option><option>Inter</option><option>Roboto</option><option>Open Sans</option><option>Lato</option><option>Poppins</option><option>Merriweather</option></select></label></div>
          <div className="designer-ranges"><label>Section spacing <b>{(draftTemplate.design?.spacing ?? 1).toFixed(1)}x</b><input type="range" min="0.7" max="1.5" step="0.1" value={draftTemplate.design?.spacing ?? 1} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, design: { ...(draft.design ?? newSystemTemplateDraft().design!), spacing: +event.target.value } }))} /></label><label>Body size <b>{draftTemplate.design?.bodyFontSize ?? 11}px</b><input type="range" min="9" max="14" step="1" value={draftTemplate.design?.bodyFontSize ?? 11} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, design: { ...(draft.design ?? newSystemTemplateDraft().design!), bodyFontSize: +event.target.value } }))} /></label><label>Name size <b>{draftTemplate.design?.nameFontSize ?? 28}px</b><input type="range" min="14" max="36" step="1" value={draftTemplate.design?.nameFontSize ?? 28} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, design: { ...(draft.design ?? newSystemTemplateDraft().design!), nameFontSize: +event.target.value } }))} /></label></div>
          <div className="designer-advanced-grid"><label className="field"><span>Page size</span><select value={draftTemplate.pageSize} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, pageSize: event.target.value as "a4" | "letter" }))}><option value="a4">A4</option><option value="letter">US Letter</option></select></label><label className="field"><span>Page margin</span><select value={draftTemplate.pageMargin} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, pageMargin: +event.target.value }))}><option value="30">30 px</option><option value="42">42 px</option><option value="54">54 px</option></select></label><label className="field"><span>Content density</span><select value={draftTemplate.density} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, density: event.target.value as Template["density"] }))}><option value="compact">Compact</option><option value="standard">Standard</option><option value="relaxed">Relaxed</option></select></label><label className="field"><span>Structure</span><select value={draftTemplate.layout} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, layout: event.target.value as Template["layout"] }))}><option value="single">Single column</option><option value="two-column">Two columns</option></select></label><label className="field"><span>Sidebar position</span><select value={draftTemplate.sidebarPosition} disabled={draftTemplate.layout !== "two-column"} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, sidebarPosition: event.target.value as Template["sidebarPosition"] }))}><option value="left">Left</option><option value="right">Right</option></select></label><label className="field"><span>Sidebar width</span><select value={draftTemplate.sidebarWidth} disabled={draftTemplate.layout !== "two-column"} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, sidebarWidth: +event.target.value }))}><option value="28">28%</option><option value="32">32%</option><option value="36">36%</option></select></label></div>
          <div className="designer-advanced-grid"><label className="field"><span>Header alignment</span><select value={draftTemplate.headerAlign} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, headerAlign: event.target.value as Template["headerAlign"] }))}><option value="left">Left</option><option value="center">Center</option></select></label><label className="field"><span>Photo shape</span><select value={draftTemplate.photoShape} disabled={!draftTemplate.showPhoto} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, photoShape: event.target.value as Template["photoShape"] }))}><option value="circle">Circle</option><option value="rounded">Rounded</option><option value="square">Square</option></select></label><label className="designer-toggle"><input type="checkbox" checked={draftTemplate.showPhoto !== false} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, showPhoto: event.target.checked }))} /> Show profile photo</label><label className="field"><span>Divider</span><select value={draftTemplate.divider} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, divider: event.target.value as Template["divider"] }))}><option value="line">Line</option><option value="accent">Accent</option><option value="none">None</option></select></label><label className="field"><span>Skills</span><select value={draftTemplate.skillStyle} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, skillStyle: event.target.value as Template["skillStyle"] }))}><option value="chips">Chips</option><option value="plain">Plain text</option><option value="bars">Bars</option></select></label><label className="field"><span>Contact details</span><select value={draftTemplate.contactStyle} onChange={(event) => setDraftTemplate((draft) => ({ ...draft, contactStyle: event.target.value as Template["contactStyle"] }))}><option value="inline">Inline</option><option value="stacked">Stacked</option></select></label></div>
          <TemplateSectionTools template={draftTemplate} onChange={setDraftTemplate} />
          <div className="designer-actions"><button className="secondary" onClick={() => void saveDesignedTemplate("draft")}><Save size={16}/> Save draft</button><button className="primary" onClick={() => void saveDesignedTemplate("published")}><Check size={16}/> Publish template</button><button className="text-button" onClick={() => setDraftTemplate(newSystemTemplateDraft())}>New blank template</button></div>
        </div>
        <div className="designer-live-preview"><span>LIVE PREVIEW</span><TemplateThumb cv={initialCV} template={draftTemplate} /><strong>{draftTemplate.name || "Untitled template"}</strong><small>{draftTemplate.description || "Add a description for this template."}</small></div>
      </div>
    </section>
    <section className="admin-section"><div className="admin-section-title"><h2>System templates</h2><p>Changes update the database catalog immediately.</p></div><div className="admin-template-grid">{templateRecords.map((template) => <article key={template.id}><TemplateThumb cv={initialCV} template={template} /><label className="field"><span>Template name</span><input value={template.name} onChange={(event) => setTemplateRecords((items) => items.map((item) => item.id === template.id ? { ...item, name: event.target.value } : item))} /></label><label className="field"><span>Description</span><input value={template.description} onChange={(event) => setTemplateRecords((items) => items.map((item) => item.id === template.id ? { ...item, description: event.target.value } : item))} /></label><button className="secondary compact" onClick={() => void saveTemplate(template)}><Save size={14}/> Save template</button></article>)}</div></section>
    <section className="admin-section"><div className="admin-section-title"><h2>Saved CVs</h2><p>Most recent 100 account documents.</p></div><div className="admin-table">{documents.length ? documents.map((document) => <div key={document.id}><span><b>{document.title}</b><small>{document.owner}</small></span><time>{new Date(document.updatedAt).toLocaleString()}</time><button onClick={() => void deleteDocument(document.id)}><Trash2 size={15}/></button></div>) : <p>No saved CVs yet.</p>}</div></section>
    <section className="admin-section"><div className="admin-section-title"><h2>Accounts</h2><p>Manage access roles. Passwords are hashed and never displayed.</p></div><div className="admin-table">{users.map((user) => <div key={user.id}><span><b>{user.email}</b><small>Joined {new Date(user.createdAt).toLocaleDateString()}</small></span><select className="admin-role-select" aria-label={`Role for ${user.email}`} value={user.role} disabled={user.id === auth.id} onChange={(event) => void updateUserRole(user.id, event.target.value as "admin" | "user")}><option value="user">User</option><option value="admin">Admin</option></select>{user.id === auth.id ? <small className="admin-current-account">Current account</small> : <button className="admin-delete-user" aria-label={`Delete ${user.email}`} onClick={() => void deleteUser(user.id, user.email)}><Trash2 size={15}/></button>}</div>)}</div></section>
  </main>;
}

function TemplateSectionTools({ template, onChange }: { template: Template; onChange: React.Dispatch<React.SetStateAction<Template>> }) {
  const sections = template.sections ?? initialCV.sections;
  const sidebar = template.sidebarSections ?? [];
  const move = (index: number, direction: -1 | 1) => {
    const next = [...sections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange((draft) => ({ ...draft, sections: next }));
  };
  const toggle = (section: string) => onChange((draft) => ({ ...draft, sections: sections.includes(section) ? sections.filter((item) => item !== section) : [...sections, section] }));
  return <section className="designer-sections"><div><h3>Section structure</h3><p>Choose the sections that appear, set their order, and rename headings.</p></div><div className="designer-section-list">{initialCV.sections.map((section) => { const index = sections.indexOf(section); const enabled = index >= 0; return <div key={section} className={!enabled ? "is-disabled" : ""}><label><input type="checkbox" checked={enabled} onChange={() => toggle(section)} /><span>{sectionTitles[section]}</span></label>{enabled && <><input aria-label={`${sectionTitles[section]} heading`} value={template.sectionLabels?.[section] ?? ""} placeholder="Default heading" onChange={(event) => onChange((draft) => ({ ...draft, sectionLabels: { ...(draft.sectionLabels ?? {}), [section]: event.target.value } }))} /><label className="sidebar-section"><input type="checkbox" checked={sidebar.includes(section)} disabled={template.layout !== "two-column"} onChange={() => onChange((draft) => ({ ...draft, sidebarSections: sidebar.includes(section) ? sidebar.filter((item) => item !== section) : [...sidebar, section] }))} /> Side</label><button aria-label={`Move ${sectionTitles[section]} up`} onClick={() => move(index, -1)} disabled={!index}>↑</button><button aria-label={`Move ${sectionTitles[section]} down`} onClick={() => move(index, 1)} disabled={index === sections.length - 1}>↓</button></>}</div>; })}</div></section>;
}

function MiniCV() {
  return (
    <div className="mini-cv">
      <div className="mini-head">
        <div className="avatar">AM</div>
        <div>
          <b>Your name</b>
          <small>Your professional title</small>
        </div>
      </div>
      <div className="mini-rule" />
      <b className="mini-label">EXPERIENCE</b>
      <div className="mini-job">
        <b>Most recent role</b>
        <small>Company · Dates</small>
        <p></p>
        <p></p>
      </div>
      <div className="mini-job">
        <b>Previous role</b>
        <small>Company · Dates</small>
        <p></p>
      </div>
      <b className="mini-label">SKILLS</b>
      <div className="pill-row">
        <span>Product</span>
        <span>Research</span>
        <span>Figma</span>
      </div>
    </div>
  );
}

function Templates({
  cv,
  templates: allTemplates,
  choose,
  startBlank,
}: {
  cv: CVData;
  templates: Template[];
  choose: (template: Template) => void;
  startBlank: () => void;
}) {
  const [filter, setFilter] = useState("All"),
    [preview, setPreview] = useState<Template | null>(null);
  const visible = allTemplates.filter(
    (t) => filter === "All" || t.category === filter,
  );
  return (
    <main className="template-page">
      <div className="page-intro">
        <span className="eyebrow">STEP 1 OF 3</span>
        <h1>Choose your CV template</h1>
        <p>
          Every template is designed to make your experience shine. You can
          switch anytime.
        </p>
      </div>
      <div className="template-toolbar">
        <div className="filters">
          {categories.map((c) => (
            <button
              onClick={() => setFilter(c)}
              className={filter === c ? "selected" : ""}
              key={c}
            >
              {c}
            </button>
          ))}
        </div>
        <span>{visible.length} templates</span>
      </div>
      {visible.length === 0 && <div className="template-empty">
        <LayoutTemplate size={32} />
        <h2>{allTemplates.length ? "No templates in this category" : "No templates yet"}</h2>
        <p>Start a blank CV, customize its design, and save it as your own template.</p>
        <button className="primary" onClick={startBlank}>Start a blank CV <ArrowRight size={16} /></button>
      </div>}
      <div className="templates-grid">
        {visible.map((t) => (
          <article className="template-card" key={t.id}>
            <TemplateThumb cv={cv} template={t} />
            <div className="template-info">
              <div>
                <h3>{t.name}</h3>
                <p>{t.description}</p>
              </div>
              {t.ats && <span className="badge">ATS-friendly</span>}
              <div className="card-actions">
                <button onClick={() => setPreview(t)}>Preview</button>
                <button className="primary small" onClick={() => choose(t)}>
                  Use template <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {preview && (
        <div className="modal-backdrop">
          <div className="preview-modal">
            <button className="close" onClick={() => setPreview(null)}>
              <X />
            </button>
            <div className="modal-cv" style={{ "--accent": preview.design?.accent ?? cv.design.accent, "--cv-font": preview.design?.font ?? cv.design.font, "--space": preview.design?.spacing ?? cv.design.spacing, "--body-font-size": `${preview.design?.bodyFontSize ?? cv.design.bodyFontSize}px`, "--name-font-size": `${preview.design?.nameFontSize ?? cv.design.nameFontSize}px` } as React.CSSProperties}>
              <CVPreview cv={{ ...templatePreviewData(cv, preview), template: preview.style, design: preview.design ?? cv.design }} template={preview} />
            </div>
            <div>
              <span className="eyebrow">{preview.category} TEMPLATE</span>
              <h2>{preview.name}</h2>
              <p>{preview.description}</p>
              <button className="primary" onClick={() => choose(preview)}>
                Use this template <ArrowRight size={16} />
              </button>
              <button className="text-button" onClick={() => setPreview(null)}>
                Back to templates
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
function TemplateThumb({ cv, template }: { cv: CVData; template: Template }) {
  if (["careline", "salesline", "boutique", "ivory", "mercado"].includes(template.style)) return <TimelineThumbnail cv={cv} template={template} />;
  return (
    <div className={"template-thumb " + template.style} style={{ "--template-accent": template.design?.accent ?? "#514ed0" } as React.CSSProperties}>
      <ThumbDesign cv={cv} style={template.style} />
    </div>
  );
}
function ThumbDesign({ cv, style }: { cv: CVData; style: string }) {
  const photo = <div className="thumb-photo-slot">{cv.photo ? <img src={cv.photo} alt="" /> : <span>PHOTO</span>}</div>;
  const lines = <><div className="thumb-line wide" /><div className="thumb-line" /><div className="thumb-line" /></>;
  const skills = <><div className="thumb-head">SKILLS</div><div className="thumb-chips"><i /><i /><i /></div></>;
  if (style === "portrait") return <div className="portrait-thumb-page"><div className="portrait-thumb-sidebar"><div className="portrait-thumb-photo">{cv.photo ? <img src={cv.photo} alt="" /> : <UserRound aria-hidden="true" />}</div><div className="thumb-head">SKILLS</div>{lines}<div className="thumb-head">LANGUAGES</div>{lines}</div><div className="portrait-thumb-main"><div className="thumb-name">{cv.fullName || "YOUR NAME"}</div><div className="thumb-title">{cv.title || "Professional title"}</div>{lines}<div className="thumb-head">SUMMARY</div>{lines}<div className="thumb-head">EXPERIENCE</div>{lines}{lines}<div className="thumb-head">EDUCATION</div>{lines}</div></div>;
  if (style === "executive") return <><div className="thumb-executive-bar" /><div className="thumb-name">{cv.fullName}</div><div className="thumb-title">EXECUTIVE PROFILE</div>{photo}<div className="thumb-head">LEADERSHIP EXPERIENCE</div>{lines}{skills}</>;
  if (style === "creative") return <><div className="thumb-creative-block" />{photo}<div className="thumb-name">{cv.fullName}</div><div className="thumb-title">{cv.title}</div><div className="thumb-creative-rule" />{lines}<div className="thumb-head">SELECTED WORK</div>{lines}</>;
  if (style === "tech") return <><div className="thumb-tech-label">// PROFILE</div><div className="thumb-name">{cv.fullName}</div>{photo}<div className="thumb-title">{cv.title}</div><div className="thumb-tech-grid">{lines}</div><div className="thumb-head">TECH STACK</div>{skills}</>;
  if (style === "ats") return <><div className="thumb-name">{cv.fullName}</div><div className="thumb-title">{cv.title} · San Francisco, CA</div><div className="thumb-ats-rule" /><div className="thumb-head">PROFESSIONAL SUMMARY</div>{lines}<div className="thumb-head">EXPERIENCE</div>{lines}</>;
  if (style === "student") return <><div className="thumb-student-band" /><div className="thumb-name">{cv.fullName}</div>{photo}<div className="thumb-title">{cv.title}</div><div className="thumb-head">EDUCATION</div>{lines}<div className="thumb-head">PROJECTS</div>{lines}</>;
  if (style === "elegant") return <><div className="thumb-elegant-kicker">CURRICULUM VITAE</div><div className="thumb-name">{cv.fullName}</div>{photo}<div className="thumb-elegant-rule" /><div className="thumb-title">{cv.title}</div><div className="thumb-head">EXPERIENCE</div>{lines}{skills}</>;
  if (style === "corporate") return <><div className="thumb-corporate-rail" />{photo}<div className="thumb-name">{cv.fullName}</div><div className="thumb-title">{cv.title}</div><div className="thumb-head">CAREER HISTORY</div>{lines}{skills}</>;
  if (style === "twocolumn") return <><div className="thumb-side-content">{photo}<div className="thumb-side-label">CONTACT</div><div className="thumb-side-label">SKILLS</div></div><div className="thumb-main-content"><div className="thumb-name">{cv.fullName}</div><div className="thumb-title">{cv.title}</div><div className="thumb-head">EXPERIENCE</div>{lines}<div className="thumb-head">EDUCATION</div>{lines}</div></>;
  if (style === "custom") return <><div className="thumb-blank-mark">+</div><div className="thumb-blank-title">YOUR DESIGN</div><div className="thumb-blank-copy">Start with a blank canvas<br />and make it yours.</div><div className="thumb-blank-lines">{lines}</div></>;
  if (style === "classic") return <><div className="thumb-name">{cv.fullName}</div>{photo}<div className="thumb-title">{cv.title} · San Francisco</div><div className="thumb-classic-rule" /><div className="thumb-head">PROFESSIONAL EXPERIENCE</div>{lines}{skills}</>;
  return <><div className="thumb-modern-accent" />{photo}<div className="thumb-name">{cv.fullName}</div><div className="thumb-title">{cv.title}</div><div className="thumb-head">ABOUT</div>{lines}<div className="thumb-head">EXPERIENCE</div>{lines}{skills}</>;
}

function Builder({
  cv,
  setCV,
  save,
  notify,
  saveCustomTemplate,
  changeTemplate,
}: {
  cv: CVData;
  setCV: React.Dispatch<React.SetStateAction<CVData>>;
  save: () => void;
  notify: (s: string) => void;
  saveCustomTemplate: (design: DesignSettings) => void;
  changeTemplate: () => void;
}) {
  const [tab, setTab] = useState<"edit" | "preview" | "style">("edit"),
    [open, setOpen] = useState("personal"),
    [color, setColor] = useState(cv.design?.accent ?? "#2563eb"),
    [font, setFont] = useState(cv.design?.font ?? "Inter"),
    [spacing, setSpacing] = useState(cv.design?.spacing ?? 1),
    [bodyFontSize, setBodyFontSize] = useState(cv.design?.bodyFontSize ?? 11),
    [nameFontSize, setNameFontSize] = useState(cv.design?.nameFontSize ?? 28),
    [photoToEdit, setPhotoToEdit] = useState(""),
    photoReaderRef = useRef<FileReader | null>(null),
    [zoom, setZoom] = useState(1),
    previewRef = useRef<HTMLDivElement>(null),
    previewAreaRef = useRef<HTMLElement>(null);
  const update = (key: keyof CVData, value: any) =>
    setCV((p) => ({ ...p, [key]: value }));
  useEffect(() => {
    setCV((document) => ({
      ...document,
      design: { ...document.design, accent: color, font, spacing, bodyFontSize, nameFontSize },
    }));
  }, [color, font, spacing, bodyFontSize, nameFontSize, setCV]);
  const updateItem = <T extends { id: string }>(
    key: keyof CVData,
    items: T[],
    id: string,
    patch: Partial<T>,
  ) => update(key, items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const uploadPhoto = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      notify("Please choose a JPG, PNG, or WebP photo.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify("Please choose a photo smaller than 10 MB.");
      return;
    }
    photoReaderRef.current?.abort();
    const reader = new FileReader();
    photoReaderRef.current = reader;
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoToEdit(reader.result);
    };
    reader.onerror = () => notify("This photo could not be read. Please try again.");
    reader.readAsDataURL(file);
  };
  useEffect(() => () => {
    photoReaderRef.current?.abort();
  }, []);
  const addExp = () => {
    update("experience", [
      ...cv.experience,
      {
        id: uid(),
        title: "New role",
        company: "Company",
        location: "",
        start: "2024",
        end: "Present",
        description: "Describe your impact and achievements.",
      },
    ]);
    notify("Experience added.");
  };
  const removeExp = (id: string) =>
    update(
      "experience",
      cv.experience.filter((x) => x.id !== id),
    );
  const updateExp = (id: string, key: keyof Experience, value: string) =>
    update(
      "experience",
      cv.experience.map((x) => (x.id === id ? { ...x, [key]: value } : x)),
    );
  const reorder = (from: number, to: number) => {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= cv.sections.length || to >= cv.sections.length) return;
    const a = [...cv.sections];
    const [item] = a.splice(from, 1);
    a.splice(to, 0, item);
    update("sections", a);
  };
  const toggleSection = (section: string) => {
    const enabled = cv.sections.includes(section);
    setCV((document) => ({
      ...document,
      sections: document.sections.includes(section)
        ? document.sections.filter((item) => item !== section)
        : [...document.sections, section],
    }));
    if (enabled && open === section) setOpen("personal");
  };
  useEffect(() => {
    const previewArea = previewAreaRef.current;
    if (!previewArea) return;
    const handlePreviewWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      const step = event.deltaY < 0 ? 0.1 : -0.1;
      setZoom((value) => Math.min(1.5, Math.max(0.6, +(value + step).toFixed(1))));
    };
    previewArea.addEventListener("wheel", handlePreviewWheel, { passive: false });
    return () => previewArea.removeEventListener("wheel", handlePreviewWheel);
  }, []);
  const exportPDF = async () => {
    if (!cv.fullName || !cv.email) {
      notify("Add your name and email before exporting.");
      return;
    }
    const node = previewRef.current;
    if (!node) return;
    notify("Generating your PDF…");
    const previousZoom = zoom;
    setZoom(1);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const w = 210,
        h = (canvas.height * 210) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`${cv.fullName.replaceAll(" ", "-")}-CV.pdf`);
      notify("PDF generated successfully.");
    } finally {
      setZoom(previousZoom);
    }
  };
  return (
    <main className="builder">
      <div className="builder-top">
        <div>
          <button className="back" onClick={() => history.back()}>
            <ArrowLeft size={16} /> Templates
          </button>
          <span className="doc-name">
            {cv.name}
            <ChevronDown size={15} />
          </span>
          <span className="saved">Saved locally</span>
        </div>
        <div>
          <button className="secondary compact" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
          <button className="secondary compact" onClick={save}>
            <Save size={15} /> Save
          </button>
          <button className="primary compact" onClick={exportPDF}>
            <Download size={15} /> Download PDF
          </button>
        </div>
      </div>
      <div className="mobile-builder-tabs">
        {(["edit", "preview", "style"] as const).map((x) => (
          <button
            onClick={() => setTab(x)}
            className={tab === x ? "active" : ""}
            key={x}
          >
            {x === "edit" ? "Edit" : x === "preview" ? "Preview" : "Design"}
          </button>
        ))}
      </div>
      <div className="builder-columns">
        <aside className={"editor " + (tab === "edit" ? "on" : "")}>
          <div className="side-heading">
            <span>EDIT CV</span>
            <button>
              <MoreHorizontal size={18} />
            </button>
          </div>
          <fieldset className="cv-section-picker" aria-describedby="cv-section-help">
            <legend>Choose your sections</legend>
            <p id="cv-section-help">Select what to include in your CV. Hidden sections keep their content so you can add them back anytime.</p>
            <div className="cv-section-options">
              {initialCV.sections.map((section) => (
                <label key={section} className={cv.sections.includes(section) ? "is-selected" : ""}>
                  <input type="checkbox" checked={cv.sections.includes(section)} onChange={() => toggleSection(section)} />
                  <span>{sectionTitles[section]}</span>
                </label>
              ))}
            </div>
            <p className="cv-section-count" aria-live="polite">{cv.sections.length} of {initialCV.sections.length} sections selected · Personal information is always included.</p>
          </fieldset>
          <Accordion
            title="Personal information"
            open={open === "personal"}
            onClick={() => setOpen(open === "personal" ? "" : "personal")}
          >
            <div className="fields two">
              <Input
                label="Full name"
                value={cv.fullName}
                onChange={(v) => update("fullName", v)}
              />
              <Input
                label="Professional title"
                value={cv.title}
                onChange={(v) => update("title", v)}
              />
              <Input
                label="Email"
                value={cv.email}
                onChange={(v) => update("email", v)}
              />
              <Input
                label="Phone"
                value={cv.phone}
                onChange={(v) => update("phone", v)}
              />
              <Input
                label="Location"
                value={cv.location}
                onChange={(v) => update("location", v)}
              />
              <Input
                label="Website"
                value={cv.website}
                onChange={(v) => update("website", v)}
              />
              <Input
                label="LinkedIn"
                value={cv.linkedin}
                onChange={(v) => update("linkedin", v)}
              />
            </div>
            <div className="photo-upload">
              {cv.photo ? <img src={cv.photo} alt="Profile" /> : <span>{cv.fullName.split(" ").map((part) => part[0]).join("")}</span>}
              <label className="upload-control"><Upload size={14} /> {cv.photo ? "Replace photo" : "Upload profile photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { uploadPhoto(e.target.files?.[0]); e.target.value = ""; }} /></label>
              {cv.photo && <button type="button" className="edit-photo" onClick={() => setPhotoToEdit(cv.originalPhoto || cv.photo)}><PenLine size={14} /> Edit photo</button>}
              {cv.photo && <button className="remove-photo" onClick={() => { photoReaderRef.current?.abort(); setPhotoToEdit(""); setCV((document) => ({ ...document, photo: "", originalPhoto: "" })); }}>Remove</button>}
            </div>
            {photoToEdit && <PhotoEditor key={photoToEdit} source={photoToEdit} onClose={() => setPhotoToEdit("")} onApply={(photo) => { setCV((document) => ({ ...document, photo, originalPhoto: photoToEdit })); setPhotoToEdit(""); notify("Profile photo updated."); }} />}
          </Accordion>
          <Accordion
            title="Professional summary"
            visible={cv.sections.includes("summary")} open={open === "summary"}
            onClick={() => setOpen(open === "summary" ? "" : "summary")}
          >
            <textarea
              value={cv.summary}
              onChange={(e) => update("summary", e.target.value)}
            />
            <button
              className="ai-button"
              onClick={() => {
                update(
                  "summary",
                  "Results-driven " +
                    cv.title.toLowerCase() +
                    " with a proven ability to deliver thoughtful, scalable solutions. Combines technical depth with a strong focus on measurable customer and business outcomes.",
                );
                notify("Summary improved with AI.");
              }}
            >
              <Sparkles size={14} /> Improve with AI
            </button>
          </Accordion>
          <Accordion
            title={`Work experience (${cv.experience.length})`}
            visible={cv.sections.includes("experience")} open={open === "experience"}
            onClick={() => setOpen(open === "experience" ? "" : "experience")}
          >
            <div>
              {cv.experience.map((e) => (
                <div className="item-edit" key={e.id}>
                  <div className="item-edit-head">
                    <b>{e.title || "Untitled role"}</b>
                    <button onClick={() => removeExp(e.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <Input
                    label="Job title"
                    value={e.title}
                    onChange={(v) => updateExp(e.id, "title", v)}
                  />
                  <div className="fields two">
                    <Input
                      label="Company"
                      value={e.company}
                      onChange={(v) => updateExp(e.id, "company", v)}
                    />
                    <Input
                      label="Dates"
                      value={`${e.start} — ${e.end}`}
                      onChange={(v) => {
                        const [a, b] = v.split("—");
                        updateExp(e.id, "start", a?.trim() || "");
                        updateExp(e.id, "end", b?.trim() || "");
                      }}
                    />
                  </div>
                  <textarea
                    value={e.description}
                    onChange={(ev) =>
                      updateExp(e.id, "description", ev.target.value)
                    }
                  />
                </div>
              ))}
            </div>
            <button className="add-button" onClick={addExp}>
              <Plus size={15} /> Add experience
            </button>
          </Accordion>
          <Accordion
            title={`Education (${cv.education.length})`}
            visible={cv.sections.includes("education")} open={open === "education"}
            onClick={() => setOpen(open === "education" ? "" : "education")}
          >
            <div>
              {cv.education.map((e, i) => (
                <div className="item-edit" key={e.id}>
                  <div className="item-edit-head"><b>{e.degree || "Untitled education"}</b><button onClick={() => update("education", cv.education.filter((_, n) => n !== i))}><Trash2 size={14} /></button></div>
                  <Input
                    label="Degree"
                    value={e.degree}
                    onChange={(v) =>
                      update(
                        "education",
                        cv.education.map((x, n) =>
                          n === i ? { ...x, degree: v } : x,
                        ),
                      )
                    }
                  />
                  <Input
                    label="Institution"
                    value={e.school}
                    onChange={(v) =>
                      update(
                        "education",
                        cv.education.map((x, n) =>
                          n === i ? { ...x, school: v } : x,
                        ),
                      )
                    }
                  />
                  <label className="field"><span>Education details</span><textarea value={e.description ?? ""} onChange={(event) => update("education", cv.education.map((item, index) => index === i ? { ...item, description: event.target.value } : item))} placeholder="Modules, placements, or achievements (one per line)" /></label>
                  <div className="fields two">
                    <Input label="Location" value={e.location} onChange={(v) => update("education", cv.education.map((x, n) => n === i ? { ...x, location: v } : x))} />
                    <Input label="Dates" value={`${e.start} - ${e.end}`} onChange={(v) => { const [start, end] = v.split("-"); update("education", cv.education.map((x, n) => n === i ? { ...x, start: start?.trim() || "", end: end?.trim() || "" } : x)); }} />
                  </div>
                </div>
              ))}
            </div>
            <button className="add-button" onClick={() => update("education", [...cv.education, { id: uid(), degree: "New qualification", school: "Institution", location: "", start: "", end: "" }])}><Plus size={15} /> Add education</button>
          </Accordion>
          <Accordion
            title="Skills"
            visible={cv.sections.includes("skills")} open={open === "skills"}
            onClick={() => setOpen(open === "skills" ? "" : "skills")}
          >
            <div className="skill-editor">
              {cv.skills.map((s, i) => (
                <span key={s}>
                  {s}
                  <button
                    onClick={() =>
                      update(
                        "skills",
                        cv.skills.filter((_, n) => n !== i),
                      )
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <Input
              label="Add a skill"
              value=""
              placeholder="Type and press Enter"
              onChange={() => {}}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value) {
                  update("skills", [...cv.skills, e.currentTarget.value]);
                  e.currentTarget.value = "";
                }
              }}
            />
          </Accordion>
          <Accordion title={`Projects (${cv.projects.length})`} visible={cv.sections.includes("projects")} open={open === "projects"} onClick={() => setOpen(open === "projects" ? "" : "projects")}>
            <Repeater items={cv.projects} onChange={(items) => update("projects", items)} addLabel="Add project" newItem={() => ({ id: uid(), name: "New project", description: "Describe what you built and the impact it created.", tech: "", url: "", github: "" })} itemLabel={(item) => item.name || "Untitled project"}>
              {(item, change) => <>
                <Input label="Project name" value={item.name} onChange={(name) => change({ name })} />
                <textarea value={item.description} onChange={(e) => change({ description: e.target.value })} placeholder="Project description" />
                <Input label="Technologies" value={item.tech} onChange={(tech) => change({ tech })} />
                <div className="fields two"><Input label="Project URL" value={item.url || ""} onChange={(url) => change({ url })} /><Input label="GitHub URL" value={item.github || ""} onChange={(github) => change({ github })} /></div>
              </>}
            </Repeater>
          </Accordion>
          <Accordion title={`Certifications (${cv.certifications.length})`} visible={cv.sections.includes("certifications")} open={open === "certifications"} onClick={() => setOpen(open === "certifications" ? "" : "certifications")}>
            <Repeater items={cv.certifications} onChange={(items) => update("certifications", items)} addLabel="Add certification" newItem={() => ({ id: uid(), name: "New certification", organization: "Issuing organization", date: "", url: "" })} itemLabel={(item) => item.name || "Untitled certification"}>
              {(item, change) => <><Input label="Certification name" value={item.name} onChange={(name) => change({ name })} /><div className="fields two"><Input label="Organization" value={item.organization} onChange={(organization) => change({ organization })} /><Input label="Issue date" value={item.date} onChange={(date) => change({ date })} /></div><Input label="Credential URL" value={item.url} onChange={(url) => change({ url })} /></>}
            </Repeater>
          </Accordion>
          <Accordion title={`Languages (${cv.languages.length})`} visible={cv.sections.includes("languages")} open={open === "languages"} onClick={() => setOpen(open === "languages" ? "" : "languages")}>
            <Repeater items={cv.languages} onChange={(items) => update("languages", items)} addLabel="Add language" newItem={() => ({ id: uid(), language: "New language", proficiency: "Intermediate" })} itemLabel={(item) => item.language || "Untitled language"}>
              {(item, change) => <div className="fields two"><Input label="Language" value={item.language} onChange={(language) => change({ language })} /><label className="field"><span>Proficiency</span><select value={item.proficiency} onChange={(e) => change({ proficiency: e.target.value })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Fluent</option><option>Native</option></select></label></div>}
            </Repeater>
          </Accordion>
          <Accordion title={`Achievements (${cv.achievements.length})`} visible={cv.sections.includes("achievements")} open={open === "achievements"} onClick={() => setOpen(open === "achievements" ? "" : "achievements")}>
            <Repeater items={cv.achievements} onChange={(items) => update("achievements", items)} addLabel="Add achievement" newItem={() => ({ id: uid(), text: "New achievement" })} itemLabel={(item) => item.text || "Untitled achievement"}>
              {(item, change) => <textarea value={item.text} onChange={(e) => change({ text: e.target.value })} placeholder="Describe the achievement" />}
            </Repeater>
          </Accordion>
          <Accordion title={`Volunteer experience (${cv.volunteer.length})`} visible={cv.sections.includes("volunteer")} open={open === "volunteer"} onClick={() => setOpen(open === "volunteer" ? "" : "volunteer")}>
            <Repeater items={cv.volunteer} onChange={(items) => update("volunteer", items)} addLabel="Add volunteer role" newItem={() => ({ id: uid(), role: "New volunteer role", organization: "Organization", location: "", start: "", end: "", description: "" })} itemLabel={(item) => item.role || "Untitled volunteer role"}>
              {(item, change) => <><Input label="Role" value={item.role} onChange={(role) => change({ role })} /><div className="fields two"><Input label="Organization" value={item.organization} onChange={(organization) => change({ organization })} /><Input label="Location" value={item.location} onChange={(location) => change({ location })} /></div><div className="fields two"><Input label="Start date" value={item.start} onChange={(start) => change({ start })} /><Input label="End date" value={item.end} onChange={(end) => change({ end })} /></div><textarea value={item.description} onChange={(e) => change({ description: e.target.value })} placeholder="Describe your contribution" /></>}
            </Repeater>
          </Accordion>
          <Accordion title={`References (${cv.references.length})`} visible={cv.sections.includes("references")} open={open === "references"} onClick={() => setOpen(open === "references" ? "" : "references")}>
            <Repeater items={cv.references} onChange={(items) => update("references", items)} addLabel="Add reference" newItem={() => ({ id: uid(), name: "New reference", relationship: "", email: "", phone: "" })} itemLabel={(item) => item.name || "Untitled reference"}>
              {(item, change) => <><Input label="Full name" value={item.name} onChange={(name) => change({ name })} /><Input label="Relationship / title" value={item.relationship} onChange={(relationship) => change({ relationship })} /><div className="fields two"><Input label="Email" value={item.email} onChange={(email) => change({ email })} /><Input label="Phone" value={item.phone} onChange={(phone) => change({ phone })} /></div></>}
            </Repeater>
          </Accordion>
        </aside>
        <section ref={previewAreaRef} className={"preview-area " + (tab === "preview" ? "on" : "")}>
          <div className="zoom-bar">
            <span>Live preview</span>
            <div className="zoom-controls" aria-label="CV preview zoom controls">
              <span className="zoom-hint">Ctrl + scroll</span>
              <button onClick={() => setZoom((value) => Math.max(0.6, +(value - 0.1).toFixed(1)))} disabled={zoom <= 0.6} aria-label="Zoom out">−</button>
              <button className="zoom-value" onClick={() => setZoom(1)} title="Reset zoom to 100%">{Math.round(zoom * 100)}%</button>
              <button onClick={() => setZoom((value) => Math.min(1.5, +(value + 0.1).toFixed(1)))} disabled={zoom >= 1.5} aria-label="Zoom in">+</button>
            </div>
          </div>
          <div
            ref={previewRef}
            className="a4-wrap"
            style={
              {
                "--accent": color,
                "--cv-font": font,
                "--space": spacing,
                "--body-font-size": `${bodyFontSize}px`,
                "--name-font-size": `${nameFontSize}px`,
                zoom,
              } as React.CSSProperties
            }
          >
            <CVPreview cv={cv} />
          </div>
        </section>
        <aside className={"design-panel " + (tab === "style" ? "on" : "")}>
          <div className="side-heading">
            <span>DESIGN</span>
            <Palette size={18} />
          </div>
          <h3>Template</h3>
          <button
            className="template-switch"
            onClick={changeTemplate}
          >
            <TemplateThumb
              cv={cv}
              template={documentTemplate(cv)}
            />
            <span>
              {documentTemplate(cv).name}
              <small>Change template</small>
            </span>
            <ChevronDown size={16} />
          </button>
          <h3>Accent color</h3>
          <div className="colors">
            {[
              "#2563eb",
              "#0f172a",
              "#16803c",
              "#7c3aed",
              "#d5463d",
              "#64748b",
              "#111111",
            ].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ background: c }}
                className={color === c ? "chosen" : ""}
              >
                <Check size={14} />
              </button>
            ))}
          </div>
          <input
            className="color-input"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <h3>Typography</h3>
          <label className="select-label">
            Font family
            <select value={font} onChange={(e) => setFont(e.target.value)}>
              <option>Times New Roman</option><option>Arial</option>
              <option>Inter</option>
              <option>Roboto</option>
              <option>Open Sans</option>
              <option>Lato</option>
              <option>Poppins</option>
              <option>Merriweather</option>
            </select>
          </label>
          <label className="range-label">
            Section spacing <b>{spacing.toFixed(1)}x</b>
            <input
              type="range"
              min="0.7"
              max="1.5"
              step="0.1"
              value={spacing}
              onChange={(e) => setSpacing(+e.target.value)}
            />
          </label>
          <label className="range-label">
            Body text size <b>{bodyFontSize}px</b>
            <input
              type="range"
              min="9"
              max="14"
              step="1"
              value={bodyFontSize}
              onChange={(e) => setBodyFontSize(+e.target.value)}
            />
          </label>
          <label className="range-label">
            Name heading size <b>{nameFontSize}px</b>
            <input
              type="range"
              min="14"
              max="36"
              step="1"
              value={nameFontSize}
              onChange={(e) => setNameFontSize(+e.target.value)}
            />
          </label>
          <button className="save-template-button" onClick={() => saveCustomTemplate({ accent: color, font, spacing, bodyFontSize, nameFontSize })}>
            <Save size={14} /> Save this design as a template
          </button>
          <h3>Section order</h3>
          <div className="order-list">
            {cv.sections.map((s, i) => (
              <div
                draggable
                onDragStart={(e) => e.dataTransfer.setData("from", String(i))}
                onDrop={(e) => {
                  e.preventDefault();
                  reorder(+e.dataTransfer.getData("from"), i);
                }}
                onDragOver={(e) => e.preventDefault()}
                key={s}
              >
                <GripVertical size={15} />
                <span>{sectionTitles[s]}</span>
                <button aria-label={`Move ${sectionTitles[s]} up`} disabled={!i} onClick={() => reorder(i, i - 1)}>
                  <ChevronUp size={14} />
                </button>
                <button
                  aria-label={`Move ${sectionTitles[s]} down`}
                  disabled={i === cv.sections.length - 1}
                  onClick={() => reorder(i, i + 1)}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            ))}
          </div>
          <p className="hint">{cv.sections.length ? "Drag sections or use the arrows to reorder." : "Select sections in the editor to add them to your CV."}</p>
        </aside>
      </div>
    </main>
  );
}
function Accordion({
  title,
  open,
  visible = true,
  onClick,
  children,
}: {
  title: string;
  open: boolean;
  visible?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <section className="accordion">
      <button className="accordion-title" aria-expanded={open} onClick={onClick}>
        <span>{title}</span>
        {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </section>
  );
}
function Input({
  label,
  value,
  onChange,
  placeholder,
  onKeyDown,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}

function Repeater<T extends { id: string }>({
  items, onChange, newItem, addLabel, itemLabel, children,
}: {
  items: T[]; onChange: (items: T[]) => void; newItem: () => T; addLabel: string;
  itemLabel: (item: T, index: number) => string;
  children: (item: T, change: (patch: Partial<T>) => void, index: number) => React.ReactNode;
}) {
  return <>
    {items.map((item, index) => <div className="item-edit" key={item.id}>
      <div className="item-edit-head"><b>{itemLabel(item, index)}</b><button onClick={() => onChange(items.filter((_, i) => i !== index))}><Trash2 size={14} /></button></div>
      {children(item, (patch) => onChange(items.map((entry, i) => i === index ? { ...entry, ...patch } : entry)), index)}
    </div>)}
    <button className="add-button" onClick={() => onChange([...items, newItem()])}><Plus size={15} /> {addLabel}</button>
  </>;
}

// Clean only the rendered copy; unfinished form fields remain available to edit.
function cvDisplayData(cv: CVData): CVData {
  return Object.fromEntries(Object.entries(cv).map(([key, value]) => {
    if (typeof value === "string") return [key, value.trim()];
    if (!Array.isArray(value) || key === "sections") return [key, value];
    return [key, value.map((item) => typeof item === "string" ? item.trim() : Object.fromEntries(
      Object.entries(item).map(([field, text]) => [field, typeof text === "string" ? text.trim() : text]),
    )).filter((item) => typeof item === "string" ? Boolean(item) : key === "languages" ? Boolean(item.language) : Object.entries(item).some(([field, text]) => field !== "id" && Boolean(text)))];
  })) as CVData;
}
function hasSectionContent(cv: CVData, section: string) {
  const content = cv[section as keyof CVData];
  return typeof content === "string" ? Boolean(content.trim()) : Array.isArray(content) && content.length > 0;
}
function CVPreview({ cv: document, template }: { cv: CVData; template?: Template }) {
  const cv = cvDisplayData(document);
  const t = template ?? documentTemplate(cv);
  const activeSections = (template ? template.sections ?? cv.sections : cv.sections).filter((section) => hasSectionContent(cv, section));
  if (t.style === "mercado") return <MercadoCV cv={cv} template={t} sections={activeSections} />;
  if (t.style === "ivory") return <IvoryCV cv={cv} template={t} sections={activeSections} />;
  if (t.style === "boutique") return <BoutiqueCV cv={cv} template={t} sections={activeSections} />;
  if (t.style === "careline" || t.style === "salesline") return <TimelineCV cv={cv} template={t} sections={activeSections} />;
  if (t.style === "portrait") return <PortraitCV cv={cv} template={t} sections={activeSections} />;
  const sidebarSections = t.sidebarSections?.length ? t.sidebarSections : ["skills", "languages", "certifications"];
  const showPhoto = t.showPhoto !== false && Boolean(cv.photo);
  const isTwoColumn = t.layout === "two-column" || t.style === "twocolumn";
  const documentStyle = { "--page-margin": `${t.pageMargin ?? 54}px`, "--cv-background": t.design?.background ?? "#ffffff", "--secondary-accent": t.design?.secondaryAccent ?? "#697386", "--cv-heading-font": t.design?.headingFont ?? t.design?.font ?? "Inter", "--sidebar-width": `${t.sidebarWidth ?? 37}%` } as React.CSSProperties;
  const classes = `${isTwoColumn ? "cv-twocolumn" : `cv-${t.style}`} header-${t.headerAlign ?? "left"} photo-${t.photoShape ?? "circle"} divider-${t.divider ?? "line"} skills-${t.skillStyle ?? "chips"} contact-${t.contactStyle ?? "inline"} density-${t.density ?? "standard"} ${t.sidebarPosition === "right" ? "sidebar-right" : ""}`;
  const contact = [cv.email, cv.phone, cv.location, cv.website, cv.linkedin].filter(Boolean);
  const photo = showPhoto ? <div className="cv-photo-slot" aria-label="Profile photo"><img src={cv.photo} alt={`${cv.fullName || "Your"} profile`} /></div> : null;
  const identity = <>{cv.fullName && <h1>{cv.fullName}</h1>}{cv.title && <h2>{cv.title}</h2>}</>;
  const contactDetails = contact.length > 0 && <div className="contact">{contact.map((item, index) => <span key={index}>{item}</span>)}</div>;
  if (isTwoColumn) {
    const railContent = <aside className="cv-side-rail">{photo}{identity}{contactDetails}{activeSections.filter((section) => sidebarSections.includes(section)).map((section) => <CVSection key={section} type={section} cv={cv} label={t.sectionLabels?.[section]} />)}</aside>;
    const mainContent = <main className="cv-main-column">{activeSections.filter((section) => !sidebarSections.includes(section)).map((section) => <CVSection key={section} type={section} cv={cv} label={t.sectionLabels?.[section]} />)}</main>;
    return <article className={`cv-document ${classes}`} style={documentStyle}>{t.sidebarPosition === "right" ? <>{mainContent}{railContent}</> : <>{railContent}{mainContent}</>}</article>;
  }
  return <article className={`cv-document ${classes}`} style={documentStyle}>{(cv.fullName || cv.title || photo || contact.length > 0) && <header className="cv-header">{(cv.fullName || cv.title) && <div>{identity}</div>}{photo}{contactDetails}</header>}<div className="cv-body">{activeSections.map((section) => <CVSection key={section} type={section} cv={cv} label={t.sectionLabels?.[section]} />)}</div></article>;
}
// Sample content is used only for an empty gallery preview, never saved to a CV.
function templatePreviewData(cv: CVData, template: Template): CVData {
  if (!["careline", "salesline", "boutique", "ivory", "mercado"].includes(template.style) || cv.fullName || cv.title || cv.summary || cv.email || cv.phone || cv.location || cv.website || cv.linkedin || cv.photo || initialCV.sections.some((key) => Array.isArray(cv[key as keyof CVData]) && (cv[key as keyof CVData] as unknown[]).length)) return cv;
  if (template.style === "mercado") return {
    ...initialCV,
    fullName: "Isabel Mercado", title: "Marketing Manager",
    phone: "123-456-7890", email: "isabel.mercado@example.com", location: "123 Anywhere St., Any City",
    photo: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#dce5e3"/><circle cx="60" cy="44" r="23" fill="#8a9a9e"/><path d="M14 120v-9a46 46 0 0 1 92 0v9" fill="#8a9a9e"/></svg>')}`,
    skills: ["Management Skills", "Creativity", "Digital Marketing", "Negotiation", "Critical Thinking", "Leadership"],
    languages: ["Spanish", "Arabic", "English"].map((language, index) => ({ id: `mercado-language-${index}`, language, proficiency: "" })),
    achievements: [
      { id: "mercado-award-1", text: "Oct 2019 | Ingoude Company\nThe Best Employee of the Year" },
      { id: "mercado-award-2", text: "May 2015 | Timmerman Industries\nThe Best Employee of the Year" },
    ],
    experience: [
      { id: "mercado-job-1", title: "Product Design Manager", company: "Arowwai Industries", location: "", start: "2020", end: "2023", description: "Led a cross-functional team to develop customer-focused products. Coordinated research, creative direction, and launch campaigns to strengthen the brand and improve customer engagement." },
      { id: "mercado-job-2", title: "Product Design Manager", company: "Ingoude Company", location: "", start: "2019", end: "2020", description: "Managed product campaigns from concept through delivery. Worked with design and sales teams to create consistent messaging and turn customer insights into effective marketing plans." },
      { id: "mercado-job-3", title: "Product Design Manager", company: "Timmerman Industries", location: "", start: "2017", end: "2019", description: "Developed creative briefs and supported new product launches. Built strong relationships with partners and tracked campaign performance to guide ongoing improvements." },
    ],
    education: [
      { id: "mercado-education-1", degree: "Master of Business Administration", school: "Wardiere University", location: "", start: "2020", end: "2023", description: "Focused on marketing strategy, organizational leadership, and business development. Completed a research project on customer engagement and sustainable brand growth." },
      { id: "mercado-education-2", degree: "Bachelor of Business Management", school: "Wardiere University", location: "", start: "2016", end: "2020", description: "Studied management, consumer behavior, and business communication. Collaborated on practical projects covering market research, campaign planning, and team leadership." },
      { id: "mercado-education-3", degree: "Diploma in Business Studies", school: "Wardiere University", location: "", start: "2012", end: "2016", description: "Built a foundation in business operations, finance, and marketing. Developed presentation and analytical skills through coursework and collaborative case studies." },
    ],
    references: [
      { id: "mercado-reference-1", name: "Harumi Kobayashi", relationship: "Wardiere Inc. / CEO", phone: "123-456-7890", email: "harumi@example.com" },
      { id: "mercado-reference-2", name: "Bailey Dupont", relationship: "Wardiere Inc. / CEO", phone: "123-456-7890", email: "bailey@example.com" },
    ],
    design: { ...initialCV.design, ...template.design },
  };
  if (template.style === "ivory") return {
    ...initialCV,
    fullName: "Samantha Williams", title: "Senior Analyst",
    email: "samantha.williams@example.com", phone: "(555) 789-1234", location: "New York, NY, 10001",
    summary: "Senior Analyst with 5+ years of experience in data analysis, business intelligence, and process optimization. Skilled in driving operational efficiency, forecasting, and leading data-driven strategies to support business decisions and improvements. Strong communicator focused on results.",
    skills: ["Project Management", "Data-driven Decision Making", "SQL & Excel", "Financial Analysis", "Business Intelligence Tools", "Statistical Modeling"],
    experience: [
      { id: "ivory-1", title: "Senior Analyst", company: "Loom & Lantern Co.", location: "New York, NY", start: "Jan 2021", end: "Current", description: "Spearheaded data analysis and reporting for key business functions, identifying trends and providing insights to improve company performance and profitability.\nConducted in-depth market analysis and competitive benchmarking to inform strategic decisions, resulting in a 15% increase in market share within one year.\nDeveloped predictive models to forecast sales performance and customer behavior, contributing to more accurate budgeting and resource allocation." },
      { id: "ivory-2", title: "Business Analyst", company: "Willow & Wren Ltd.", location: "New York, NY", start: "Jul 2017", end: "Apr 2021", description: "Analyzed and interpreted large datasets to identify business opportunities and recommend process improvements, leading to a 20% reduction in operational costs.\nCreated detailed financial models and dashboards to track key performance indicators, enabling data-driven decisions across departments.\nWorked closely with project managers to translate customer requirements into actionable initiatives, ensuring projects were delivered on time and within budget." },
    ],
    education: [{ id: "ivory-education", degree: "Bachelor of Science, Economics", school: "New York University", location: "New York, NY", start: "Aug 2013", end: "Apr 2017", description: "" }],
    design: { ...initialCV.design, ...template.design },
  };
  if (template.style === "boutique") return {
    ...initialCV,
    fullName: "Caitlin Smith",
    title: "Customer-Focused Retail Assistant",
    email: "caitlinsmith@example.com", phone: "+44 75778 563566", location: "29 West Street, BN1 7RR Brighton",
    summary: "I am a customer-focused retail assistant with 4 years of retail experience. I quickly acquire product knowledge to offer advice tailored to customers' needs. Through upselling accessories at a fashion outlet, I consistently generated over £500 in additional daily revenue. I am seeking a role at a fashion retailer to continue delivering excellent service.",
    skills: ["Communication: Explaining products to customers, responding to complaints, and handling queries by phone, email, or live chat.", "Attention to detail: Processing transactions correctly and monitoring stock levels accurately.", "Mathematical: Managing cash, handling large amounts of money, and approving credit.", "Sales: Upselling accessories to generate £500 in additional daily revenue.", "Technical: Operating electronic cash registers, credit card processors, and Shopify."],
    languages: [{ id: "boutique-en", language: "English", proficiency: "Native" }, { id: "boutique-fr", language: "French", proficiency: "Beginner" }],
    experience: [
      { id: "boutique-1", title: "Fashion Sales Assistant", company: "TopShop", location: "London", start: "", end: "Present", description: "Received Sales Associate of the Year for successfully selling over £30k in fashion accessories.\nDeveloped knowledge of current sales promotions and events to inform customers at the entrance.\nStocked shelves and displayed products according to merchandising department layouts." },
      { id: "boutique-2", title: "Sales Associate", company: "PC World", location: "London", start: "Aug 2017", end: "Dec 2019", description: "Offered customers assistance with purchases and specialist product advice, generating daily sales of £2,000.\nServed and assisted customers with checkouts.\nAnswered phone enquiries and complaints while remaining professional at all times." },
    ],
    education: [
      { id: "boutique-education-1", degree: "BTEC Level 3 Certificate in Retail Knowledge", school: "Hither Green College", location: "London", start: "Sep 2016", end: "Jul 2017", description: "Studied stock management, security, and loss prevention in a retail business, and how store operations can be improved." },
      { id: "boutique-education-2", degree: "A-Levels in Economics, General Studies and English Languages", school: "Hayfield High School", location: "London", start: "Sep 2014", end: "Jul 2016", description: "Achieved 3 A grades." },
    ],
    design: { ...initialCV.design, ...template.design },
  };
  if (template.style === "salesline") return {
    ...initialCV,
    fullName: "Jane Smith",
    title: "Customer-Focused and Target-Oriented Sales Assistant with 9 Years of Experience",
    email: "jane_smith@example.com", phone: "+44 77345 468784", location: "19 Lights Road\nOX1 1AA Oxford",
    summary: "I am a customer-focused and target-oriented sales assistant with 9 years of experience. My key achievements include generating £1,000 in additional monthly revenue and being named the best sales assistant in my first month at Bodyshop. I excel in understanding what customers need, asking the right questions, and forming trusting relationships.",
    skills: ["Communication: Building relationships with customers to facilitate sales.", "Software: Experience with POS systems Lightspeed and Vend.", "Product knowledge: Developed comprehensive product knowledge to support customer enquiries and increase monthly sales.", "Leadership: Training new team members in company policies and service standards.", "Accounting: Processing £2,000 in daily transactions.", "Customer service: Achieved a 98% customer satisfaction rating.", "Visual merchandising: Arranging attractive displays to promote products."],
    languages: [{ id: "sales-en", language: "English", proficiency: "Native" }, { id: "sales-de", language: "German", proficiency: "Advanced" }, { id: "sales-fr", language: "French", proficiency: "Intermediate" }],
    experience: [
      { id: "sales-1", title: "Sales Assistant", company: "Debenhams", location: "Oxford", start: "Sep 2018", end: "Present", description: "Consistently achieved £2,000 daily sales targets for beauty and cosmetic treatments.\nTrained new team members in company policies and expected service standards.\nIntroduced a stock management process that improved efficiency by 25%.\nProcessed cash and card payments using the Lightspeed POS system." },
      { id: "sales-2", title: "Sales Assistant", company: "Superdrug", location: "Oxford", start: "Feb 2016", end: "Aug 2018", description: "Regularly exceeded sales targets by 20%.\nArranged attractive displays to promote products.\nRecorded deliveries and stored stock appropriately in the warehouse.\nAdvised customers on skincare regimes." },
      { id: "sales-3", title: "Sales Assistant", company: "Bodyshop", location: "Oxford", start: "Mar 2012", end: "Jan 2015", description: "Named best sales assistant in my first month for generating £1,000 in revenue.\nReceived a 98% customer satisfaction rating.\nProcessed transactions using the Vend POS system.\nAssisted with promotions and product displays." },
    ],
    education: [{ id: "sales-education", degree: "Level 2 Certificate in Retail Skills", school: "City & Guilds", location: "London", start: "Aug 2011", end: "Sep 2011", description: "Displaying stock to promote products.\nKeeping stock on sale at required levels.\nDemonstrating products in a retail environment.\nHelping customers choose products.\nCarrying out promotional campaigns." }],
    design: { ...initialCV.design, ...template.design },
  };
  return {
    ...initialCV,
    fullName: "Joanna Brown",
    title: "Registered Nurse with 8 Years of Experience in Geriatric Care",
    email: "j.brown@example.com", phone: "0123 456 7890", location: "123 Beston Fields Drive\nNG9 3DB Beeston",
    summary: "Registered Nurse with 8 years of experience caring for elderly patients with complex health needs. Experienced in supporting patients with acute and chronic conditions, delivering emergency care, and working with multidisciplinary teams to provide compassionate, person-centred care.",
    skills: ["ICU: Delivering Advanced Cardiac Life Support (ACLS) to patients with chronic health conditions.", "Leadership: Supervising nursing assistants and organising patient care.", "Empathy: Navigating sensitive situations with care and understanding.", "Communication: Sharing clear information with patients and families.", "Time management: Prioritising medication, observations, and patient evaluations."],
    experience: [
      { id: "sample-1", title: "Senior Nurse", company: "Woodfield Hospital", location: "Ipswich", start: "Apr 2018", end: "Present", description: "Provided daily care for elderly patients after surgery, monitoring vital signs and administering medication.\nCollaborated with doctors to develop long-term care plans following hospital stays.\nSupervised nursing assistants working on the unit." },
      { id: "sample-2", title: "Registered Nurse", company: "Ashfield Care Home", location: "Kent", start: "Feb 2014", end: "Mar 2018", description: "Worked with the unit manager to care for frail and elderly patients with complex health needs.\nAdministered medication safely and maintained accurate patient records.\nCoordinated equipment and supplies to support the nursing team." },
      { id: "sample-3", title: "Healthcare Assistant", company: "Chase Care Home", location: "Suffolk", start: "Nov 2013", end: "Jan 2014", description: "Supported the safety and wellbeing of elderly people with dementia.\nHelped deliver compassionate end-of-life care alongside specialist teams." },
    ],
    education: [{ id: "sample-education", degree: "Adult Nursing BSc Hons: 2:1", school: "University of London", location: "London", start: "Sep 2010", end: "Jul 2013", description: "Modules included integrated approaches to complex care, prescribing principles, acute care management, and collaborative practice." }],
    design: { ...initialCV.design, ...template.design },
  };
}
function TimelineThumbnail({ cv, template }: { cv: CVData; template: Template }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.28);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.max(0.01, Math.min((entry.contentRect.width - 16) / 620, (entry.contentRect.height - 16) / 877))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const previewCV = templatePreviewData(cv, template);
  return <div ref={ref} className={`template-thumb careline ${template.style}`} aria-label={`${template.name} preview`}>
    <div className="careline-thumb-frame" style={{ width: 620 * scale, height: 877 * scale }}>
      <div className="careline-thumb-document" style={{ transform: `scale(${scale})` }}>
        <CVPreview cv={{ ...previewCV, design: { ...previewCV.design, ...template.design } }} template={template} />
      </div>
    </div>
  </div>;
}
function CarelineBullets({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).map((line) => line.trim().replace(/^[\u2022*\-]\s*/, "")).filter(Boolean);
  return lines.length ? <ul>{lines.map((line, index) => <li key={index}>{line}</li>)}</ul> : null;
}
function TimelineCV({ cv, template, sections }: { cv: CVData; template: Template; sections: string[] }) {
  const isSalesline = template.style === "salesline";
  const sidebarSections = template.sidebarSections ?? ["skills", "languages", "certifications"];
  const details = [["Name", cv.fullName], ["Email address", cv.email], ["Phone number", cv.phone], ["Address", cv.location], ["Website", cv.website], ["LinkedIn", cv.linkedin]].filter(([label, value]) => value.trim() && (!isSalesline || label !== "Name"));
  const renderSection = (type: string) => {
    const content = cv[type as keyof CVData];
    if (typeof content === "string" ? !content.trim() : !Array.isArray(content) || !content.length) return null;
    const label = template.sectionLabels?.[type] || sectionTitles[type];
    if (isSalesline && type === "languages") return <section className="cv-section" key={type}><h3>{label}</h3><ul className="salesline-languages">{cv.languages.map((item) => {
      const level = ({ Beginner: 1, Intermediate: 3, Advanced: 4, Fluent: 5, Native: 5 } as Record<string, number>)[item.proficiency] ?? 0;
      return <li key={item.id}><span>{item.language}</span>{item.proficiency && <span className="salesline-rating" role="img" aria-label={item.proficiency} title={item.proficiency}>{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < level ? "filled" : ""} aria-hidden="true" />)}</span>}</li>;
    })}</ul></section>;
    if (type === "skills") return <section className="cv-section" key={type}><h3>{label}</h3><ul className="careline-skills">{cv.skills.map((skill, index) => <li key={index}>{skill}</li>)}</ul></section>;
    if (type === "experience" || type === "education") {
      const entries = type === "experience"
        ? cv.experience.map((item) => ({ ...item, heading: item.title, organization: item.company }))
        : cv.education.map((item) => ({ ...item, heading: item.degree, organization: item.school }));
      return <section className="cv-section" key={type}><h3>{label}</h3>{entries.map((item) => <div className="careline-entry" key={item.id}>
        <time>{[item.start, item.end].filter(Boolean).join(" - ")}</time>
        <div><h4>{item.heading}</h4><p className="careline-organization">{[item.organization, item.location].filter(Boolean).join(", ")}</p><CarelineBullets text={item.description ?? ""} /></div>
      </div>)}</section>;
    }
    return <CVSection key={type} type={type} cv={cv} label={label} />;
  };
  const style = {
    "--accent": cv.design.accent, "--cv-font": cv.design.font,
    "--space": cv.design.spacing, "--body-font-size": `${cv.design.bodyFontSize}px`, "--name-font-size": `${cv.design.nameFontSize}px`,
    "--careline-sidebar": `${template.sidebarWidth ?? 31.5}%`,
    "--careline-background": cv.design.background ?? "#ffffff",
  } as React.CSSProperties;
  const heading = (cv.fullName || cv.title) && <header className="careline-header">{cv.fullName && <h1>{cv.fullName}</h1>}{cv.title && <p>{cv.title}</p>}</header>;
  return <article className={`cv-document cv-careline${isSalesline ? " cv-salesline" : ""}`} style={style}>
    {!isSalesline && <><div className="careline-top-accent" aria-hidden="true" />{heading}</>}
    <div className={`careline-columns${template.sidebarPosition === "right" ? " careline-sidebar-right" : ""}`}>
      <aside className="careline-sidebar">
        {isSalesline && heading}
        {details.length > 0 && <section className="cv-section careline-details"><h3>Personal details</h3><dl>{details.map(([label, value]) => <div key={label}><dt>{isSalesline ? <><span className="sr-only">{label}</span>{label === "Email address" ? <Mail aria-hidden="true" /> : label === "Phone number" ? <Phone aria-hidden="true" /> : label === "Address" ? <MapPin aria-hidden="true" /> : <FileText aria-hidden="true" />}</> : label}</dt><dd>{value}</dd></div>)}</dl></section>}
        {sections.filter((section) => sidebarSections.includes(section)).map(renderSection)}
      </aside>
      <div className="careline-main">{sections.filter((section) => !sidebarSections.includes(section)).map(renderSection)}</div>
    </div>
  </article>;
}
function BoutiqueCV({ cv, template, sections }: { cv: CVData; template: Template; sections: string[] }) {
  const sidebarSections = template.sidebarSections ?? ["languages", "skills", "certifications"];
  const contact = [
    { label: "Email", value: cv.email, icon: Mail },
    { label: "Phone", value: cv.phone, icon: Phone },
    { label: "Address", value: cv.location, icon: MapPin },
    { label: "Website", value: cv.website, icon: FileText },
    { label: "LinkedIn", value: cv.linkedin, icon: FileText },
  ].filter((item) => item.value.trim());
  const renderSection = (type: string) => {
    const content = cv[type as keyof CVData];
    if (typeof content === "string" ? !content.trim() : !Array.isArray(content) || !content.length) return null;
    const label = template.sectionLabels?.[type] || sectionTitles[type];
    if (type === "languages") return <section className="cv-section" key={type}><h3>{label}</h3><ul className="boutique-languages">{cv.languages.map((item) => {
      const level = ({ Beginner: 20, Intermediate: 60, Advanced: 80, Fluent: 100, Native: 100 } as Record<string, number>)[item.proficiency] ?? 0;
      return <li key={item.id}><span>{item.language}</span>{item.proficiency && <span className="boutique-language-bar" role="img" aria-label={item.proficiency} title={item.proficiency}><i style={{ width: `${level}%` }} /></span>}</li>;
    })}</ul></section>;
    if (type === "skills") return <section className="cv-section" key={type}><h3>{label}</h3><ul className="boutique-qualities">{cv.skills.map((skill, index) => <li key={index}>{skill}</li>)}</ul></section>;
    if (type === "experience" || type === "education") {
      const entries = type === "experience"
        ? cv.experience.map((item) => ({ ...item, heading: item.title, organization: item.company }))
        : cv.education.map((item) => ({ ...item, heading: item.degree, organization: item.school }));
      return <section className="cv-section" key={type}><h3>{label}</h3>{entries.map((item) => <div className="boutique-entry" key={item.id}>
        <div className="boutique-entry-heading"><h4>{item.heading}</h4><time>{[item.start, item.end].filter(Boolean).join(" - ")}</time></div>
        <p className="boutique-organization">{[item.organization, item.location].filter(Boolean).join(", ")}</p>
        <CarelineBullets text={item.description ?? ""} />
      </div>)}</section>;
    }
    return <CVSection key={type} type={type} cv={cv} label={label} />;
  };
  const style = {
    "--accent": cv.design.accent, "--cv-font": cv.design.font,
    "--space": cv.design.spacing, "--body-font-size": `${cv.design.bodyFontSize}px`, "--name-font-size": `${cv.design.nameFontSize}px`,
    "--boutique-sidebar-width": `${template.sidebarWidth ?? 33.5}%`,
    "--boutique-sidebar-color": cv.design.secondaryAccent ?? "#282830",
    "--boutique-background": cv.design.background ?? "#ffffff",
  } as React.CSSProperties;
  return <article className={`cv-document cv-careline cv-boutique${template.sidebarPosition === "right" ? " boutique-sidebar-right" : ""}`} style={style}>
    {(cv.fullName || cv.title || contact.length > 0) && <header className="boutique-header">{cv.fullName && <h1>{cv.fullName}</h1>}{cv.title && <p>{cv.title}</p>}{contact.length > 0 && <div className="boutique-contact">{contact.map(({ label, value, icon: Icon }) => <div key={label}><Icon aria-hidden="true" /><span className="sr-only">{label}: </span><span>{value}</span></div>)}</div>}</header>}
    <div className="boutique-columns"><aside className="boutique-sidebar">{sidebarSections.filter((section) => sections.includes(section)).map(renderSection)}</aside><div className="boutique-main">{sections.filter((section) => !sidebarSections.includes(section)).map(renderSection)}</div></div>
  </article>;
}
function MercadoCV({ cv, template, sections }: { cv: CVData; template: Template; sections: string[] }) {
  const sidebarSections = template.sidebarSections ?? ["skills", "languages", "achievements", "certifications"];
  const contact = [["Phone", cv.phone], ["Email", cv.email], ["Address", cv.location], ["Website", cv.website], ["LinkedIn", cv.linkedin]].filter(([, value]) => value);
  const renderSection = (type: string) => {
    const label = template.sectionLabels?.[type] || sectionTitles[type];
    if (type === "experience" || type === "education") {
      const entries = type === "experience"
        ? cv.experience.map((item) => ({ ...item, heading: item.title, organization: item.company }))
        : cv.education.map((item) => ({ ...item, heading: item.degree, organization: item.school }));
      return <section className="cv-section" key={type}><h3>{label}</h3>{entries.map((item) => <div className="mercado-entry" key={item.id}>
        {(item.start || item.end || item.organization || item.location) && <div className="mercado-entry-meta">
          {(item.start || item.end) && <time>{[item.start, item.end].filter(Boolean).join(" – ")}</time>}
          {item.organization && <p>{item.organization}</p>}{item.location && <p>{item.location}</p>}
        </div>}
        {(item.heading || item.description) && <div className="mercado-entry-body">{item.heading && <h4>{item.heading}</h4>}{item.description && <p>{item.description}</p>}</div>}
      </div>)}</section>;
    }
    if (type === "skills" || type === "languages" || type === "achievements") {
      const items = type === "skills" ? cv.skills : type === "languages" ? cv.languages.map((item) => [item.language, item.proficiency].filter(Boolean).join(" · ")) : cv.achievements.map((item) => item.text);
      return <section className={`cv-section mercado-${type}`} key={type}><h3>{label}</h3><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></section>;
    }
    if (type === "references") return <section className="cv-section" key={type}><h3>{label}</h3><div className="mercado-references">{cv.references.map((item) => <div key={item.id}>
      {item.name && <h4>{item.name}</h4>}{item.relationship && <p>{item.relationship}</p>}
      {item.phone && <p><b>Phone:</b> {item.phone}</p>}{item.email && <p><b>Email:</b> {item.email}</p>}
    </div>)}</div></section>;
    return <CVSection key={type} type={type} cv={cv} label={label} />;
  };
  const style = {
    "--accent": cv.design.accent, "--cv-font": cv.design.font,
    "--cv-heading-font": cv.design.headingFont ?? cv.design.font,
    "--space": cv.design.spacing, "--body-font-size": `${cv.design.bodyFontSize}px`, "--name-font-size": `${cv.design.nameFontSize}px`,
    "--mercado-sidebar-width": `${template.sidebarWidth ?? 35}%`, "--mercado-muted": cv.design.secondaryAccent ?? "#747474", "--mercado-background": cv.design.background ?? "#fff",
  } as React.CSSProperties;
  return <article className={`cv-document cv-careline cv-mercado${template.sidebarPosition === "right" ? " mercado-sidebar-right" : ""}`} style={style}>
    <aside className="mercado-sidebar">
      {template.showPhoto !== false && cv.photo && <div className={`mercado-photo photo-${template.photoShape ?? "circle"}`}><img src={cv.photo} alt={`${cv.fullName || "Your"} profile`} /></div>}
      {contact.length > 0 && <section className="cv-section mercado-contact"><h3>{template.sectionLabels?.contact || "Contact"}</h3><dl>{contact.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}
      {sections.filter((section) => sidebarSections.includes(section)).map(renderSection)}
    </aside>
    <div className="mercado-main">
      {(cv.fullName || cv.title) && <header className="mercado-header">{cv.fullName && <h1>{cv.fullName}</h1>}{cv.title && <p>{cv.title}</p>}</header>}
      {sections.filter((section) => !sidebarSections.includes(section)).map(renderSection)}
    </div>
  </article>;
}
function IvoryCV({ cv, template, sections }: { cv: CVData; template: Template; sections: string[] }) {
  const sidebarSections = template.sidebarSections ?? ["summary", "skills", "languages", "certifications"];
  const renderSection = (type: string) => {
    const content = cv[type as keyof CVData];
    if (typeof content === "string" ? !content.trim() : !Array.isArray(content) || !content.length) return null;
    const label = template.sectionLabels?.[type] || sectionTitles[type];
    if (type === "skills") return <section className="cv-section" key={type}><h3>{label}</h3><ul className="ivory-skills">{cv.skills.map((skill, index) => <li key={index}>{skill}</li>)}</ul></section>;
    if (type === "experience" || type === "education") {
      const entries = type === "experience"
        ? cv.experience.map((item) => ({ ...item, heading: item.title, subtitle: [item.company, item.location].filter(Boolean).join(" - ") }))
        : cv.education.map((item) => ({ ...item, heading: item.school, subtitle: [item.location, item.degree].filter(Boolean).join(": ") }));
      return <section className="cv-section" key={type}><h3>{label}</h3>{entries.map((item) => <div className="ivory-entry" key={item.id}>
        <div className="ivory-entry-heading"><h4>{item.heading}</h4><time>{[item.start, item.end].filter(Boolean).map((date, index) => <span key={index}>{date}</span>)}</time></div>
        <p>{item.subtitle}</p><CarelineBullets text={item.description ?? ""} />
      </div>)}</section>;
    }
    return <CVSection key={type} type={type} cv={cv} label={label} />;
  };
  const style = {
    "--accent": cv.design.accent, "--cv-font": cv.design.font,
    "--space": cv.design.spacing, "--body-font-size": `${cv.design.bodyFontSize}px`, "--name-font-size": `${cv.design.nameFontSize}px`,
    "--ivory-sidebar-width": `${template.sidebarWidth ?? 34.5}%`, "--ivory-ink": cv.design.secondaryAccent ?? "#17151d", "--ivory-background": cv.design.background ?? "#fff",
  } as React.CSSProperties;
  const showPhoto = template.showPhoto !== false && Boolean(cv.photo);
  const contact = [cv.location, cv.email, cv.phone, cv.website, cv.linkedin].filter(Boolean);
  return <article className={`cv-document cv-careline cv-ivory${template.sidebarPosition === "right" ? " ivory-sidebar-right" : ""}`} style={style}>
    {(showPhoto || cv.fullName || cv.title || contact.length > 0) && <header className={`ivory-header${showPhoto ? "" : " ivory-no-photo"}`}>
      {showPhoto && <div className={`ivory-photo photo-${template.photoShape ?? "square"}`}><img src={cv.photo} alt={`${cv.fullName || "Your"} profile`} /></div>}
      {(cv.fullName || cv.title || contact.length > 0) && <div className="ivory-intro">{cv.fullName && <h1>{cv.fullName}</h1>}{cv.title && <h2>{cv.title}</h2>}{contact.length > 0 && <div className="ivory-contact">{contact.map((item, index) => <span key={index}>{item}</span>)}</div>}</div>}
    </header>}
    <div className="ivory-columns"><aside className="ivory-sidebar">{sections.filter((section) => sidebarSections.includes(section)).map(renderSection)}</aside><div className="ivory-main">{sections.filter((section) => !sidebarSections.includes(section)).map(renderSection)}</div></div>
  </article>;
}
function PortraitCV({ cv, template, sections }: { cv: CVData; template: Template; sections: string[] }) {
  const sidebarSections = template.sidebarSections ?? ["skills", "languages"];
  const renderSection = (section: string) => {
    const content = cv[section as keyof CVData];
    if (typeof content === "string" ? !content.trim() : !Array.isArray(content) || !content.length) return null;
    return <PortraitSection key={section} type={section} cv={cv} label={template.sectionLabels?.[section]} />;
  };
  return <article className="cv-document cv-portrait" style={{ "--portrait-sidebar-width": `${template.sidebarWidth ?? 38}%` } as React.CSSProperties}>
    <aside className="portrait-sidebar">
      {template.showPhoto !== false && cv.photo && <div className="portrait-photo"><img src={cv.photo} alt={`${cv.fullName || "Your"} profile`} /></div>}
      {sections.filter((section) => sidebarSections.includes(section)).map(renderSection)}
    </aside>
    <div className="portrait-main">
      {(cv.fullName || cv.title || cv.email || cv.location || cv.phone || cv.website || cv.linkedin) && <header className="portrait-header">
        {cv.fullName && <h1>{cv.fullName}</h1>}
        {cv.title && <p>{cv.title}</p>}
        <div className="portrait-contact">
          {cv.email && <span><Mail aria-hidden="true" /><span>{cv.email}</span></span>}
          {cv.location && <span><MapPin aria-hidden="true" /><span>{cv.location}</span></span>}
          {cv.phone && <span><Phone aria-hidden="true" /><span>{cv.phone}</span></span>}
          {[cv.website, cv.linkedin].filter(Boolean).map((link) => <span key={link}>{link}</span>)}
        </div>
      </header>}
      {sections.filter((section) => !sidebarSections.includes(section)).map(renderSection)}
    </div>
  </article>;
}
function PortraitSection({ type, cv, label }: { type: string; cv: CVData; label?: string }) {
  const heading = label || (type === "summary" ? "Summary" : sectionTitles[type]);
  if (type === "skills") return <section className="cv-section"><h3>{heading}</h3><ul className="portrait-skills">{cv.skills.map((skill, index) => <li key={index}>{skill}</li>)}</ul></section>;
  if (type === "languages") return <section className="cv-section"><h3>{heading}</h3><ul className="portrait-languages">{cv.languages.map((item) => <li key={item.id}>{item.language}{item.proficiency && <span>{item.proficiency}</span>}</li>)}</ul></section>;
  if (type === "experience") return <section className="cv-section"><h3>{heading}</h3>{cv.experience.map((item) => <div className="portrait-entry" key={item.id}><h4>{[item.title, item.company, item.location].filter(Boolean).join(", ")}</h4><time>{[item.start, item.end].filter(Boolean).join(" – ")}</time>{item.description.trim() && <ul>{item.description.split(/\r?\n/).map((line) => line.trim().replace(/^[•*\-]\s*/, "")).filter(Boolean).map((line, index) => <li key={index}>{line}</li>)}</ul>}</div>)}</section>;
  if (type === "education") return <section className="cv-section"><h3>{heading}</h3>{cv.education.map((item) => <div className="portrait-entry" key={item.id}><h4>{[item.degree, item.school, item.location].filter(Boolean).join(", ")}</h4><time>{[item.start, item.end].filter(Boolean).join(" – ")}</time><CarelineBullets text={item.description ?? ""} /></div>)}</section>;
  return <CVSection type={type} cv={cv} label={heading} />;
}
function CVSection({ type, cv, label }: { type: string; cv: CVData; label?: string }) {
  if (!hasSectionContent(cv, type)) return null;
  const heading = label || sectionTitles[type];
  if (type === "summary")
    return (
      <section className="cv-section">
        <h3>{heading}</h3>
        <p>{cv.summary}</p>
      </section>
    );
  if (type === "experience")
    return (
      <section className="cv-section">
        <h3>{heading}</h3>
        {cv.experience.map((e) => (
          <div className="cv-entry" key={e.id}>
            <div>
              {e.title && <h4>{e.title}</h4>}
              {(e.company || e.location) && <b>{[e.company, e.location].filter(Boolean).join(" · ")}</b>}
            </div>
            {(e.start || e.end) && <time>{[e.start, e.end].filter(Boolean).join(" — ")}</time>}
            {e.description && <p>{e.description}</p>}
          </div>
        ))}
      </section>
    );
  if (type === "education")
    return (
      <section className="cv-section">
        <h3>{heading}</h3>
        {cv.education.map((e) => (
          <div className="cv-entry compact-entry" key={e.id}>
            <div>
              {e.degree && <h4>{e.degree}</h4>}
              {(e.school || e.location) && <b>{[e.school, e.location].filter(Boolean).join(" · ")}</b>}
            </div>
            {(e.start || e.end) && <time>{[e.start, e.end].filter(Boolean).join(" — ")}</time>}
            {e.description && <p>{e.description}</p>}
          </div>
        ))}
      </section>
    );
  if (type === "skills")
    return (
      <section className="cv-section">
        <h3>{heading}</h3>
        <div className="cv-skills">
          {cv.skills.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </section>
    );
  if (type === "projects")
    return <section className="cv-section"><h3>{heading}</h3>{cv.projects.map((p) => <div className="cv-entry project" key={p.id}>{p.name && <h4>{p.name}</h4>}{p.description && <p>{p.description}</p>}{p.tech && <b>{p.tech}</b>}{p.url && <span className="cv-link">{p.url}</span>}{p.github && <span className="cv-link">{p.github}</span>}</div>)}</section>;
  if (type === "certifications")
    return <section className="cv-section"><h3>{heading}</h3>{cv.certifications.map((item) => <div className="cv-entry compact-entry" key={item.id}><div>{item.name && <h4>{item.name}</h4>}{item.organization && <b>{item.organization}</b>}{item.url && <span className="cv-link">{item.url}</span>}</div>{item.date && <time>{item.date}</time>}</div>)}</section>;
  if (type === "languages")
    return <section className="cv-section"><h3>{heading}</h3><div className="cv-skills">{cv.languages.map((item) => <span key={item.id}>{[item.language, item.proficiency].filter(Boolean).join(" · ")}</span>)}</div></section>;
  if (type === "achievements")
    return <section className="cv-section"><h3>{heading}</h3><ul className="cv-list">{cv.achievements.map((item) => <li key={item.id}>{item.text}</li>)}</ul></section>;
  if (type === "volunteer")
    return <section className="cv-section"><h3>{heading}</h3>{cv.volunteer.map((item) => <div className="cv-entry" key={item.id}><div>{item.role && <h4>{item.role}</h4>}{(item.organization || item.location) && <b>{[item.organization, item.location].filter(Boolean).join(" · ")}</b>}</div>{(item.start || item.end) && <time>{[item.start, item.end].filter(Boolean).join(" — ")}</time>}{item.description && <p>{item.description}</p>}</div>)}</section>;
  if (type === "references")
    return <section className="cv-section"><h3>{heading}</h3>{cv.references.map((item) => <div className="cv-entry compact-entry" key={item.id}><div>{item.name && <h4>{item.name}</h4>}{item.relationship && <b>{item.relationship}</b>}{(item.email || item.phone) && <p>{[item.email, item.phone].filter(Boolean).join(" · ")}</p>}</div></div>)}</section>;
  return null;
}

function Dashboard({
  cv,
  go,
  save,
  auth,
}: {
  cv: CVData;
  go: (s: string) => void;
  save: () => void;
  auth: AuthUser | null;
}) {
  const [stats, setStats] = useState({ cvCount: 0, customTemplateCount: 0 });
  useEffect(() => {
    if (!auth) return;
    void apiRequest<{ cvCount: number; customTemplateCount: number }>("/dashboard").then(setStats).catch(() => {});
  }, [auth]);
  const selectedTemplate = documentTemplate(cv);
  return (
    <main className="dashboard">
      <div className="dash-welcome">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>Welcome back{auth ? `, ${auth.email.split("@")[0]}` : ""}.</h1>
          <p>Make your next career move feel inevitable.</p>
        </div>
        <button className="primary" onClick={() => go("templates")}>
          <Plus size={17} /> Create new CV
        </button>
      </div>
      <div className="dash-stats">
        <article>
          <FileText />
          <b>{stats.cvCount}</b>
          <span>Saved CVs</span>
        </article>
        <article>
          <Sparkles />
          <b>{stats.customTemplateCount}</b>
          <span>Saved templates</span>
        </article>
        <article>
          <LayoutTemplate />
          <b>{cv.sections.length}</b>
          <span>Active sections</span>
        </article>
      </div>
      <div className="dash-section-head">
        <div>
          <h2>My CVs</h2>
          <p>Pick up where you left off.</p>
        </div>
        <button className="text-button">
          View all <ArrowRight size={14} />
        </button>
      </div>
      <div className="my-cvs">
        <article className="cv-saved-card">
          <TemplateThumb
            cv={cv}
            template={selectedTemplate}
          />
          <div>
            <span className="badge">Recently edited</span>
            <h3>{cv.name}</h3>
            <p>
              {auth ? "Synced to your account" : "Saved locally"} · {selectedTemplate.name}
            </p>
            <div>
              <button
                className="secondary compact"
                onClick={() => go("builder")}
              >
                <PenLine size={14} /> Edit
              </button>
              <button className="icon-button" onClick={save}>
                <Copy size={15} />
              </button>
              <button className="icon-button">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </article>
        <button className="new-cv-card" onClick={() => go("templates")}>
          <span>
            <Plus size={22} />
          </span>
          <b>Create another version</b>
          <small>Tailor your story for a role</small>
        </button>
      </div>
    </main>
  );
}
function ATS({ cv }: { cv: CVData }) {
  const [job, setJob] = useState(""),
    [ran, setRan] = useState(false);
  const keywords = useMemo(
    () =>
      job
        .toLowerCase()
        .split(/\W+/)
        .filter((x) => x.length > 3),
    [job],
  );
  const matches = keywords.filter(
    (k) =>
      cv.skills.some((s) => s.toLowerCase().includes(k)) ||
      cv.summary.toLowerCase().includes(k),
  );
  const contactCount = [cv.fullName, cv.email, cv.phone, cv.location].filter(Boolean).length;
  const atsScore = Math.min(100, Math.round((contactCount / 4) * 25 + Math.min(cv.skills.length, 8) * 4 + Math.min(cv.experience.length, 4) * 8 + (cv.summary ? 15 : 0)));
  const jobScore = keywords.length ? Math.round((matches.length / keywords.length) * 100) : atsScore;
  return (
    <main className="analysis-page">
      <div className="page-intro">
        <span className="eyebrow">GET MORE INTERVIEWS</span>
        <h1>ATS checker</h1>
        <p>
          See how your CV performs against the systems that decide who gets
          seen.
        </p>
      </div>
      <div className="checker-grid">
        <section className="checker-card">
          <h2>Match it to a role</h2>
          <p>
            Paste a job description to uncover the right keywords and
            opportunities.
          </p>
          <textarea
            placeholder="Paste the job description here…"
            value={job}
            onChange={(e) => setJob(e.target.value)}
          />
          <button className="primary" onClick={() => setRan(true)}>
            <Search size={16} /> Analyze my CV
          </button>
        </section>
        <section className="score-card">
          <div className="ring">
            <b>{ran ? jobScore : atsScore}</b>
            <span>/ 100</span>
          </div>
          <h2>{ran ? "Role match" : "Current CV score"}</h2>
          <p>
            Your score updates from the information currently in your CV.
          </p>
          <div className="score-bars">
            <Bar title="Contact details" value={contactCount * 25} />
            <Bar title="Skills & keywords" value={ran ? jobScore : Math.min(100, cv.skills.length * 12)} />
            <Bar title="Experience coverage" value={Math.min(100, cv.experience.length * 25)} />
          </div>
        </section>
      </div>
      <section className="recommendations">
        <h2>Recommended next steps</h2>
        <div>
          <article>
            <CircleCheck />
            <span>
              <b>Great contact information</b>
              <small>Your details are complete and easily readable.</small>
            </span>
          </article>
          <article>
            <Sparkles />
            <span>
              <b>Add more measurable results</b>
              <small>
                Use numbers to show the scale and impact of your work.
              </small>
            </span>
          </article>
          <article>
            <Zap />
            <span>
              <b>
                {ran && matches.length
                  ? "Use matching keywords"
                  : "Consider adding Python"}
              </b>
              <small>
                {ran && matches.length
                  ? `We found ${matches.length} strong keywords from this role.`
                  : "It appears often in roles similar to yours."}
              </small>
            </span>
          </article>
        </div>
      </section>
    </main>
  );
}
function Bar({ title, value }: { title: string; value: number }) {
  return (
    <div className="bar">
      <span>
        {title}
        <b>{value}%</b>
      </span>
      <i>
        <i style={{ width: value + "%" }} />
      </i>
    </div>
  );
}
function Cover({ cv, notify }: { cv: CVData; notify: (s: string) => void }) {
  const [job, setJob] = useState(""),
    [company, setCompany] = useState(""),
    [letter, setLetter] = useState("");
  const generate = () => {
    setLetter(
      `Dear ${company} hiring team,\n\nI am excited to apply for the ${job} opportunity. As a ${cv.title} with a record of delivering thoughtful, high-impact work, I am drawn to the chance to contribute to ${company}.\n\nMy experience at ${cv.experience[0]?.company || "my current company"} has taught me how to pair strong craft with customer empathy and measurable results. I would love to bring that perspective, curiosity, and momentum to your team.\n\nThank you for your consideration. I look forward to discussing how I can contribute.\n\nSincerely,\n${cv.fullName}`,
    );
    notify("Cover letter generated.");
  };
  return (
    <main className="cover-page">
      <div className="page-intro">
        <span className="eyebrow">AI WRITING ASSISTANT</span>
        <h1>Write a cover letter with a head start.</h1>
        <p>Grounded in your CV, shaped for the role you want.</p>
      </div>
      <div className="cover-grid">
        <section className="checker-card">
          <Input label="Job title" value={job} onChange={setJob} />
          <Input label="Company" value={company} onChange={setCompany} />
          <label className="field">
            <span>Job description (optional)</span>
            <textarea placeholder="Paste the job description…" />
          </label>
          <button className="primary" onClick={generate}>
            <WandSparkles size={16} /> Generate cover letter
          </button>
        </section>
        <section className="letter">
          <div className="letter-toolbar">
            <b>Your cover letter</b>
            <button onClick={() => navigator.clipboard.writeText(letter)}>
              <Copy size={15} /> Copy
            </button>
          </div>
          {letter ? (
            <textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
            />
          ) : (
            <div className="letter-empty">
              <FileText size={28} />
              <b>Ready when you are</b>
              <p>
                Tell us about the role and we’ll create a thoughtful first
                draft.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
