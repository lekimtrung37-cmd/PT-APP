
'use client';
import * as React from 'react';
import { useParams } from 'next/navigation';
import { TemplateEditor } from '../_components/TemplateEditor';

export default function AdminProgramTemplateEditorPage() {
  const params = useParams();
  const templateId = params.templateId as string;
  
  if (!templateId) {
    return <div className="p-6">Đang tải giáo án...</div>
  }

  // Admin always works with public templates
  return (
    <TemplateEditor 
        templateId={templateId}
    />
  );
}
