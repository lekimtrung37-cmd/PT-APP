'use client';
import * as React from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { TemplateEditor } from '../_components/TemplateEditor';

type Props = {
  params: Promise<{ templateId: string }>;
  searchParams?: Promise<{ isPublic?: string }>;
};

export default function TrainerProgramTemplateEditorPage({ params, searchParams }: Props) {
  // We don't await here because this is a client component.
  // The editor component itself will handle the async nature.
  const paramValues = useParams();
  const searchParamValues = useSearchParams();

  const templateId = paramValues.templateId as string;
  const isPublic = searchParamValues.get('isPublic') === 'true';

  if (!templateId) {
    return <div>Đang tải giáo án...</div>;
  }

  return (
    <TemplateEditor 
        templateId={templateId}
        isPublic={isPublic}
    />
  );
}
