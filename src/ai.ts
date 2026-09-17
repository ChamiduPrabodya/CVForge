import type { CVData } from "./main";

export async function requestAI<T>(action: string, body: Record<string, string>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:4000/api"}/ai/${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(65000),
    });
  } catch { throw new Error("Unable to reach the AI service. Please try again or use basic import."); }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || "AI could not complete this request. Please try again.");
  return data as T;
}

// Send resume facts only; exclude photos, source documents and design settings.
export function resumeFacts(cv: CVData): string {
  const { fullName, title, summary, experience, education, skills, expertise, projects, certifications, languages, achievements, volunteer } = cv;
  return JSON.stringify({ fullName, title, summary, experience, education, skills, expertise, projects, certifications, languages, achievements, volunteer });
}
