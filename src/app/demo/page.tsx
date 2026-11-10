'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '../../model';

const Editor = dynamic(() => import('../../App'), {
  ssr: false,
  loading: () => <div className="studio-loading" role="status">Opening luxury 3D design studio…</div>,
});

export default function DemoStudioPage() {
  const router = useRouter();
  const [project, setProject] = useState(() => createProject());
  return (
    <Editor
      key={project.id}
      initialProject={project}
      initialRevision={-1}
      onBack={() => router.push('/')}
      onCreateProject={() => setProject(createProject())}
    />
  );
}

