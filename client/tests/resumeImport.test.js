import assert from "node:assert/strict";
import { test } from "node:test";
import { extractResumeText, parseResumeText } from "../src/features/resume/resumeImport.ts";

const source = `Jane Perera
Software Engineer
jane@example.com | +94 77 123 4567
Location: Colombo, Sri Lanka
https://jane.dev
linkedin.com/in/jane

Professional Summary
Engineer building accessible applications.

Work Experience
Senior Engineer
Acme Ltd
Jan 2022 – Present
• Built accessible products.
• Led a team of four.

Engineer
Beta Ltd
Jun 2019 - Dec 2021
• Delivered customer dashboards.

Education
BSc Computer Science
University of Colombo
2015 - 2019
Graduated with honours.

Technical Skills: React, TypeScript; SQL
Languages
English - Fluent
Sinhala - Native
Projects
Portfolio
Built a personal portfolio.
Certifications
Cloud Practitioner
Achievements
Team award, 2023
Volunteer Experience
Mentor at Code Club | 2020 - Present
Taught programming.
References
Available on request`;

test("imports contact details and structured CV sections without sample content", () => {
  const result = parseResumeText(source);
  assert.equal(result.fullName, "Jane Perera");
  assert.equal(result.email, "jane@example.com");
  assert.equal(result.phone, "+94 77 123 4567");
  assert.equal(result.location, "Colombo, Sri Lanka");
  assert.equal(result.website, "https://jane.dev");
  assert.equal(result.linkedin, "linkedin.com/in/jane");
  assert.equal(result.experience.length, 2);
  assert.equal(result.experience[0].title, "Senior Engineer");
  assert.equal(result.experience[0].company, "Acme Ltd");
  assert.equal(result.experience[0].end, "Present");
  assert.match(result.experience[0].description, /Led a team/);
  assert.equal(result.experience[1].company, "Beta Ltd");
  assert.equal(result.education[0].degree, "BSc Computer Science");
  assert.equal(result.education[0].school, "University of Colombo");
  assert.match(result.education[0].description, /honours/);
  assert.deepEqual(result.skills, ["React", "TypeScript", "SQL"]);
  assert.equal(result.languages[1].proficiency, "Native");
  assert.equal(result.projects[0].name, "Portfolio");
  assert.equal(result.volunteer[0].role, "Mentor");
  assert.equal(result.volunteer[0].organization, "Code Club");
  assert.equal(result.certifications.length, 1);
  assert.equal(result.achievements[0].text, "Team award, 2023");
});

test("retains roles when Word adds blank paragraphs between titles, employers and dates", () => {
  const result = parseResumeText(source.replaceAll("\n", "\n\n"));
  assert.equal(result.experience.length, 2);
  assert.equal(result.experience[1].title, "Engineer");
  assert.equal(result.experience[1].company, "Beta Ltd");
  assert.match(result.experience[0].description, /Led a team/);
});

test("supports inline dated roles and retains text without known section headings", () => {
  const result = parseResumeText("Jane Perera\nEngineer\njane@example.com\nExperience\nEngineer at Acme | 2022 - Present\nBuilt tools.\nDeveloper at Beta | 2020 - 2022\nShipped apps.");
  assert.equal(result.experience[1].title, "Developer");
  assert.equal(result.experience[1].company, "Beta");
  assert.match(parseResumeText("Jane Perera\nEngineer\nA detailed career statement without headings.").summary, /detailed career statement/);
});

test("validates files and insufficient text; supports plain-text uploads", async () => {
  assert.throws(() => parseResumeText(" "), /enough readable text/);
  await assert.rejects(extractResumeText(new File(["text"], "cv.exe")), /PDF, Word/);
  await assert.rejects(extractResumeText(new File([], "cv.txt")), /empty/);
  await assert.rejects(extractResumeText(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "cv.txt")), /10 MB/);
  assert.equal(await extractResumeText(new File([source], "CV.TXT")), source);
});
