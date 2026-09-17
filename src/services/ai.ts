import type { CVData } from "../types/resume";
import { apiBase } from "../config/api";

export async function requestAI<T>(action: string, body: Record<string, string>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}/ai/${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(65000),
    });
  } catch (error) {
    if (error instanceof DOMException && ["TimeoutError", "AbortError"].includes(error.name)) {
      throw new Error("The AI request timed out. Your CV text is still available. Try again or choose Use basic import.");
    }
    throw new Error("The connection to the server was interrupted. Your CV text is still available. Try again when the server is running, or choose Use basic import.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || ([500, 502, 503, 504].includes(response.status)
    ? "The backend is unavailable or restarting. Your CV text is still available. Try again shortly or choose Use basic import."
    : "AI could not complete this request. Please try again."));
  return data as T;
}

// Send resume facts only; exclude photos, source documents and design settings.
export function resumeFacts(cv: CVData): string {
  const { fullName, title, summary, experience, education, skills, expertise, projects, certifications, languages, achievements, volunteer } = cv;
  return JSON.stringify({ fullName, title, summary, experience, education, skills, expertise, projects, certifications, languages, achievements, volunteer });
}
