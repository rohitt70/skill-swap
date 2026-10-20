'use client';

import React from 'react';
import {
  Linkedin,
  Github,
  Globe,
  Twitter,
  ExternalLink,
  Briefcase,
} from 'lucide-react';

interface SocialLink {
  id?: string;
  platform: string;
  url: string;
}

interface SocialLinksViewProps {
  links: SocialLink[];
  className?: string;
}

export function SocialLinksView({ links, className = '' }: SocialLinksViewProps) {
  if (!links || links.length === 0) return null;

  const getPlatformIcon = (platform: string) => {
    switch (platform.toUpperCase()) {
      case 'LINKEDIN':
        return <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />;
      case 'GITHUB':
        return <Github className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200" />;
      case 'TWITTER':
        return <Twitter className="w-3.5 h-3.5 text-[#1DA1F2]" />;
      case 'PORTFOLIO':
        return <Briefcase className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />;
    }
  };

  const getLabel = (platform: string) => {
    switch (platform.toUpperCase()) {
      case 'LINKEDIN':
        return 'LinkedIn';
      case 'GITHUB':
        return 'GitHub';
      case 'TWITTER':
        return 'Twitter';
      case 'PORTFOLIO':
        return 'Portfolio';
      default:
        return platform;
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {links.map((link, idx) => {
        let safeUrl = link.url;
        if (!/^https?:\/\//i.test(safeUrl)) {
          safeUrl = `https://${safeUrl}`;
        }
        return (
          <a
            key={link.id || idx}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition border border-slate-200/80 dark:border-slate-700"
            title={`${getLabel(link.platform)} - ${safeUrl}`}
          >
            {getPlatformIcon(link.platform)}
            <span>{getLabel(link.platform)}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
          </a>
        );
      })}
    </div>
  );
}
