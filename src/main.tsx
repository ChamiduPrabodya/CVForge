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
  Menu,
  MoreHorizontal,
  Palette,
  PenLine,
  Plus,
  Printer,
  Rocket,
  Save,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import "./styles.css";

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
  sections: string[];
};
type Template = {
  id: string;
  name: string;
  category: string;
  description: string;
  ats?: boolean;
  style: string;
};
const uid = () => Math.random().toString(36).slice(2, 9);
const initialCV: CVData = {
  id: uid(),
  name: "Software Engineer CV",
  template: "modern",
  fullName: "Alex Morgan",
  title: "Product-focused Software Engineer",
  email: "alex.morgan@email.com",
  phone: "+1 415 555 0182",
  location: "San Francisco, CA",
  website: "alexmorgan.dev",
  linkedin: "linkedin.com/in/alexmorgan",
  photo: "",
  summary:
    "Software engineer with 5+ years of experience building accessible, high-performing digital products. I turn complex customer problems into thoughtful, scalable experiences.",
  experience: [
    {
      id: uid(),
      title: "Senior Frontend Engineer",
      company: "Northstar Labs",
      location: "San Francisco, CA",
      start: "2022",
      end: "Present",
      description:
        "Led the rebuild of a customer platform used by 40,000+ people. Improved page performance by 38% and partnered with product and design to ship a cohesive design system.",
    },
    {
      id: uid(),
      title: "Frontend Engineer",
      company: "Bright & Co.",
      location: "Remote",
      start: "2019",
      end: "2022",
      description:
        "Built responsive web applications with React and TypeScript. Mentored junior engineers and improved test coverage across core product flows.",
    },
  ],
  education: [
    {
      id: uid(),
      degree: "B.S. Computer Science",
      school: "University of California",
      location: "Berkeley, CA",
      start: "2015",
      end: "2019",
    },
  ],
  skills: ["React", "TypeScript", "Node.js", "Product Design", "SQL"],
  projects: [
    {
      id: uid(),
      name: "Design System",
      description:
        "A component library that accelerates teams without sacrificing quality.",
      tech: "React · Storybook · CSS",
    },
  ],
  certifications: [{ id: uid(), name: "AWS Certified Cloud Practitioner", organization: "Amazon Web Services", date: "2024", url: "" }],
  languages: [{ id: uid(), language: "English", proficiency: "Native" }],
  achievements: [{ id: uid(), text: "Recognized for mentoring and onboarding 5 junior engineers." }],
  volunteer: [{ id: uid(), role: "Coding Mentor", organization: "Code for Tomorrow", location: "San Francisco, CA", start: "2023", end: "Present", description: "Mentor aspiring developers through weekly workshops." }],
  references: [{ id: uid(), name: "Jordan Lee", relationship: "Engineering Manager, Northstar Labs", email: "jordan.lee@example.com", phone: "+1 415 555 0123" }],
  sections: ["summary", "experience", "education", "skills", "projects", "certifications", "languages", "achievements", "volunteer", "references"],
};
const templates: Template[] = [
  {
    id: "classic",
    name: "Classic Professional",
    category: "Professional",
    description: "Timeless hierarchy for every industry.",
    ats: true,
    style: "classic",
  },
  {
    id: "modern",
    name: "Modern Minimal",
    category: "Modern",
    description: "Crisp, confident, and beautifully restrained.",
    ats: true,
    style: "modern",
  },
  {
    id: "executive",
    name: "Executive",
    category: "Executive",
    description: "Commanding layout for leadership roles.",
    style: "executive",
  },
  {
    id: "creative",
    name: "Creative",
    category: "Creative",
    description: "Expressive structure for creative careers.",
    style: "creative",
  },
  {
    id: "tech",
    name: "Tech Professional",
    category: "Professional",
    description: "Data-forward format for technical talent.",
    ats: true,
    style: "tech",
  },
  {
    id: "ats",
    name: "ATS Simple",
    category: "ATS-Friendly",
    description: "Straightforward and scanner-friendly.",
    ats: true,
    style: "ats",
  },
  {
    id: "student",
    name: "Student",
    category: "Student",
    description: "Puts potential and education up front.",
    ats: true,
    style: "student",
  },
  {
    id: "elegant",
    name: "Elegant",
    category: "Minimal",
    description: "A warm editorial take on a CV.",
    style: "elegant",
  },
  {
    id: "corporate",
    name: "Corporate",
    category: "Professional",
    description: "Polished for established organizations.",
    ats: true,
    style: "corporate",
  },
  {
    id: "twocolumn",
    name: "Two Column Modern",
    category: "Experienced",
    description: "Balanced information with a strong side rail.",
    style: "twocolumn",
  },
];
const categories = [
  "All",
  "Professional",
  "Modern",
  "Minimal",
  "Creative",
  "Executive",
  "ATS-Friendly",
  "Student",
  "Experienced",
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
  const [page, setPage] = useState("home"),
    [cv, setCV] = useState<CVData>(initialCV),
    [toast, setToast] = useState(""),
    [mobile, setMobile] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("cvforge-doc");
    if (saved)
      try {
        const parsed = JSON.parse(saved);
        setCV({
          ...initialCV,
          ...parsed,
          projects: parsed.projects ?? initialCV.projects,
          certifications: parsed.certifications ?? initialCV.certifications,
          languages: parsed.languages ?? initialCV.languages,
          achievements: parsed.achievements ?? initialCV.achievements,
          volunteer: parsed.volunteer ?? initialCV.volunteer,
          references: parsed.references ?? initialCV.references,
          sections: parsed.sections?.includes("certifications")
            ? parsed.sections
            : [...(parsed.sections ?? initialCV.sections), "certifications", "languages", "achievements", "volunteer", "references"],
        });
      } catch {}
  }, []);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const choose = (id: string) => {
    setCV((p) => ({ ...p, template: id }));
    setPage("builder");
    notify("Template selected — your information is preserved.");
  };
  const save = () => {
    localStorage.setItem("cvforge-doc", JSON.stringify(cv));
    notify("CV saved successfully.");
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
              onClick={() => setPage(n.id)}
              key={n.id}
            >
              {n.label}
            </button>
          ))}
          <button onClick={() => setPage("builder")}>How it works</button>
          <button onClick={() => setPage("home")}>Pricing</button>
        </nav>
        <div className="top-actions">
          <button className="login">Log in</button>
          <button
            className="primary small"
            onClick={() => setPage("templates")}
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
                setPage(n.id);
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
      {page === "templates" && <Templates cv={cv} choose={choose} />}{" "}
      {page === "builder" && (
        <Builder cv={cv} setCV={setCV} save={save} notify={notify} />
      )}{" "}
      {page === "dashboard" && <Dashboard cv={cv} go={setPage} save={save} />}{" "}
      {page === "ats" && <ATS cv={cv} />}{" "}
      {page === "cover" && <Cover cv={cv} notify={notify} />}
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
          Build a beautiful, ATS-friendly CV in minutes. Choose a template, make
          it yours, and download it with confidence.
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
          <span>✦ ATS-optimized templates</span>
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
          <span className="score">92</span>
          <span>
            <b>ATS ready</b>
            <small>Excellent match score</small>
          </span>
          <CircleCheck size={20} />
        </div>
      </section>
      <section className="proof">
        <span>Trusted by ambitious professionals at</span>
        <b>stripe</b>
        <b>airbnb</b>
        <b>notion</b>
        <b>Google</b>
        <b>shopify</b>
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
            text="Start with a template crafted by people who care about first impressions."
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
function MiniCV() {
  return (
    <div className="mini-cv">
      <div className="mini-head">
        <div className="avatar">AM</div>
        <div>
          <b>Alex Morgan</b>
          <small>Product Designer</small>
        </div>
      </div>
      <div className="mini-rule" />
      <b className="mini-label">EXPERIENCE</b>
      <div className="mini-job">
        <b>Senior Product Designer</b>
        <small>Northstar Labs · 2021—Present</small>
        <p></p>
        <p></p>
      </div>
      <div className="mini-job">
        <b>Product Designer</b>
        <small>Inkwell · 2018—2021</small>
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
  choose,
}: {
  cv: CVData;
  choose: (id: string) => void;
}) {
  const [filter, setFilter] = useState("All"),
    [preview, setPreview] = useState<Template | null>(null);
  const visible = templates.filter(
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
                <button className="primary small" onClick={() => choose(t.id)}>
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
            <div className="modal-cv">
              <CVPreview cv={{ ...cv, template: preview.id }} />
            </div>
            <div>
              <span className="eyebrow">{preview.category} TEMPLATE</span>
              <h2>{preview.name}</h2>
              <p>{preview.description}</p>
              <button className="primary" onClick={() => choose(preview.id)}>
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
  return (
    <div className={"template-thumb " + template.style}>
      <div className="thumb-name">{cv.fullName}</div>
      <div className="thumb-title">{cv.title}</div>
      <div className="thumb-line wide" />
      <div className="thumb-line" />
      <div className="thumb-line" />
      <div className="thumb-head">EXPERIENCE</div>
      <div className="thumb-line wide" />
      <div className="thumb-line" />
      <div className="thumb-head">SKILLS</div>
      <div className="thumb-chips">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function Builder({
  cv,
  setCV,
  save,
  notify,
}: {
  cv: CVData;
  setCV: React.Dispatch<React.SetStateAction<CVData>>;
  save: () => void;
  notify: (s: string) => void;
}) {
  const [tab, setTab] = useState<"edit" | "preview" | "style">("edit"),
    [open, setOpen] = useState("personal"),
    [color, setColor] = useState("#2563eb"),
    [font, setFont] = useState("Inter"),
    [spacing, setSpacing] = useState(1),
    previewRef = useRef<HTMLDivElement>(null);
  const update = (key: keyof CVData, value: any) =>
    setCV((p) => ({ ...p, [key]: value }));
  const updateItem = <T extends { id: string }>(
    key: keyof CVData,
    items: T[],
    id: string,
    patch: Partial<T>,
  ) => update(key, items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const uploadPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      update("photo", String(reader.result));
      notify("Profile photo added.");
    };
    reader.readAsDataURL(file);
  };
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
    const a = [...cv.sections];
    const [item] = a.splice(from, 1);
    a.splice(to, 0, item);
    update("sections", a);
  };
  const exportPDF = async () => {
    if (!cv.fullName || !cv.email) {
      notify("Add your name and email before exporting.");
      return;
    }
    const node = previewRef.current;
    if (!node) return;
    notify("Generating your PDF…");
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
              <label className="upload-control"><Upload size={14} /> Upload profile photo<input type="file" accept="image/*" onChange={(e) => uploadPhoto(e.target.files?.[0])} /></label>
              {cv.photo && <button className="remove-photo" onClick={() => update("photo", "")}>Remove</button>}
            </div>
          </Accordion>
          <Accordion
            title="Professional summary"
            open={open === "summary"}
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
            open={open === "experience"}
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
            open={open === "education"}
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
            open={open === "skills"}
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
          <Accordion title={`Projects (${cv.projects.length})`} open={open === "projects"} onClick={() => setOpen(open === "projects" ? "" : "projects")}>
            <Repeater items={cv.projects} onChange={(items) => update("projects", items)} addLabel="Add project" newItem={() => ({ id: uid(), name: "New project", description: "Describe what you built and the impact it created.", tech: "", url: "", github: "" })} itemLabel={(item) => item.name || "Untitled project"}>
              {(item, change) => <>
                <Input label="Project name" value={item.name} onChange={(name) => change({ name })} />
                <textarea value={item.description} onChange={(e) => change({ description: e.target.value })} placeholder="Project description" />
                <Input label="Technologies" value={item.tech} onChange={(tech) => change({ tech })} />
                <div className="fields two"><Input label="Project URL" value={item.url || ""} onChange={(url) => change({ url })} /><Input label="GitHub URL" value={item.github || ""} onChange={(github) => change({ github })} /></div>
              </>}
            </Repeater>
          </Accordion>
          <Accordion title={`Certifications (${cv.certifications.length})`} open={open === "certifications"} onClick={() => setOpen(open === "certifications" ? "" : "certifications")}>
            <Repeater items={cv.certifications} onChange={(items) => update("certifications", items)} addLabel="Add certification" newItem={() => ({ id: uid(), name: "New certification", organization: "Issuing organization", date: "", url: "" })} itemLabel={(item) => item.name || "Untitled certification"}>
              {(item, change) => <><Input label="Certification name" value={item.name} onChange={(name) => change({ name })} /><div className="fields two"><Input label="Organization" value={item.organization} onChange={(organization) => change({ organization })} /><Input label="Issue date" value={item.date} onChange={(date) => change({ date })} /></div><Input label="Credential URL" value={item.url} onChange={(url) => change({ url })} /></>}
            </Repeater>
          </Accordion>
          <Accordion title={`Languages (${cv.languages.length})`} open={open === "languages"} onClick={() => setOpen(open === "languages" ? "" : "languages")}>
            <Repeater items={cv.languages} onChange={(items) => update("languages", items)} addLabel="Add language" newItem={() => ({ id: uid(), language: "New language", proficiency: "Intermediate" })} itemLabel={(item) => item.language || "Untitled language"}>
              {(item, change) => <div className="fields two"><Input label="Language" value={item.language} onChange={(language) => change({ language })} /><label className="field"><span>Proficiency</span><select value={item.proficiency} onChange={(e) => change({ proficiency: e.target.value })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Fluent</option><option>Native</option></select></label></div>}
            </Repeater>
          </Accordion>
          <Accordion title={`Achievements (${cv.achievements.length})`} open={open === "achievements"} onClick={() => setOpen(open === "achievements" ? "" : "achievements")}>
            <Repeater items={cv.achievements} onChange={(items) => update("achievements", items)} addLabel="Add achievement" newItem={() => ({ id: uid(), text: "New achievement" })} itemLabel={(item) => item.text || "Untitled achievement"}>
              {(item, change) => <textarea value={item.text} onChange={(e) => change({ text: e.target.value })} placeholder="Describe the achievement" />}
            </Repeater>
          </Accordion>
          <Accordion title={`Volunteer experience (${cv.volunteer.length})`} open={open === "volunteer"} onClick={() => setOpen(open === "volunteer" ? "" : "volunteer")}>
            <Repeater items={cv.volunteer} onChange={(items) => update("volunteer", items)} addLabel="Add volunteer role" newItem={() => ({ id: uid(), role: "New volunteer role", organization: "Organization", location: "", start: "", end: "", description: "" })} itemLabel={(item) => item.role || "Untitled volunteer role"}>
              {(item, change) => <><Input label="Role" value={item.role} onChange={(role) => change({ role })} /><div className="fields two"><Input label="Organization" value={item.organization} onChange={(organization) => change({ organization })} /><Input label="Location" value={item.location} onChange={(location) => change({ location })} /></div><div className="fields two"><Input label="Start date" value={item.start} onChange={(start) => change({ start })} /><Input label="End date" value={item.end} onChange={(end) => change({ end })} /></div><textarea value={item.description} onChange={(e) => change({ description: e.target.value })} placeholder="Describe your contribution" /></>}
            </Repeater>
          </Accordion>
          <Accordion title={`References (${cv.references.length})`} open={open === "references"} onClick={() => setOpen(open === "references" ? "" : "references")}>
            <Repeater items={cv.references} onChange={(items) => update("references", items)} addLabel="Add reference" newItem={() => ({ id: uid(), name: "New reference", relationship: "", email: "", phone: "" })} itemLabel={(item) => item.name || "Untitled reference"}>
              {(item, change) => <><Input label="Full name" value={item.name} onChange={(name) => change({ name })} /><Input label="Relationship / title" value={item.relationship} onChange={(relationship) => change({ relationship })} /><div className="fields two"><Input label="Email" value={item.email} onChange={(email) => change({ email })} /><Input label="Phone" value={item.phone} onChange={(phone) => change({ phone })} /></div></>}
            </Repeater>
          </Accordion>
        </aside>
        <section className={"preview-area " + (tab === "preview" ? "on" : "")}>
          <div className="zoom-bar">
            <span>Live preview</span>
            <span>100%</span>
          </div>
          <div
            ref={previewRef}
            className="a4-wrap"
            style={
              {
                "--accent": color,
                "--cv-font": font,
                "--space": spacing,
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
            onClick={() => (location.hash = "templates")}
          >
            <TemplateThumb
              cv={cv}
              template={templates.find((t) => t.id === cv.template)!}
            />
            <span>
              {templates.find((t) => t.id === cv.template)?.name}
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
                <button disabled={!i} onClick={() => reorder(i, i - 1)}>
                  <ChevronUp size={14} />
                </button>
                <button
                  disabled={i === cv.sections.length - 1}
                  onClick={() => reorder(i, i + 1)}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            ))}
          </div>
          <p className="hint">Drag sections to reorder.</p>
        </aside>
      </div>
    </main>
  );
}
function Accordion({
  title,
  open,
  onClick,
  children,
}: {
  title: string;
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="accordion">
      <button className="accordion-title" onClick={onClick}>
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

function CVPreview({ cv }: { cv: CVData }) {
  const t = templates.find((x) => x.id === cv.template)!;
  const contact = [cv.email, cv.phone, cv.location, cv.website].filter(Boolean);
  return (
    <article className={"cv-document cv-" + t.style}>
      <header className="cv-header">
        <div>
          <h1>{cv.fullName}</h1>
          <h2>{cv.title}</h2>
        </div>
        {cv.photo ? <img className="cv-photo" src={cv.photo} alt="Profile" /> : t.style === "creative" && (
          <div className="cv-circle">
            {cv.fullName
              .split(" ")
              .map((x) => x[0])
              .join("")}
          </div>
        )}
        <div className="contact">
          {contact.map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
      </header>
      <div className="cv-body">
        {cv.sections.map((section) => (
          <CVSection key={section} type={section} cv={cv} />
        ))}
      </div>
    </article>
  );
}
function CVSection({ type, cv }: { type: string; cv: CVData }) {
  if (type === "summary")
    return (
      <section className="cv-section">
        <h3>{sectionTitles[type]}</h3>
        <p>{cv.summary}</p>
      </section>
    );
  if (type === "experience")
    return (
      <section className="cv-section">
        <h3>Experience</h3>
        {cv.experience.map((e) => (
          <div className="cv-entry" key={e.id}>
            <div>
              <h4>{e.title}</h4>
              <b>
                {e.company} <span>·</span> {e.location}
              </b>
            </div>
            <time>
              {e.start} — {e.end}
            </time>
            <p>{e.description}</p>
          </div>
        ))}
      </section>
    );
  if (type === "education")
    return (
      <section className="cv-section">
        <h3>Education</h3>
        {cv.education.map((e) => (
          <div className="cv-entry compact-entry" key={e.id}>
            <div>
              <h4>{e.degree}</h4>
              <b>
                {e.school} <span>·</span> {e.location}
              </b>
            </div>
            <time>
              {e.start} — {e.end}
            </time>
          </div>
        ))}
      </section>
    );
  if (type === "skills")
    return (
      <section className="cv-section">
        <h3>Skills</h3>
        <div className="cv-skills">
          {cv.skills.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </section>
    );
  if (type === "projects")
    return <section className="cv-section"><h3>Selected projects</h3>{cv.projects.map((p) => <div className="cv-entry project" key={p.id}><h4>{p.name}</h4><p>{p.description}</p><b>{p.tech}</b>{p.url && <span className="cv-link">{p.url}</span>}</div>)}</section>;
  if (type === "certifications")
    return <section className="cv-section"><h3>Certifications</h3>{cv.certifications.map((item) => <div className="cv-entry compact-entry" key={item.id}><div><h4>{item.name}</h4><b>{item.organization}</b>{item.url && <span className="cv-link">{item.url}</span>}</div><time>{item.date}</time></div>)}</section>;
  if (type === "languages")
    return <section className="cv-section"><h3>Languages</h3><div className="cv-skills">{cv.languages.map((item) => <span key={item.id}>{item.language} · {item.proficiency}</span>)}</div></section>;
  if (type === "achievements")
    return <section className="cv-section"><h3>Achievements</h3><ul className="cv-list">{cv.achievements.map((item) => <li key={item.id}>{item.text}</li>)}</ul></section>;
  if (type === "volunteer")
    return <section className="cv-section"><h3>Volunteer experience</h3>{cv.volunteer.map((item) => <div className="cv-entry" key={item.id}><div><h4>{item.role}</h4><b>{item.organization} <span>·</span> {item.location}</b></div><time>{item.start} — {item.end}</time><p>{item.description}</p></div>)}</section>;
  if (type === "references")
    return <section className="cv-section"><h3>References</h3>{cv.references.map((item) => <div className="cv-entry compact-entry" key={item.id}><div><h4>{item.name}</h4><b>{item.relationship}</b><p>{[item.email, item.phone].filter(Boolean).join(" · ")}</p></div></div>)}</section>;
  return null;
}

function Dashboard({
  cv,
  go,
  save,
}: {
  cv: CVData;
  go: (s: string) => void;
  save: () => void;
}) {
  return (
    <main className="dashboard">
      <div className="dash-welcome">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>Welcome back, Alex.</h1>
          <p>Make your next career move feel inevitable.</p>
        </div>
        <button className="primary" onClick={() => go("templates")}>
          <Plus size={17} /> Create new CV
        </button>
      </div>
      <div className="dash-stats">
        <article>
          <FileText />
          <b>1</b>
          <span>CVs created</span>
        </article>
        <article>
          <Sparkles />
          <b>92</b>
          <span>Latest ATS score</span>
        </article>
        <article>
          <Download />
          <b>4</b>
          <span>Total downloads</span>
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
            template={templates.find((t) => t.id === cv.template)!}
          />
          <div>
            <span className="badge">Recently edited</span>
            <h3>{cv.name}</h3>
            <p>
              Updated just now ·{" "}
              {templates.find((t) => t.id === cv.template)?.name}
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
            <b>{ran ? 87 : 92}</b>
            <span>/ 100</span>
          </div>
          <h2>{ran ? "Strong match" : "ATS-ready"}</h2>
          <p>
            Your CV has a clear structure, complete contact details, and a good
            balance of keywords.
          </p>
          <div className="score-bars">
            <Bar title="Formatting" value={96} />
            <Bar title="Skills & keywords" value={ran ? 82 : 90} />
            <Bar title="Impact & readability" value={85} />
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
  const [job, setJob] = useState("Product Designer"),
    [company, setCompany] = useState("Northstar"),
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
            