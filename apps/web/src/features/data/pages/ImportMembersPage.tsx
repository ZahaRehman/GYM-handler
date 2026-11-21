import Papa from 'papaparse'
import { AlertCircle, ArrowLeft, CheckCircle2, Download, FileUp, Loader2, TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { useGymToday } from '@/features/members/hooks'
import { formatPhone } from '@/features/members/utils'
import { downloadCsv, toCsv } from '@/lib/csv'
import { formatDate, formatMoney } from '@/lib/format'
import { queryKeys } from '@/lib/queryKeys'
import { fetchExistingPhones, insertMembers } from '../api'
import { normalizeHeader, TEMPLATE_EXAMPLE, TEMPLATE_HEADERS, validateRows, type ImportRow } from '../importMembers'

const MAX_ROWS = 5000

export function ImportMembersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { today, currency } = useGymToday()
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [ignoredColumns, setIgnoredColumns] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)

  const ready = rows?.filter((r) => r.payload) ?? []
  const problems = rows?.filter((r) => !r.payload) ?? []
  const warned = ready.filter((r) => r.warnings.length)

  const downloadTemplate = () => downloadCsv('members_template.csv', toCsv([...TEMPLATE_HEADERS], [TEMPLATE_EXAMPLE]))

  const onFile = (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    setRows(null)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => normalizeHeader(h) ?? `__ignored__${h.trim()}`,
      complete: async (res) => {
        const ignored = (res.meta.fields ?? []).filter((f) => f.startsWith('__ignored__')).map((f) => f.slice(11)).filter(Boolean)
        setIgnoredColumns(ignored)
        if (!res.meta.fields?.includes('full_name') || !res.meta.fields?.includes('phone')) {
          toast.error('The file needs at least a name column and a phone column. Download the template to see the format.')
          return
        }
        if (res.data.length > MAX_ROWS) {
          toast.error(`Too many rows (${res.data.length}). Split the file into parts of ${MAX_ROWS}.`)
          return
        }
        try {
          const existingPhones = await fetchExistingPhones()
          setRows(validateRows(res.data, { existingPhones, today }))
        } catch (e) {
          toast.error((e as Error).message)
        }
      },
      error: (err) => toast.error(`Could not read the file: ${err.message}`),
    })
  }

  const runImport = async () => {
    setBusy(true)
    setProgress(0)
    try {
      const n = await insertMembers(ready.map((r) => r.payload!), setProgress)
      qc.invalidateQueries({ queryKey: queryKeys.members.all })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      toast.success(`${n} members imported`)
      navigate('/members')
    } catch (e) {
      toast.error((e as Error).message)
      qc.invalidateQueries({ queryKey: queryKeys.members.all })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="-mt-2 mb-2"><Button variant="ghost" size="sm" render={<Link to="/settings" />}><ArrowLeft /> Settings</Button></div>
      <PageHeader title="Import members" description="Move your existing register into the app from a spreadsheet" />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>1. Prepare the file</CardTitle>
            <CardDescription>
              Download the template, fill one member per row, then in Excel or Google Sheets choose <b>File → Save as / Download → CSV</b>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Button variant="outline" onClick={downloadTemplate}><Download /> Download template</Button>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li><b>full_name</b>, <b>phone</b> and <b>fee</b> (monthly) are required. Phones like 0300 1234567 are fine.</li>
              <li><b>next_due_date</b>: when they must pay next. Dates like 31/01/2026 or 2026-01-31 both work.</li>
              <li>Members whose phone already exists are skipped, so importing the same file twice is safe.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Choose the CSV file</CardTitle></CardHeader>
          <CardContent>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
            <Button onClick={() => fileRef.current?.click()} disabled={busy}><FileUp /> {fileName ? 'Choose another file' : 'Choose file'}</Button>
            {fileName && <span className="ml-3 text-sm text-muted-foreground">{fileName}</span>}
            {ignoredColumns.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">Ignored columns: {ignoredColumns.join(', ')}</p>
            )}
          </CardContent>
        </Card>

        {rows && (
          <Card>
            <CardHeader>
              <CardTitle>3. Check and import</CardTitle>
              <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-4" /> {ready.length} ready</span>
                {problems.length > 0 && <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><AlertCircle className="size-4" /> {problems.length} with problems (will be skipped)</span>}
                {warned.length > 0 && <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"><TriangleAlert className="size-4" /> {warned.length} with warnings</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {problems.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40">
                  <p className="mb-2 font-medium">Fix these rows in your file and choose it again, or import the rest now:</p>
                  <ul className="max-h-60 space-y-1 overflow-y-auto">
                    {problems.map((r) => <li key={r.line}><b>Row {r.line}</b> ({r.name}): {r.errors.join('; ')}</li>)}
                  </ul>
                </div>
              )}
              {ready.length > 0 && (
                <div className="-mx-4 overflow-x-auto sm:mx-0">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="pl-4 sm:pl-2">Row</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead>
<TableHead className="text-right">Fee</TableHead><TableHead>Next due</TableHead><TableHead>Note</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {ready.slice(0, 50).map((r) => (
                        <TableRow key={r.line}>
                          <TableCell className="pl-4 text-muted-foreground sm:pl-2">{r.line}</TableCell>
                          <TableCell className="font-medium">{r.payload!.full_name}</TableCell>
                          <TableCell className="tabular-nums">{formatPhone(r.payload!.phone)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(r.payload!.fee_amount, currency)}</TableCell>
                          <TableCell>{formatDate(r.payload!.next_due_date)}</TableCell>
                          <TableCell className="text-xs text-amber-700 dark:text-amber-400">{r.warnings.join('; ')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {ready.length > 50 && <p className="mt-2 text-center text-xs text-muted-foreground">…and {ready.length - 50} more</p>}
                </div>
              )}
              <div className="flex justify-end">
                <Button className="h-10" disabled={!ready.length || busy} onClick={runImport}>
                  {busy ? <><Loader2 className="animate-spin" /> Importing {progress}/{ready.length}</> : `Import ${ready.length} member${ready.length === 1 ? '' : 's'}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
