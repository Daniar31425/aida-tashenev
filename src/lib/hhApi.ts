import { getApiKey } from "./apiKeys";

export interface HHVacancyData {
  position: string;
  requirements: string;
  description: string;
}

export async function publishVacancyToHH(data: HHVacancyData): Promise<{ success: true; vacancy_id: string; url: string } | { success: false; error: string }> {
  try {
    const token = await getApiKey("HH_ACCESS_TOKEN");
    const employerId = "12853503"; // университет Ташенова

    const response = await fetch("https://api.hh.ru/vacancies", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.position,
        area: { id: "160" }, // Казахстан
        type: { id: "open" },
        billing_type: { id: "standard" },
        employer: { id: employerId },
        schedule: { id: "fullDay" },
        experience: { id: "between1And3" },
        employment: { id: "full" },
        description: `<p>${data.requirements}</p><p>${data.description}</p>`,
        salary: null,
        contacts: {
          name: "HR отдел",
          email: "hr@tashenev.edu.kz"
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HH API error (${response.status}): ${errorText}` };
    }

    const result = await response.json();
    const vacancyId = result.id;
    
    return {
      success: true,
      vacancy_id: vacancyId,
      url: `https://hh.kz/vacancy/${vacancyId}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish vacancy to HH"
    };
  }
}
