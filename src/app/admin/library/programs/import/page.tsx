
'use client';
import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, FileUp, FileCheck, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


// --- TYPE DEFINITIONS ---
interface ParsedRow {
  rowIndex: number;
  data: Record<string, any>;
  status: 'valid' | 'warning' | 'error';
  messages: string[];
}

interface MappedHeader {
    key: string;
    original: string;
}

// Define the shape of a single exercise after parsing
type ProgramExercise = {
    tenBaiTap: string;
    sets: string | null;
    repsOrDuration: string | null;
    rpe: string | null;
    rest: string | null;
    tempo: string | null;
    loadKg: string | null;
    notes: string | null;
}

const BATCH_SIZE = 490; // Firestore batch limit is 500 writes, we are safe with this

// --- HEADER MAPPING LOGIC ---
const headerAliases: { [key: string]: string[] } = {
  sessionTitle: ["tên buổi tập", "buổi", "workout", "workout name", "session", "week"],
  exerciseName: ["tên bài tập", "bài tập", "exercise", "exercise name"],
  sets: ["số hiệp", "hiệp", "sets", "set"],
  reps: ["số lần", "reps", "rep"],
  duration: ["thời gian", "time", "duration"],
  rpe: ["rpe"],
  rest: ["nghỉ(s)", "nghỉ", "rest(s)", "rest"],
  tempo: ["tempo"],
  load: ["khối lượng(kg)", "khối lượng", "weight(kg)", "load", "kg"],
  notes: ["ghi chú", "note", "notes"],
};

function normalizeHeader(header: string): string {
    return (header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// --- MAIN COMPONENT ---
export default function AdminImportProgramPage() {
  const { user: admin, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Form state for template metadata
  const [tenGiaoAn, setTenGiaoAn] = useState('');
  const [moTaNgan, setMoTaNgan] = useState('');

  const validRows = parsedData.filter(row => row.status !== 'error');
  const warningRows = parsedData.filter(row => row.status === 'warning');
  const errorRows = parsedData.filter(row => row.status === 'error');


  const processParsedData = (data: Record<string, any>[], rawHeaders: string[]) => {
    const headers = rawHeaders.map(h => normalizeHeader(h));
    
    const hasExerciseName = headers.some(h => headerAliases.exerciseName.map(normalizeHeader).includes(h));
    if (!hasExerciseName) {
        toast({ variant: 'destructive', title: 'Lỗi Header', description: `File phải có cột "Tên bài tập" hoặc một trong các alias của nó.` });
        setIsParsing(false);
        return;
    }

    let currentSessionTitle = '';
    const processedData: ParsedRow[] = [];

    data.forEach((row, index) => {
        const aliasedRow: Record<string, any> = {};
        for(const key in row) {
            const aliasKey = Object.keys(headerAliases).find(k => headerAliases[k].map(normalizeHeader).includes(key));
            if(aliasKey) {
                aliasedRow[aliasKey] = row[key];
            }
        }

        const sessionTitle = (aliasedRow.sessionTitle || '').trim();
        const exerciseName = (aliasedRow.exerciseName || '').trim();

        if (sessionTitle) {
            currentSessionTitle = sessionTitle;
        }

        if (!exerciseName && !sessionTitle) {
            return; // Skip rows without an exercise name or session title
        }
         if (!exerciseName) {
            processedData.push({ 
                rowIndex: index + 2, 
                data: { sessionTitle: currentSessionTitle },
                status: 'valid', 
                messages: []
            });
            return;
        }

        const { data: finalData, messages } = validateAndTransformRow(aliasedRow);
        
        if (!finalData.sessionTitle && currentSessionTitle) {
            finalData.sessionTitle = currentSessionTitle;
        }

        let status: ParsedRow['status'] = 'valid';
        if (messages.length > 0) status = 'warning';
        if (!finalData.exerciseName || !finalData.sessionTitle) {
            status = 'error';
            messages.push('Thiếu Tên buổi tập hoặc Tên bài tập.');
        }
        
        processedData.push({ 
            rowIndex: index + 2, 
            data: finalData,
            status, 
            messages
        });
    });
    
    if (processedData.length === 0) {
        toast({ variant: 'destructive', title: 'Không có dữ liệu', description: 'Không tìm thấy dòng dữ liệu hợp lệ nào trong file.' });
    }

    setParsedData(processedData);
    setIsParsing(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setParsedData([]);
    setImportProgress(0);

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => normalizeHeader(header),
        complete: (results) => {
          processParsedData(results.data as Record<string, any>[], results.meta.fields || []);
        },
        error: (error) => {
          toast({ variant: 'destructive', title: 'Lỗi Phân tích CSV', description: error.message });
          setIsParsing(false);
        },
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          const rawHeaders: string[] = (XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[]) || [];
          const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

          const normalizedJsonData = jsonData.map(row => {
              const normalizedRow: Record<string, any> = {};
              for (const key in row) {
                  normalizedRow[normalizeHeader(key)] = row[key];
              }
              return normalizedRow;
          });

          processParsedData(normalizedJsonData, rawHeaders);

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Lỗi Phân tích Excel', description: 'Không thể đọc file excel.' });
            setIsParsing(false);
        }
      };
      reader.readAsBinaryString(file);
    } else {
        toast({
            variant: 'destructive',
            title: 'Định dạng file không hợp lệ',
            description: 'Vui lòng tải lên file CSV hoặc Excel (.xls, .xlsx).',
        });
        setIsParsing(false);
    }
  };

  const validateAndTransformRow = (row: Record<string, any>): { data: Record<string, any>, messages: string[] } => {
      const messages: string[] = [];
      const transformedData: Record<string, any> = { ...row };

      const stringFields = ['reps', 'duration', 'rpe', 'tempo', 'rest', 'notes', 'sets', 'load'];
      stringFields.forEach(field => {
          if (row[field] !== undefined && row[field] !== null) {
              transformedData[field] = String(row[field]).trim();
          } else {
              transformedData[field] = null;
          }
      });

      // Handle reps/duration logic
      if (transformedData.reps && transformedData.duration) {
          transformedData.repsOrDuration = transformedData.reps;
          const currentNotes = transformedData.notes || '';
          transformedData.notes = `Thời gian: ${transformedData.duration}. ${currentNotes}`.trim();
      } else {
          transformedData.repsOrDuration = transformedData.reps || transformedData.duration || null;
      }
      
      transformedData.loadKg = transformedData.load || null;

      return { data: transformedData, messages };
  };

  const handleImport = async () => {
    if (!admin || !firestore || validRows.length === 0 || !tenGiaoAn) {
      toast({ variant: 'destructive', title: 'Thiếu thông tin', description: 'Vui lòng chọn file hợp lệ và nhập tên giáo án.' });
      return;
    }
    setIsSubmitting(true);
    setImportProgress(0);
    
    try {
        const publicTemplatesRef = collection(firestore, 'programTemplatesPublic');
        const newTemplateDocRef = doc(publicTemplatesRef);
        
        const sessionsMap = new Map<string, ProgramExercise[]>();
        
        validRows.forEach(row => {
            const sessionTitle = row.data.sessionTitle;
            if (!sessionTitle) return;

            if (!sessionsMap.has(sessionTitle)) {
                sessionsMap.set(sessionTitle, []);
            }

            if (row.data.exerciseName) {
                const exercise: ProgramExercise = {
                    tenBaiTap: row.data.exerciseName,
                    sets: row.data.sets ?? null,
                    repsOrDuration: row.data.repsOrDuration ?? null,
                    rpe: row.data.rpe ?? null,
                    rest: row.data.rest ?? null,
                    tempo: row.data.tempo ?? null,
                    loadKg: row.data.loadKg ?? null,
                    notes: row.data.notes ?? null,
                };
                sessionsMap.get(sessionTitle)!.push(exercise);
            }
        });

        // Create batches of writes
        const batches = [];
        let currentBatch = writeBatch(firestore);
        let writeCount = 1; // Start with 1 for the main template doc

        currentBatch.set(newTemplateDocRef, {
            ten: tenGiaoAn,
            moTaNgan: moTaNgan,
            createdByAdminId: admin.uid,
            ownerType: 'admin',
            taoLuc: serverTimestamp(),
            capNhatLuc: serverTimestamp(),
            isHidden: false, // Ensure new templates are visible by default
        });
        
        let sessionOrder = 1;
        for (const [sessionTitle, exercises] of sessionsMap.entries()) {
            const sessionDocRef = doc(collection(newTemplateDocRef, 'sessions'));
            
            currentBatch.set(sessionDocRef, {
                thuTu: sessionOrder++,
                tieuDeBuoi: sessionTitle,
                exercises: exercises,
                ghiChuPT: ""
            });
            writeCount++;

            if (writeCount >= BATCH_SIZE) {
                batches.push(currentBatch);
                currentBatch = writeBatch(firestore);
                writeCount = 0;
            }
        }
        if (writeCount > 0) {
            batches.push(currentBatch);
        }

        // Commit all batches
        for (let i = 0; i < batches.length; i++) {
            await batches[i].commit();
            setImportProgress(((i + 1) / batches.length) * 100);
        }

        toast({
            title: 'Import thành công!',
            description: `Đã tạo giáo án "${tenGiaoAn}" với ${sessionsMap.size} buổi tập.`,
        });
        
        setFileName(null);
        setParsedData([]);
        setTenGiaoAn('');
        setMoTaNgan('');

    } catch (error) {
        console.error("Import failed:", error);
        toast({ variant: 'destructive', title: 'Import thất bại', description: 'Đã có lỗi xảy ra khi ghi dữ liệu vào Firestore.' });
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/admin/library/programs"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
            <h1 className="text-3xl font-bold font-headline">Import Giáo án từ File</h1>
            <p className="text-muted-foreground">Tải lên một file CSV hoặc Excel để tạo hàng loạt giáo án mẫu.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bước 1: Chọn và Tải File</CardTitle>
          <CardDescription>
            Chọn file CSV hoặc Excel (.xlsx, .xls). Đảm bảo file tuân thủ đúng định dạng.
             <Button variant="link" asChild className="p-0 h-auto ml-1">
                <a href="/sample-program-import-v2.csv" download>Tải file mẫu</a>
             </Button>
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                 <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={isParsing}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Chọn file
                </Button>
                <Input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                {isParsing && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" />Đang phân tích file...</p>}
                {fileName && !isParsing && <p className="text-sm font-medium flex items-center gap-2"><FileCheck className="h-4 w-4 text-green-500" />{fileName}</p>}
            </div>
        </CardContent>
      </Card>
      
       {parsedData.length > 0 && (
         <Card>
            <CardHeader>
                <CardTitle>Bước 2: Xem trước và Xác nhận</CardTitle>
                <CardDescription>Kiểm tra dữ liệu đã được phân tích. Các dòng lỗi sẽ không được import.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h3 className="font-semibold text-green-800 flex items-center gap-2"><CheckCircle className="h-5 w-5"/>{validRows.length} dòng hợp lệ</h3>
                    </div>
                     <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h3 className="font-semibold text-yellow-800 flex items-center gap-2"><AlertCircle className="h-5 w-5"/>{warningRows.length} dòng có cảnh báo</h3>
                    </div>
                     <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <h3 className="font-semibold text-red-800 flex items-center gap-2"><AlertCircle className="h-5 w-5"/>{errorRows.length} dòng lỗi</h3>
                    </div>
                </div>

                 <ScrollArea className="h-72 w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Dòng</TableHead>
                                <TableHead>Buổi tập</TableHead>
                                <TableHead>Bài tập</TableHead>
                                <TableHead>HiệpxLần</TableHead>
                                <TableHead>Trạng thái</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {parsedData.map(row => (
                                <TableRow key={row.rowIndex} className={row.status === 'error' ? 'bg-red-50' : row.status === 'warning' ? 'bg-yellow-50' : ''}>
                                    <TableCell>{row.rowIndex}</TableCell>
                                    <TableCell>{row.data.sessionTitle || '-'}</TableCell>
                                    <TableCell>{row.data.exerciseName || '-'}</TableCell>
                                    <TableCell>{row.data.sets || '-'}{row.data.repsOrDuration ? `x${row.data.repsOrDuration}` : ''}</TableCell>
                                    <TableCell>
                                        {row.status === 'valid' && <Badge variant="default" className="bg-green-100 text-green-800">Hợp lệ</Badge> }
                                        {row.status === 'warning' && (
                                            <Popover>
                                                <PopoverTrigger asChild><Badge variant="outline" className="bg-yellow-100 text-yellow-800 cursor-pointer">Cảnh báo</Badge></PopoverTrigger>
                                                <PopoverContent className="w-80 text-sm"><div className="space-y-1"><p className="font-semibold">Cảnh báo tại dòng {row.rowIndex}:</p><ul className="list-disc pl-4">{row.messages.map((err, i) => <li key={i}>{err}</li>)}</ul></div></PopoverContent>
                                            </Popover>
                                        )}
                                        {row.status === 'error' && (
                                             <Popover>
                                                <PopoverTrigger asChild><Badge variant="destructive" className="cursor-pointer">Lỗi</Badge></PopoverTrigger>
                                                <PopoverContent className="w-80 text-sm"><div className="space-y-1"><p className="font-semibold">Lỗi tại dòng {row.rowIndex}:</p><ul className="list-disc pl-4">{row.messages.map((err, i) => <li key={i}>{err}</li>)}</ul></div></PopoverContent>
                                            </Popover>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </ScrollArea>
            </CardContent>
         </Card>
       )}

       {validRows.length > 0 && (
         <Card>
            <CardHeader>
                <CardTitle>Bước 3: Nhập thông tin và Import</CardTitle>
                <CardDescription>Cung cấp thông tin tổng quan cho giáo án này.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="template-name">Tên Giáo án (Bắt buộc)</Label>
                    <Input id="template-name" value={tenGiaoAn} onChange={e => setTenGiaoAn(e.target.value)} placeholder="Ví dụ: Tăng cơ 6 buổi/tuần" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="template-desc">Mô tả ngắn (Tùy chọn)</Label>
                    <Textarea id="template-desc" value={moTaNgan} onChange={e => setMoTaNgan(e.target.value)} placeholder="Mô tả mục tiêu của giáo án này" />
                </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
                <Button onClick={handleImport} disabled={isSubmitting || !tenGiaoAn}>
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <FileCheck className="mr-2 h-4 w-4" />}
                    Import {validRows.length} dòng hợp lệ
                </Button>
                 {isSubmitting && (
                    <div className="w-full">
                        <Progress value={importProgress} className="w-full" />
                        <p className="text-xs text-muted-foreground mt-1">Đang ghi dữ liệu vào Firestore... ({Math.round(importProgress)}%)</p>
                    </div>
                )}
            </CardFooter>
         </Card>
       )}
    </div>
  );
}
