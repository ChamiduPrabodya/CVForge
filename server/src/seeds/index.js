import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { SystemTemplate } from "../models/SystemTemplate.js";
import { validCredentials } from "../validators/auth.validators.js";
import carelineTemplate from "../../../shared/templates/careline.json" with { type: "json" };
import saleslineTemplate from "../../../shared/templates/salesline.json" with { type: "json" };
import boutiqueTemplate from "../../../shared/templates/boutique.json" with { type: "json" };
import ivoryTemplate from "../../../shared/templates/ivory.json" with { type: "json" };
import mercadoTemplate from "../../../shared/templates/mercado.json" with { type: "json" };
import warnerTemplate from "../../../shared/templates/warner.json" with { type: "json" };
import sanchezTemplate from "../../../shared/templates/sanchez.json" with { type: "json" };
import chandranTemplate from "../../../shared/templates/chandran.json" with { type: "json" };
import kumariTemplate from "../../../shared/templates/kumari.json" with { type: "json" };

export const seedAdmin = async () => {
  const production = process.env.NODE_ENV === "production";
  if (production && !process.env.ADMIN_EMAIL && !process.env.ADMIN_PASSWORD) return;
  const email = (process.env.ADMIN_EMAIL || (production ? "" : "admin@cvforge.local")).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || (production ? "" : "ChangeThisAdminPassword123!");
  if (!validCredentials(email, password)) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD to valid administrator credentials.");
  if (!(await User.findOne({ email }))) {
    await User.create({ email, passwordHash: await bcrypt.hash(password, 12), role: "admin" });
    console.log(`Created local admin account: ${email}`);
  }
};
// Remove the former bundled catalog from databases initialized by earlier versions.
// User-created templates use saved-/admin- IDs and remain available.
export const removeBundledTemplates = () => SystemTemplate.deleteMany({
  templateId: { $in: ["portrait", "custom", "classic", "modern", "executive", "creative", "tech", "ats", "student", "elegant", "corporate", "twocolumn"] },
});
export const seedSystemTemplates = () => Promise.all([carelineTemplate, saleslineTemplate, boutiqueTemplate, ivoryTemplate, mercadoTemplate, warnerTemplate, sanchezTemplate, chandranTemplate, kumariTemplate].map((template) => SystemTemplate.updateOne(
  { templateId: template.id },
  { $setOnInsert: { templateId: template.id, template } },
  { upsert: true },
)));
