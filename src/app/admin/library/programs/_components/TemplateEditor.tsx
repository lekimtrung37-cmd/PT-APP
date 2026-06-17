

'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  useFirestore,
  useDoc,
  useCollection,
  useUser,
  useMemoFirebase,
} from '@/firebase';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  DocumentReference,
  orderBy,
  query,
  runTransaction,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, ArrowUp, ArrowDown, BookCopy, MoreHorizontal, ArrowLeft, Info, Copy, ChevronDown, Check, ChevronsUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';


// --- Zod Schemas ---
const exerciseBlockSchema = z.object({
  id: z.string().optional(),
  tenBaiTap: z.string().min(1, 'Tên bài tập không được để trống.'),
  sets: z.string().optional(),
  repsOrDuration: z.string().optional(),
  rpe: z.string().optional(),
  rest: z.string().optional(),
  tempo: z.string().optional(),
  loadKg: z.string().optional(),
  notes: z.string().optional(),
});


const sessionSchema = z.object({
  id: z.string().optional(),
  tieuDeBuoi: z.string().min(1, 'Tiêu đề không được để trống.'),
  exercises: z.array(exerciseBlockSchema),
  ghiChuPT: z.string().optional(),
});

type SessionFormData = z.infer<typeof sessionSchema>;

// --- Helper Components ---
const SectionForm = ({ control, name, label, fields, remove, move, append, isReadOnly, exerciseLibrary, openPopoverIndex, setOpenPopoverIndex }: any) => (
  <div className="space-y-4 rounded-lg border bg-background p-4">
    <h4 className="font-semibold">{label}</h4>
    {fields.map((field: any, index: number) => (
      <div key={field.id} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
        <div className="flex-1 grid grid-cols-12 gap-x-2 gap-y-2 items-start">
           <FormField
            control={control}
            name={`${name}.${index}.tenBaiTap`}
            render={({ field }) => (
                <FormItem className="col-span-12 md:col-span-3">
                    <FormLabel className="text-xs">Tên bài tập</FormLabel>
                     <Popover open={openPopoverIndex === `${name}-${index}`} onOpenChange={(isOpen) => setOpenPopoverIndex(isOpen ? `${name}-${index}` : null)}>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Input
                                    placeholder="Tìm hoặc nhập bài tập..."
                                    {...field}
                                    value={field.value ?? ''}
                                    readOnly={isReadOnly}
                                    onFocus={() => setOpenPopoverIndex(`${name}-${index}`)}
                                />
                            </FormControl>
                        </PopoverTrigger>
                        {!isReadOnly && (
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Tìm bài tập..." value={field.value ?? ''} onValueChange={field.onChange} />
                                    <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                    <CommandGroup>
                                    {exerciseLibrary?.map((ex: any) => (
                                        <CommandItem
                                        value={ex.displayName}
                                        key={ex.id}
                                        onSelect={() => {
                                            field.onChange(ex.displayName);
                                            setOpenPopoverIndex(null);
                                        }}
                                        >
                                        <Check
                                            className={cn(
                                            "mr-2 h-4 w-4",
                                            ex.displayName === field.value
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                        />
                                        {ex.displayName}
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        )}
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={control}
            name={`${name}.${index}.sets`}
            render={({ field }) => (
                <FormItem className="col-span-4 sm:col-span-2 md:col-span-1">
                    <FormLabel className="text-xs">Số hiệp</FormLabel>
                    <FormControl><Input type="text" placeholder="Sets" {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl>
                </FormItem>
            )}
            />
             <FormField
            control={control}
            name={`${name}.${index}.repsOrDuration`}
            render={({ field }) => (
                <FormItem className="col-span-4 sm:col-span-2 md:col-span-2">
                    <FormLabel className="text-xs">Số lần/Thời gian</FormLabel>
                    <FormControl><Input type="text" placeholder="10 | 30s" {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl>
                </FormItem>
            )}
            />
            <FormField
            control={control}
            name={`${name}.${index}.rpe`}
            render={({ field }) => (
                <FormItem className="col-span-4 sm:col-span-2 md:col-span-1">
                    <FormLabel className="text-xs">RPE</FormLabel>
                    <FormControl><Input type="text" placeholder="RPE" {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl>
                </FormItem>
            )}
            />
            <FormField
            control={control}
            name={`${name}.${index}.rest`}
            render={({ field }) => (
                <FormItem className="col-span-4 sm:col-span-2 md:col-span-1">
                    <FormLabel className="text-xs">Nghỉ (s)</FormLabel>
                    <FormControl><Input type="text" placeholder="Rest" {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl>
                </FormItem>
            )}
            />
            <FormField
            control={control}
            name={`${name}.${index}.tempo`}
            render={({ field }) => (
                <FormItem className="col-span-4 sm:col-span-2 md:col-span-1">
                    <FormLabel className="text-xs">Tempo</FormLabel>
                    <FormControl><Input type="text" placeholder="Tempo" {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl>
                </FormItem>
            )}
            />
            <FormField
            control={control}
            name={`${name}.${index}.loadKg`}
            render={({ field }) => (
                <FormItem className="col-span-4 sm:col-span-2 md:col-span-3">
                    <FormLabel className="text-xs">Khối Lượng (KG)</FormLabel>
                    <FormControl><Input type="text" placeholder="Load" {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl>
                </FormItem>
            )}
            />
            <FormField
              control={control}
              name={`${name}.${index}.notes`}
              render={({ field }) => (
                <FormItem className="col-span-12">
                  <FormLabel className="text-xs">Ghi chú</FormLabel>
                  <FormControl><Textarea placeholder="Ghi chú cho bài tập..." {...field} value={field.value ?? ''} readOnly={isReadOnly} rows={1} /></FormControl>
                </FormItem>
              )}
            />
        </div>
        {!isReadOnly && (
         <div className="flex flex-col items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(index, index - 1)} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(index, index + 1)} disabled={index === fields.length - 1}><ArrowDown className="h-4 w-4" /></Button>
        </div>
        )}
      </div>
    ))}
    {!isReadOnly && (
    <Button type="button" variant="outline" size="sm" onClick={() => append({ tenBaiTap: '', sets: '', repsOrDuration: '', rpe: '', rest: '', tempo: '', loadKg: '', notes: '' })}>
      <PlusCircle className="mr-2 h-4 w-4" />Thêm bài tập
    </Button>
    )}
  </div>
);


// --- Main Editor Component ---
interface TemplateEditorProps {
  templateId: string;
}

export function TemplateEditor({ templateId }: TemplateEditorProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userData, isLoading: isUserLoading } = useDoc<{ role: string }>(userDocRef);
  const userRole = userData?.role;
  
  const templateCollectionPath = 'programTemplatesPublic';
  
  const templateDocRef = useMemoFirebase(() => {
    if (!firestore || !templateId || !templateCollectionPath) return null;
    return doc(firestore, templateCollectionPath, templateId);
  }, [firestore, templateId, templateCollectionPath]);
  
  const { data: template, isLoading: isTemplateLoading } = useDoc<any>(templateDocRef);
  
  const sessionsQuery = useMemoFirebase(
    () => (templateDocRef ? query(collection(templateDocRef, 'sessions'), orderBy('thuTu', 'asc')) : null),
    [templateDocRef]
  );
  const { data: sessions, isLoading: areSessionsLoading } = useCollection<any>(sessionsQuery);

  const publicExercisesQuery = useMemoFirebase(() => 
      firestore ? collection(firestore, 'publicExercises') : null, [firestore]);
  const { data: publicExercises, isLoading: arePublicExercisesLoading } = useCollection(publicExercisesQuery, {
      transform: (data) => ({...data, displayName: data.ten})
  });

  const trainerExercisesQuery = useMemoFirebase(() => 
      firestore && user ? query(collection(firestore, `trainerExercises/${user.uid}/items`)) : null, [firestore, user]);
  const { data: trainerExercises, isLoading: areTrainerExercisesLoading } = useCollection(trainerExercisesQuery, {
      transform: (data) => ({...data, displayName: data.ten})
  });
  
  const exerciseLibrary = useMemo(() => {
    const combined = [
        ...(publicExercises || []),
        ...(trainerExercises || [])
    ];
    const unique = Array.from(new Map(combined.map(item => [item['displayName'], item])).values());
    return unique.sort((a,b) => a.displayName.localeCompare(b.displayName));
  }, [publicExercises, trainerExercises]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [templateName, setTemplateName] = React.useState('');

  useEffect(() => {
    if (template?.ten) {
      setTemplateName(template.ten);
    }
  }, [template]);

  const handleUpdateTemplateName = async () => {
    if (!templateDocRef || !templateName.trim()) return;
    setIsSubmitting(true);
    try {
      await updateDoc(templateDocRef, { ten: templateName });
      toast({ title: "Đã cập nhật tên giáo án!" });
    } catch (e) {
      console.error("Failed to update template name", e);
      toast({ variant: 'destructive', title: "Lỗi", description: "Không thể cập nhật tên giáo án." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSession = async () => {
    if (!templateDocRef) return;
    const newOrder = (sessions?.length || 0) + 1;
    await addDoc(collection(templateDocRef, 'sessions'), {
      thuTu: newOrder,
      tieuDeBuoi: `Buổi ${newOrder}`,
      exercises: [],
      ghiChuPT: '',
    });
  };

  const handleMoveSession = async (sessionId: string, direction: 'up' | 'down') => {
    if (!sessions || !firestore || !templateDocRef) return;
    const currentIndex = sessions.findIndex(s => s.id === sessionId);
    if (currentIndex === -1) return;
    
    const currentSession = sessions[currentIndex];
    let otherSession;
    if (direction === 'up' && currentIndex > 0) {
      otherSession = sessions[currentIndex - 1];
    } else if (direction === 'down' && currentIndex < sessions.length - 1) {
      otherSession = sessions[currentIndex + 1];
    } else {
      return; // Cannot move further
    }

    const batch = writeBatch(firestore);
    const currentSessionRef = doc(templateDocRef, 'sessions', currentSession.id);
    const otherSessionRef = doc(templateDocRef, 'sessions', otherSession.id);
    
    // Swap 'thuTu' values
    batch.update(currentSessionRef, { thuTu: otherSession.thuTu });
    batch.update(otherSessionRef, { thuTu: currentSession.thuTu });
    
    await batch.commit();
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!templateDocRef || !sessions || !firestore) return;
    
    const sessionRef = doc(templateDocRef, 'sessions', sessionId);
    
    await runTransaction(firestore, async (transaction) => {
        const sessionToDelete = sessions.find(s => s.id === sessionId);
        if (!sessionToDelete) throw new Error("Session not found");
        
        transaction.delete(sessionRef);

        sessions
            .filter(s => s.thuTu > sessionToDelete.thuTu)
            .forEach(s => {
                const subsequentSessionRef = doc(templateDocRef, 'sessions', s.id);
                transaction.update(subsequentSessionRef, { thuTu: s.thuTu - 1 });
            });
    });
  };

  const SessionFormWrapper = ({ session }: { session: any }) => {
    const sessionForm = useForm<SessionFormData>({
        resolver: zodResolver(sessionSchema),
        defaultValues: session,
    });
    
    const [openPopoverIndex, setOpenPopoverIndex] = useState<string | null>(null);

    useEffect(() => {
      sessionForm.reset(session);
    }, [session, sessionForm]);

    const { fields: exerciseFields, append: appendExercise, remove: removeExercise, move: moveExercise } = useFieldArray({ control: sessionForm.control, name: 'exercises' });
    
    const onSessionSubmit = async (data: SessionFormData) => {
        if (!templateDocRef) return;
        const { id, ...sessionData } = data;
        const sessionRef = doc(templateDocRef, 'sessions', session.id);
        await updateDoc(sessionRef, sessionData);
        toast({ title: 'Đã lưu buổi tập!' });
    };

    return (
        <Form {...sessionForm}>
            <form onSubmit={sessionForm.handleSubmit(onSessionSubmit)} className="space-y-6">
                 <div className="space-y-6">
                    <SectionForm control={sessionForm.control} name="exercises" label="Bài tập" fields={exerciseFields} append={appendExercise} remove={removeExercise} move={moveExercise} isReadOnly={false} exerciseLibrary={exerciseLibrary} openPopoverIndex={openPopoverIndex} setOpenPopoverIndex={setOpenPopoverIndex} />
                    <FormField control={sessionForm.control} name="ghiChuPT" render={({ field }) => (<FormItem><FormLabel>Ghi chú cho buổi tập</FormLabel><FormControl><Textarea placeholder="Lưu ý chung cho cả buổi tập..." {...field} value={field.value ?? ''} readOnly={false}/></FormControl></FormItem>)} />
                </div>
                 <Button type="submit" disabled={sessionForm.formState.isSubmitting}>
                    {sessionForm.formState.isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                     Lưu thay đổi buổi tập
                </Button>
            </form>
        </Form>
    )
  }

  const isLoading = isTemplateLoading || areSessionsLoading || isUserLoading || arePublicExercisesLoading || areTrainerExercisesLoading;

  if (isLoading) {
    return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  }

  if (!template) {
    return <div className="p-6">Lỗi không tìm thấy giáo án.</div>;
  }

  return (
    <div className="w-full">
        <div className="flex items-center gap-4 mb-4">
             <Button variant="outline" size="icon" asChild>
                <Link href={userRole === 'admin' ? '/admin/library/programs' : '/trainer/library/programs'}>
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <Input 
                className="text-xl font-bold h-auto p-2 border-0 focus-visible:ring-1 focus-visible:ring-ring"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                onBlur={handleUpdateTemplateName}
                disabled={isSubmitting}
            />
            <div className="flex-grow" />
            <Button variant="outline" size="sm" onClick={handleAddSession} disabled={isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" />Thêm buổi tập
            </Button>
        </div>
        
        <Accordion type="multiple" className="w-full space-y-3">
            {sessions?.map((session, index) => (
                <AccordionItem value={session.id} key={session.id} className="border-b-0">
                    <Card>
                       <div className="flex items-center p-4">
                            <AccordionTrigger className="flex-1 p-0 hover:no-underline font-semibold text-lg">
                               {session.tieuDeBuoi}
                            </AccordionTrigger>
                            <div className="flex items-center gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMoveSession(session.id, 'up')} disabled={index === 0}>
                                    <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMoveSession(session.id, 'down')} disabled={index === sessions.length - 1}>
                                    <ArrowDown className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
                                            <AlertDialogDescription>Hành động này sẽ xóa vĩnh viễn buổi tập "{session.tieuDeBuoi}".</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteSession(session.id)}>Xóa</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                        <AccordionContent className="p-4 pt-0">
                            <SessionFormWrapper session={session} />
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            ))}
        </Accordion>
    </div>
  );
}
