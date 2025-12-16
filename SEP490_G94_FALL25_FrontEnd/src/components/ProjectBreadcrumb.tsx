"use client";

import { useRouter } from "next/navigation";
import { Box, Breadcrumbs, Link, Typography, Chip } from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import HomeIcon from "@mui/icons-material/Home";
import FlagIcon from "@mui/icons-material/Flag";
import StarIcon from "@mui/icons-material/Star";
import SettingsIcon from "@mui/icons-material/Settings";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

type BreadcrumbItem = {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
};

type ProjectBreadcrumbProps = {
  projectId: string;
  projectName?: string;
  items?: BreadcrumbItem[];
};

export default function ProjectBreadcrumb({ 
  projectId, 
  projectName = "Project",
  items = [] 
}: ProjectBreadcrumbProps) {
  const router = useRouter();

  const defaultItems: BreadcrumbItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <HomeIcon sx={{ fontSize: 16 }} />,
    },
   
  ];

  const allItems = [...defaultItems, ...items];

  return (
    <Box sx={{ mb: 3 }}>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" sx={{ color: '#9ca3af' }} />}
        sx={{
          fontSize: '13px',
          '& .MuiBreadcrumbs-separator': {
            mx: 1,
          },
        }}
      >
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;

          if (isLast || !item.href) {
            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  color: isLast ? '#1f2937' : '#6b7280',
                  fontWeight: isLast ? 600 : 500,
                }}
              >
                {item.icon}
                <Typography
                  sx={{
                    fontSize: '13px',
                    fontWeight: isLast ? 600 : 500,
                    color: 'inherit',
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            );
          }

          return (
            <Link
              key={index}
              underline="hover"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                '&:hover': {
                  color: '#7b68ee',
                },
                transition: 'color 0.2s',
              }}
              onClick={() => router.push(item.href!)}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}

// Helper function to get icon by type
export function getBreadcrumbIcon(type: string) {
  const icons: Record<string, React.ReactNode> = {
    milestone: <FlagIcon sx={{ fontSize: 16 }} />,
    feature: <StarIcon sx={{ fontSize: 16 }} />,
    function: <SettingsIcon sx={{ fontSize: 16 }} />,
    task: <CheckCircleIcon sx={{ fontSize: 16 }} />,
  };
  return icons[type] || null;
}

