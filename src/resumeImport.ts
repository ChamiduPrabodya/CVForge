import type { CVData } from "./main";

const aliases: Record<string, string> = {
  summary: "summary", profile: "summary", "professional summary": "summary", "personal profile": "summary", "career objective": "summary", objective: "summary", "about me": "summary",
  experience: "experience", "work experience": "experience", "professional experience": "experience", "employment history": "experience", "work history": "experience", "career history": "experience",
  education: "education", "academic qualifications": "education", qualifications: "education",
  skills: "skills", "technical skills": "skills", "core skills": "skills", "key skills": "skills", "core competencies": "skills",
  expertise: "expertise", projects: "projects", "selected projects": "projects", certifications: "certifications", certificates: "certifications",
  languages: "languages", achievements: "achievements", awards: "achievements", "awards and achievements": "achievements",
  volunteer: "volunteer", volunteering: "volunteer", "volunteer experience": "volunteer", references: "references",
  contact: "contact", "contact details": "contact", "personal information": "contact", "personal details": "contact",
};
const emailPattern = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
const phonePattern = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]\d{3,4}[\s.-]\d{3,4}\b|\+?\b\d{9,15}\b/;
const datePart = "(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?\\s+|\\d{1,2}[/.-])?(?:19|20)\\d{2}";
const dateRange = new RegExp(`(${datePart})\\s*(?:[-–—]|to)\\s*(${datePart}|present|current|now)`, "i");
const clean = (line: string) => line.replace(/^\s*[•●▪◦*-]\s*/, "").trim();
const list = (lines: string[]) => lines.flatMap(line => clean(line).split(/[,;|•]/)).map(value => value.trim()).filter(Boolean);

// Keep each dated role together, including multi-paragraph descriptions.
function entries(lines: string[]): string[][] {
  const result: string[][] = [];
  let current: string[] = [];
  let dated = false;
  for (const line of lines) {
    if (dateRange.test(line) && dated) {
      const heading: string[] = [];
      // A new role commonly has its title and employer just before its dates.
      if (!line.replace(dateRange, "").replace(/[|,\s–—-]/g, "")) {
        while (current.length && heading.length < 2) {
          const last = current[current.length - 1];
          if (!last.trim()) { current.pop(); continue; }
          if (dateRange.test(last) || /^[•●▪◦*-]/.test(last) || /[.!?]$/.test(last) || last.length > 100) break;
          heading.unshift(current.pop()!);
        }
      }
      if (current.some(value => value.trim())) result.push(current);
      current = heading;
    }
    current.push(line);
    if (dateRange.test(line)) dated = true;
  }
  if (current.some(value => value.trim())) result.push(current);
  if (!dated) return lines.join("\n").split(/\n\s*\n/).map(block => block.split("\n").filter(Boolean)).filter(block => block.length);
  return result;
}

export function parseResumeText(text: string): Partial<CVData> {
  const normalized = text.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").trim();
  if (normalized.replace(/\s/g, "").length < 20) throw new Error("There is not enough readable text. Try another file or paste your CV below.");
  const sections: Record<string, string[]> = { header: [] };
  let section = "header";
  for (const raw of normalized.split("\n")) {
    const line = raw.trim();
    const [label, ...rest] = line.split(":");
    const heading = aliases[label.toLowerCase().replace(/&/g, "and").trim()];
    if (heading) {
      section = heading;
      sections[section] ??= [];
      if (rest.join(":").trim()) sections[section].push(rest.join(":").trim());
    } else (sections[section] ??= []).push(line);
  }
  const contactLines = [...sections.header, ...(sections.contact ?? [])].filter(Boolean);
  const contact = contactLines.join("\n");
  const email = contact.match(emailPattern)?.[0] ?? "";
  const phone = contact.match(phonePattern)?.[0] ?? "";
  const linkedin = contact.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|,]+/i)?.[0] ?? "";
  const website = contact.match(/(?:https?:\/\/|www\.)(?![\w.]*linkedin\.com)[^\s|,]+/i)?.[0] ?? "";
  const locationLine = contactLines.find(line => /^(?:location|address|based in)\s*:/i.test(line));
  const candidates = contactLines.filter(line => !emailPattern.test(line) && !phonePattern.test(line) && !/https?:|www\.|linkedin\.com|^(?:location|address|based in)\s*:/i.test(line) && !/^(?:curriculum vitae|resume|cv)$/i.test(line));
  const fullName = (candidates.shift() ?? "").replace(/^(?:full name|name)\s*:/i, "");
  const title = candidates[0] && candidates[0].length < 100 ? candidates.shift()!.replace(/^(?:title|job title)\s*:/i, "") : "";
  const location = locationLine?.replace(/^[^:]+:\s*/, "") ?? (candidates[0]?.includes(",") && candidates[0].length < 80 ? candidates.shift()! : "");
  let id = 0;
  const nextId = () => `import-${++id}`;
  const datedEntries = (key: string) => entries(sections[key] ?? []).map(block => {
    const dates = block.join(" ").match(dateRange);
    const content = block.map(line => clean(line.replace(dateRange, "").replace(/^[|\s–—-]+|[|\s–—-]+$/g, ""))).filter(Boolean);
    const heading = content.shift() ?? "";
    const parts = heading.split(/\s+(?:at|@)\s+|\s*[|]\s*/);
    const title = parts.shift() ?? "";
    const organization = parts.shift() ?? content.shift() ?? "";
    return { id: nextId(), title, organization, location: parts.join(", "), start: dates?.[1] ?? "", end: dates?.[2] ?? "", description: content.join("\n") };
  });
  return {
    fullName, title, email, phone, location, website, linkedin,
    summary: [...(sections.summary ?? []), ...candidates].join("\n").trim(),
    experience: datedEntries("experience").map(({ organization, ...entry }) => ({ ...entry, company: organization })),
    education: datedEntries("education").map(({ title, organization, ...entry }) => ({ ...entry, degree: title, school: organization })),
    volunteer: datedEntries("volunteer").map(({ title, ...entry }) => ({ ...entry, role: title })),
    skills: list(sections.skills ?? []), expertise: list(sections.expertise ?? []),
    projects: entries(sections.projects ?? []).map(block => ({ id: nextId(), name: clean(block[0]), description: block.slice(1).join("\n").trim(), tech: "" })),
    certifications: list(sections.certifications ?? []).map(name => ({ id: nextId(), name, organization: "", date: "", url: "" })),
    languages: list(sections.languages ?? []).map(line => { const [language, ...rest] = line.split(/\s*[:–—-]\s*/); return { id: nextId(), language, proficiency: rest.join(" - ") }; }),
    achievements: (sections.achievements ?? []).filter(Boolean).map(line => ({ id: nextId(), text: clean(line) })),
    references: entries(sections.references ?? []).map(block => ({ id: nextId(), name: clean(block[0]), relationship: block.slice(1).filter(line => !emailPattern.test(line) && !phonePattern.test(line)).join("\n"), email: block.join(" ").match(emailPattern)?.[0] ?? "", phone: block.join(" ").match(phonePattern)?.[0] ?? "" })),
  };
}

export async function extractResumeText(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose a CV smaller than 10 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["pdf", "docx", "txt"].includes(extension ?? "")) throw new Error("Choose a PDF, Word (.docx), or text (.txt) file.");
  if (!file.size) throw new Error("This file is empty. Choose another CV.");
  if (extension === "txt") return file.text();
  if (extension === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }
  const pdfjs = await import("pdfjs-dist");
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 30) throw new Error("Choose a CV with 30 pages or fewer.");
    const pages: string[] = [];
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      let text = "";
      let previousY: number | undefined;
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const y = item.transform[5];
        if (previousY !== undefined && Math.abs(y - previousY) > 3 && !text.endsWith("\n")) text += "\n";
        text += item.str + (item.hasEOL ? "\n" : " ");
        previousY = y;
      }
      pages.push(text);
    }
    const text = pages.join("\n\n");
    if (text.replace(/\s/g, "").length < 20) throw new Error("This PDF has no readable text. For a scanned CV, paste its text below or upload a text-based PDF or Word file.");
    return text;
  } finally { await task.destroy(); }
}
