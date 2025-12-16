"use client";

import { usePathname, useRouter } from "next/navigation";

export default function QuickNav({ selectedProject }: { selectedProject?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const supervisorBasePath = selectedProject ? `/supervisor/projects/${selectedProject}` : "/supervisor/projects";
  const buildHref = (segment: string) => {
    if (!selectedProject) return supervisorBasePath;
    return `${supervisorBasePath}/${segment}?project_id=${selectedProject}`;
  };

  const navItems = [
    {
      key: "contributors",
      label: "Đóng góp",
      segment: "contributor",
      projectScoped: true,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      key: "progress",
      label: "Progress",
      segment: "progress-task",
      projectScoped: true,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="flex items-center gap-1 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/80 p-1 shadow-sm">
      {navItems.map((item) => {
        const disabled = !selectedProject && item.projectScoped;
        const href = buildHref(item.segment);
        const hrefWithoutQuery = href.split("?")[0];
        const isActive =
          pathname === hrefWithoutQuery || pathname?.startsWith(`${hrefWithoutQuery}/`);

        return (
          <button
            key={item.key}
            onClick={() => {
              if (!disabled) {
                router.push(href);
              }
            }}
            disabled={disabled}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              disabled
                ? "opacity-40 cursor-not-allowed text-gray-400"
                : isActive
                ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md"
                : "text-slate-700 hover:bg-slate-100 hover:text-indigo-600"
            }`}
            title={disabled ? "Vui lòng chọn project trước" : item.label}
          >
            {item.icon}
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
