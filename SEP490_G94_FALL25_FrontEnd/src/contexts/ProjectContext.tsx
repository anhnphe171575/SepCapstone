"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useParams, usePathname } from 'next/navigation';

interface ProjectContextType {
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);
    
    if (id && pathname?.includes('/projects/')) {
      setProjectId(id);
      setIsLoading(false);
    } else {
      const savedProjectId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentProjectId') 
        : null;
      
      if (savedProjectId) {
        setProjectId(savedProjectId);
      }
      setIsLoading(false);
    }
  }, [params, pathname]);

  useEffect(() => {
    if (projectId && typeof window !== 'undefined') {
      localStorage.setItem('currentProjectId', projectId);
    }
  }, [projectId]);

  const value: ProjectContextType = {
    projectId,
    setProjectId,
    isLoading,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

