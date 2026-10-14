export const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
export const validId = value => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value);

const textFields = "name template fullName title email phone location website linkedin photo originalPhoto summary importedSource importedFilename".split(" ");
const lists = {
  experience: "id title company location start end description",
  education: "id degree school location start end description",
  projects: "id name description tech url github",
  certifications: "id name organization date url",
  languages: "id language proficiency",
  achievements: "id text",
  volunteer: "id role organization location start end description",
  references: "id name relationship email phone",
};
const stringList = value => Array.isArray(value) && value.length <= 200 && value.every(item => typeof item === "string");
const optionalFields = (value, fields, type) => fields.split(" ").every(key => value[key] === undefined || typeof value[key] === type);
const validDesign = value => isObject(value)
  && optionalFields(value, "accent secondaryAccent background font headingFont", "string")
  && optionalFields(value, "spacing bodyFontSize nameFontSize", "number");

export function validDocument(document, id) {
  if (!isObject(document) || (document.id !== undefined && document.id !== id)) return false;
  if (typeof document.name !== "string" || !document.name.trim() || document.name.length > 200) return false;
  if (!textFields.every(key => document[key] === undefined || typeof document[key] === "string")) return false;
  if (!["skills", "expertise", "sections"].every(key => document[key] === undefined || stringList(document[key]))) return false;
  if (!Object.entries(lists).every(([key, fields]) => document[key] === undefined || (
    Array.isArray(document[key]) && document[key].length <= 200 && document[key].every(item => isObject(item)
      && fields.split(" ").every(field => item[field] === undefined || typeof item[field] === "string"))
  ))) return false;
  return (document.design === undefined || validDesign(document.design))
    && (document.templateConfig === undefined || validTemplate(document.templateConfig, document.templateConfig?.id));
}

export function validTemplate(template, id) {
  return isObject(template) && (template.id === undefined || template.id === id)
    && [template.name, template.style, template.category].every(value => typeof value === "string" && value.trim() && value.length <= 200)
    && (template.status === undefined || ["draft", "published"].includes(template.status))
    && optionalFields(template, "description layout sidebarPosition headerAlign photoShape pageSize density divider skillStyle contactStyle", "string")
    && optionalFields(template, "ats showPhoto", "boolean")
    && optionalFields(template, "version sidebarWidth pageMargin", "number")
    && ["sections", "sidebarSections"].every(key => template[key] === undefined || stringList(template[key]))
    && (template.design === undefined || validDesign(template.design))
    && (template.sectionLabels === undefined || (isObject(template.sectionLabels) && Object.values(template.sectionLabels).every(value => typeof value === "string")));
}
