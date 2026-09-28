import type { ProfileData } from "@/types";

function fullPhone(profile: ProfileData) {
  const code = (profile.phoneCountryCode || "+852").trim();
  const local = (profile.phoneNumber || "").trim();
  if (code && local) return `${code} ${local}`;
  return profile.contactPhone || "";
}

function gpaText(profile: ProfileData) {
  const score = profile.gpaScore?.trim();
  const scale = profile.gpaScale?.trim();
  if (score && scale) return `${score} / ${scale}`;
  return score || "";
}

/** Build agent formFields from structured profile (HK apply-ready). */
export function buildApplyFormFields(
  profile: ProfileData,
  opts?: { jobTitle?: string; company?: string }
): { label: string; value: string }[] {
  const phone = fullPhone(profile);
  const fields: { label: string; value: string }[] = [
    { label: "Title", value: profile.title || "Ms." },
    { label: "Surname", value: profile.surname || "Wu" },
    { label: "Given Name", value: profile.givenName || "Xuelian" },
    { label: "Preferred Name", value: profile.preferredName || "Kacy" },
    {
      label: "Full Name",
      value:
        profile.contactName ||
        `${(profile.surname || "Wu").toUpperCase()} ${(profile.givenName || "Xuelian").toUpperCase()}, ${profile.preferredName || "Kacy"}`,
    },
    { label: "Email", value: profile.contactEmail || "wuxuelian25@126.com" },
    { label: "Phone", value: phone },
    { label: "Phone Country Code", value: profile.phoneCountryCode || "+852" },
    { label: "Phone Number", value: profile.phoneNumber || "" },
    { label: "Mobile", value: phone },
    { label: "Telephone", value: phone },
    { label: "Contact No", value: phone },
    { label: "City", value: "Hong Kong" },
    { label: "HKID", value: profile.hkid || "" },
    { label: "Passport", value: profile.passport || "" },
    {
      label: "Work Visa Status",
      value: profile.workVisaStatus || "IANG",
    },
    {
      label: "Education Level",
      value: profile.educationLevel || "Master's Degree",
    },
    { label: "GPA", value: gpaText(profile) },
    { label: "GPA Score", value: profile.gpaScore || "" },
    { label: "Out of", value: profile.gpaScale || "" },
    { label: "Available Date", value: profile.availableDate || "" },
    { label: "Expected Salary", value: profile.expectedSalary || "" },
  ];

  if (opts?.jobTitle) {
    fields.push({ label: "Job Title", value: opts.jobTitle });
    fields.push({ label: "期望职位", value: opts.jobTitle });
  }
  if (opts?.company) {
    fields.push({ label: "Company", value: opts.company });
  }

  for (const [k, v] of Object.entries(profile.applyExtras || {})) {
    if (v?.trim()) fields.push({ label: k, value: v.trim() });
  }

  return fields.filter((f) => f.value.trim());
}

export function profilePayloadForAgent(profile: ProfileData) {
  const phone = fullPhone(profile);
  return {
    title: profile.title,
    surname: profile.surname,
    givenName: profile.givenName,
    preferredName: profile.preferredName,
    contactName: profile.contactName,
    contactEmail: profile.contactEmail,
    contactPhone: phone,
    phoneCountryCode: profile.phoneCountryCode || "+852",
    phoneNumber: profile.phoneNumber || "",
    fullPhone: phone,
    contact: {
      phone_country_code: profile.phoneCountryCode || "+852",
      phone_number: profile.phoneNumber || "",
      full_phone: phone,
    },
    hkid: profile.hkid,
    passport: profile.passport,
    workVisaStatus: profile.workVisaStatus,
    educationLevel: profile.educationLevel || "Master's Degree",
    gpa: {
      score: profile.gpaScore || "3.8",
      scale: profile.gpaScale || "4.0",
      percentage: profile.gpaPercentage || "88%",
      gpa_text: gpaText(profile) || "3.8 / 4.0",
    },
    gpaScore: profile.gpaScore,
    gpaScale: profile.gpaScale,
    gpaPercentage: profile.gpaPercentage,
    availableDate: profile.availableDate,
    expectedSalary: profile.expectedSalary,
    applyExtras: profile.applyExtras || {},
  };
}
