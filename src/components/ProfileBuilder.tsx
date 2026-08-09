"use client";

import {
  GraduationCap,
  Briefcase,
  Rocket,
  Wrench,
  Lightbulb,
  ArrowRight,
  Contact,
  Plus,
  Trash2,
  Save,
  Loader2,
  Check,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/PageHeader";
import { newProfileEntry, type ProfileEntry } from "@/types";

type EntryKey = "education" | "internship" | "projects";

const ENTRY_SECTIONS: {
  key: EntryKey;
  emoji: string;
  title: string;
  hint: string;
  icon: typeof GraduationCap;
  span2?: boolean;
}[] = [
  {
    key: "education",
    emoji: "🎓",
    title: "教育背景 (Education)",
    hint: "已从 Master CV 预填 HKU MSc & Southwest University B.Eng",
    icon: GraduationCap,
    span2: true,
  },
  {
    key: "internship",
    emoji: "💼",
    title: "实习经历 (Internship Experience)",
    hint: "已预填 Crossroads Foundation & Chongqing Urban Greening Management Center",
    icon: Briefcase,
    span2: true,
  },
  {
    key: "projects",
    emoji: "🚀",
    title: "项目与领导力 (School Projects & Leadership)",
    hint: "对应 CV：SCHOOL PROJECTS & LEADERSHIP / PROJECTS & OTHER EXPERIENCES",
    icon: Rocket,
  },
];

function EntryEditor({
  entry,
  onChange,
  onRemove,
}: {
  entry: ProfileEntry;
  onChange: (next: ProfileEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="glass-inset p-3">
      <div className="mb-2 flex items-start gap-2">
        <input
          value={entry.headline}
          onChange={(e) => onChange({ ...entry, headline: e.target.value })}
          placeholder="机构 / 项目（实习写 Company, City）"
          className="min-w-0 flex-1 soft-input px-2.5 py-1.5 font-medium"
        />
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          aria-label="删除条目"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-2 grid gap-2 sm:grid-cols-2">
        <input
          value={entry.detail || ""}
          onChange={(e) => onChange({ ...entry, detail: e.target.value })}
          placeholder="职位 / 补充说明"
          className="soft-input px-2.5 py-1.5"
        />
        <input
          value={entry.period || ""}
          onChange={(e) => onChange({ ...entry, period: e.target.value })}
          placeholder="时间"
          className="soft-input px-2.5 py-1.5"
        />
      </div>
      <textarea
        value={entry.bullets.join("\n")}
        onChange={(e) =>
          onChange({
            ...entry,
            bullets: e.target.value.split("\n"),
          })
        }
        rows={Math.max(2, entry.bullets.length || 2)}
        placeholder="每行一条 bullet"
        className="w-full resize-y soft-textarea p-2.5"
      />
    </div>
  );
}

export function ProfileBuilder() {
  const {
    profile,
    setProfile,
    updateProfileField,
    fullExperience,
    setTab,
    saveWorkspaceNow,
  } = useApp();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    message: string;
  } | null>(null);

  async function handleSave() {
    setSaving(true);
    setToast(null);
    try {
      const result = await saveWorkspaceNow();
      if (result.ok) {
        setToast({
          type: "ok",
          message: "个人信息已保存到云端 Redis",
        });
      } else {
        setToast({
          type: "err",
          message: result.error || "保存失败，请检查 Redis 配置",
        });
      }
    } catch {
      setToast({ type: "err", message: "保存失败，请稍后重试" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3200);
    }
  }

  function updateEntries(key: EntryKey, entries: ProfileEntry[]) {
    setProfile((prev) => ({ ...prev, [key]: entries }));
  }

  function patchEntry(key: EntryKey, id: string, next: ProfileEntry) {
    updateEntries(
      key,
      profile[key].map((e) => (e.id === id ? next : e))
    );
  }

  function removeEntry(key: EntryKey, id: string) {
    updateEntries(
      key,
      profile[key].filter((e) => e.id !== id)
    );
  }

  function addEntry(key: EntryKey) {
    updateEntries(key, [...profile[key], newProfileEntry()]);
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        emoji="👤"
        step="步骤 1 · 人物画像"
        title="结构化经历底层库"
        description="已从 Master CV（cvenvironment.pdf）自动解析并分类填入；可编辑、新增条目，数据保存在本地。"
        accent="violet"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="soft-btn-accent px-4 py-2.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </button>
            <button
              type="button"
              onClick={() => setTab("resume")}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              去生成专属简历
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {toast && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm shadow-glass ${
            toast.type === "ok"
              ? "border-emerald-200/70 bg-emerald-50/90 text-emerald-900"
              : "border-rose-200/70 bg-rose-50/90 text-rose-800"
          }`}
          role="status"
        >
          {toast.type === "ok" ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : null}
          {toast.message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <article className="glass-panel p-4 md:col-span-2">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">👤</span>
            <Contact className="h-4 w-4 text-teal-700" />
            <h3 className="font-medium text-slate-900">基本信息 / Contact</h3>
          </div>
          <p className="mb-2 text-xs text-slate-500">
            姓名、电话、邮箱、住址与签证（将出现在 CV 页眉联系方式栏）
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={profile.contactName}
              onChange={(e) => updateProfileField("contactName", e.target.value)}
              placeholder="姓名"
              className="soft-input"
            />
            <input
              value={profile.contactEmail}
              onChange={(e) =>
                updateProfileField("contactEmail", e.target.value)
              }
              placeholder="邮箱"
              className="soft-input"
            />
            <input
              value={profile.contactPhone}
              onChange={(e) => {
                updateProfileField("contactPhone", e.target.value);
              }}
              placeholder="完整电话 +852 …"
              className="soft-input"
            />
            <input
              value={profile.contactAddress}
              onChange={(e) =>
                updateProfileField("contactAddress", e.target.value)
              }
              placeholder="Address（如 Hong Kong）"
              className="soft-input"
              aria-label="Address"
            />
            <input
              value={profile.workVisaStatus}
              onChange={(e) =>
                updateProfileField("workVisaStatus", e.target.value)
              }
              placeholder="Visa / Work Authorization（如 IANG Visa）"
              className="soft-input sm:col-span-2"
              aria-label="Visa / Work Authorization"
            />
          </div>
          <p className="mb-2 mt-4 text-xs font-medium text-slate-600">
            Phone · 区号 / 号码（网申拆分填报）
          </p>
          <div className="mb-2 grid gap-2 sm:grid-cols-3">
            <select
              value={profile.phoneCountryCode || "+852"}
              onChange={(e) => {
                const code = e.target.value;
                updateProfileField("phoneCountryCode", code);
                const local = profile.phoneNumber || "";
                if (local) {
                  updateProfileField("contactPhone", `${code} ${local}`);
                }
              }}
              className="soft-input"
              aria-label="Phone country code"
            >
              <option value="+852">Hong Kong +852</option>
              <option value="+86">China +86</option>
            </select>
            <input
              value={profile.phoneNumber}
              onChange={(e) => {
                const local = e.target.value.replace(/\D/g, "");
                updateProfileField("phoneNumber", local);
                const code = profile.phoneCountryCode || "+852";
                updateProfileField("contactPhone", `${code} ${local}`.trim());
              }}
              placeholder="手机号（8 / 11 位）"
              className="soft-input sm:col-span-2"
            />
          </div>
          <p className="mb-2 mt-4 text-xs font-medium text-slate-600">
            Hong Kong Apply Form · 网申常用字段
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={profile.title}
              onChange={(e) => updateProfileField("title", e.target.value)}
              placeholder="Title (Ms.)"
              className="soft-input"
            />
            <input
              value={profile.surname}
              onChange={(e) => updateProfileField("surname", e.target.value)}
              placeholder="Surname"
              className="soft-input"
            />
            <input
              value={profile.givenName}
              onChange={(e) => updateProfileField("givenName", e.target.value)}
              placeholder="Given Name"
              className="soft-input"
            />
            <input
              value={profile.preferredName}
              onChange={(e) =>
                updateProfileField("preferredName", e.target.value)
              }
              placeholder="Preferred Name"
              className="soft-input"
            />
            <input
              value={profile.workVisaStatus}
              onChange={(e) =>
                updateProfileField("workVisaStatus", e.target.value)
              }
              placeholder="Work Visa (IANG Visa / No sponsorship required)"
              className="soft-input"
            />
            <input
              value={profile.educationLevel}
              onChange={(e) =>
                updateProfileField("educationLevel", e.target.value)
              }
              placeholder="Education Level (Master's Degree)"
              className="soft-input"
            />
            <input
              value={profile.availableDate}
              onChange={(e) =>
                updateProfileField("availableDate", e.target.value)
              }
              placeholder="Available Date"
              className="soft-input"
            />
            <input
              value={profile.hkid}
              onChange={(e) => updateProfileField("hkid", e.target.value)}
              placeholder="HKID (optional)"
              className="soft-input"
            />
            <input
              value={profile.passport}
              onChange={(e) => updateProfileField("passport", e.target.value)}
              placeholder="Passport (optional)"
              className="soft-input"
            />
            <input
              value={profile.expectedSalary}
              onChange={(e) =>
                updateProfileField("expectedSalary", e.target.value)
              }
              placeholder="Expected Salary"
              className="soft-input"
            />
            <input
              value={profile.gpaScore}
              onChange={(e) => updateProfileField("gpaScore", e.target.value)}
              placeholder="GPA Score (3.8)"
              className="soft-input"
            />
            <input
              value={profile.gpaScale}
              onChange={(e) => updateProfileField("gpaScale", e.target.value)}
              placeholder="GPA Scale (4.0)"
              className="soft-input"
            />
            <input
              value={profile.gpaPercentage}
              onChange={(e) =>
                updateProfileField("gpaPercentage", e.target.value)
              }
              placeholder="Percentage (88%)"
              className="soft-input"
            />
          </div>
        </article>

        {ENTRY_SECTIONS.map(({ key, emoji, title, hint, icon: Icon, span2 }) => (
          <article
            key={key}
            className={`w-full glass-panel p-4 ${
              span2 ? "md:col-span-2" : ""
            }`}
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{emoji}</span>
                <Icon className="h-4 w-4 text-teal-700" />
                <h3 className="font-medium text-slate-900">{title}</h3>
              </div>
              <button
                type="button"
                onClick={() => addEntry(key)}
                className="soft-btn rounded-xl border border-slate-200/50 bg-white/70 px-2.5 py-1 text-xs text-slate-700 shadow-glass"
              >
                <Plus className="h-3.5 w-3.5" />
                新增条目
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-500">{hint}</p>
            <div className="space-y-3">
              {profile[key].map((entry) => (
                <EntryEditor
                  key={entry.id}
                  entry={entry}
                  onChange={(next) => patchEntry(key, entry.id, next)}
                  onRemove={() => removeEntry(key, entry.id)}
                />
              ))}
              {profile[key].length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                  暂无条目，点击「新增条目」添加
                </p>
              )}
            </div>
          </article>
        ))}

        <article className="glass-panel p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">🛠️</span>
            <Wrench className="h-4 w-4 text-teal-700" />
            <h3 className="font-medium text-slate-900">
              技能与证书 (Skills & Certificates)
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-500">
            已预填 Software / Language / BEAM Affiliate / CFA-ESG
          </p>
          <label className="mb-1 block text-[11px] font-medium text-slate-500">
            Software
          </label>
          <textarea
            value={profile.skillsSoftware}
            onChange={(e) =>
              updateProfileField("skillsSoftware", e.target.value)
            }
            rows={2}
            className="mb-2 w-full resize-y soft-textarea p-3"
          />
          <label className="mb-1 block text-[11px] font-medium text-slate-500">
            Language
          </label>
          <textarea
            value={profile.skillsLanguage}
            onChange={(e) =>
              updateProfileField("skillsLanguage", e.target.value)
            }
            rows={2}
            className="mb-2 w-full resize-y soft-textarea p-3"
          />
          <label className="mb-1 block text-[11px] font-medium text-slate-500">
            Certificate
          </label>
          <textarea
            value={profile.skillsCertificate}
            onChange={(e) =>
              updateProfileField("skillsCertificate", e.target.value)
            }
            rows={2}
            className="w-full resize-y soft-textarea p-3"
          />
        </article>

        <article className="glass-panel p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">💡</span>
            <Lightbulb className="h-4 w-4 text-teal-700" />
            <h3 className="font-medium text-slate-900">
              琐碎细节 (Quick Notes)
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-500">
            默认留空，供随时补充灵感与待量化亮点
          </p>
          <textarea
            value={profile.quickNotes}
            onChange={(e) => updateProfileField("quickNotes", e.target.value)}
            rows={8}
            placeholder="随时补充…"
            className="w-full resize-y soft-textarea p-3"
          />
        </article>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="soft-btn-primary px-8 py-3 font-semibold"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
        </button>
        <p className="text-center text-xs text-slate-400">
          已组合全量经历 {fullExperience.length} 字符 · 点击 Save
          立即同步 Upstash Redis
        </p>
      </div>
    </section>
  );
}
