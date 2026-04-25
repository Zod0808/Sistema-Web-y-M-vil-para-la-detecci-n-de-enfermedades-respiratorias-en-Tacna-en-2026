"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Download,
  Share2,
  Loader2,
  X
} from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import { reportService, type MedicalReport } from "@/lib/api/services/reportService"
import { ReportShareScreen } from "./ReportShareScreen"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface MedicalReportScreenProps {
  reportId: string
  onBack?: () => void
}

export function MedicalReportScreen({ reportId, onBack }: MedicalReportScreenProps) {
  const [report, setReport] = useState<MedicalReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [showShare, setShowShare] = useState(false)

  useEffect(() => {
    loadReport()
  }, [reportId])

  const loadReport = async () => {
    try {
      setLoading(true)
      const data = await reportService.getReport(reportId)
      setReport(data)
    } catch (error: any) {
      toast.error("Error al cargar el reporte", {
        description: error.message || "No se pudo cargar la información del reporte"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      toast.loading("Generando PDF...")
      const blob = await reportService.downloadPDF(reportId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-${report?.title || reportId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success("PDF descargado correctamente")
    } catch (error: any) {
      toast.error("Error al descargar PDF", {
        description: error.message || "No se pudo descargar el PDF del reporte"
      })
    }
  }

  if (showShare) {
    return (
      <ReportShareScreen
        reportId={reportId}
        onBack={() => setShowShare(false)}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <X className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Reporte no encontrado</h2>
        <p className="text-muted-foreground text-center mb-4">
          No se pudo cargar la información del reporte
        </p>
        {onBack && (
          <ModernButton onClick={onBack} variant="outline">
            Volver
          </ModernButton>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        {onBack && (
          <ModernButton
            onClick={onBack}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </ModernButton>
        )}
        
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">{report.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{report.patientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(report.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <ModernButton
              onClick={handleDownloadPDF}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </ModernButton>
            <ModernButton
              onClick={() => setShowShare(true)}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartir
            </ModernButton>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <ModernCard className="mb-6">
        <div className="p-6">
          <div className="prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap">
              {report.content}
            </div>
          </div>
        </div>
      </ModernCard>

      {/* Report Metadata */}
      <ModernCard>
        <div className="p-4">
          <h3 className="font-semibold mb-4">Información del Reporte</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Tipo:</span>
              <p className="font-medium capitalize">
                {report.reportType.replace('_', ' ')}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Creado:</span>
              <p className="font-medium">
                {format(new Date(report.createdAt), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
              </p>
            </div>
            {report.signedAt && (
              <>
                <div>
                  <span className="text-muted-foreground">Firmado:</span>
                  <p className="font-medium">
                    {format(new Date(report.signedAt), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                </div>
                {report.signedBy && (
                  <div>
                    <span className="text-muted-foreground">Firmado por:</span>
                    <p className="font-medium">{report.signedBy}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </ModernCard>
    </div>
  )
}

