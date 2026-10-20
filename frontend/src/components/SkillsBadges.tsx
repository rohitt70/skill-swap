'use client';

import React from 'react';

interface SkillItem {
  id?: string;
  type?: 'TEACH' | 'LEARN';
  proficiencyLevel?: string;
  skill?: {
    name: string;
    category?: string;
  };
  name?: string;
}

interface SkillsBadgesProps {
  skills: SkillItem[];
  type?: 'TEACH' | 'LEARN';
  maxDisplay?: number;
}

export function SkillsBadges({ skills, type, maxDisplay }: SkillsBadgesProps) {
  const filtered = type ? skills.filter((s) => s.type === type) : skills;
  const displayItems = maxDisplay ? filtered.slice(0, maxDisplay) : filtered;
  const remainingCount = maxDisplay && filtered.length > maxDisplay ? filtered.length - maxDisplay : 0;

  if (filtered.length === 0) {
    return <span className="text-xs text-slate-400 italic">None listed</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {displayItems.map((item, idx) => {
        const skillName = item.skill?.name || item.name || 'Skill';
        const isTeach = (item.type || type) === 'TEACH';
        return (
          <span
            key={item.id || idx}
            className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border transition ${
              isTeach
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
            }`}
          >
            {skillName}
            {item.proficiencyLevel && (
              <span className="ml-1 text-[10px] opacity-75 lowercase font-normal">
                ({item.proficiencyLevel.slice(0, 3)})
              </span>
            )}
          </span>
        );
      })}
      {remainingCount > 0 && (
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
}
