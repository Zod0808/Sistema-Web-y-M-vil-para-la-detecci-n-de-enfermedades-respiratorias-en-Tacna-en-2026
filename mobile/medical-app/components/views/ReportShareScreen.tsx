"use client"

import { useState, useEffect } from "react"
import {
  Share2,
  Mail,
  MessageCircle,
  Link as LinkIcon,
  Download,
  FileText,
  Check,
  X,
  Loader2,
  Copy
} from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import { reportService, type MedicalReport } from "@/lib/api/services/reportService"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ReportShareScreenProps {
  reportId: string
  onBack?: () => void
}

export function ReportShareScreen({ reportId, onBack }: ReportShareScreenProps) {
  const [report, setReport] = useState<MedicalReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

  const handleGeneratePDF = async () => {
    try {
      setSharing('pdf')
      const result = await reportService.generatePDF(reportId)
      toast.success("PDF generado correctamente")
      
      // Descargar el PDF
      const blob = await reportService.downloadPDF(reportId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-${report?.title || reportId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      toast.error("Error al generar PDF", {
        description: error.message || "No se pudo generar el PDF del reporte"
      })
    } finally {
      setSharing(null)
    }
  }

  const handleGetShareLink = async () => {
    try {
      setSharing('link')
      const result = await reportService.getShareableLink(reportId)
      setShareUrl(result.shareUrl)
      toast.success("Enlace generado correctamente")
    } catch (error: any) {
      toast.error("Error al generar enlace", {
        description: error.message || "No se pudo generar el enlace compartible"
      })
    } finally {
      setSharing(null)
    }
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("Enlace copiado al portapapeles")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Error al copiar enlace")
    }
  }

  const handleShareWhatsApp = async () => {
    try {
      setSharing('whatsapp')
      
      // Primero obtener el enlace compartible
      if (!shareUrl) {
        const result = await reportService.getShareableLink(reportId)
        setShareUrl(result.shareUrl)
      }

      const message = encodeURIComponent(
        `📋 Reporte Médico - ${report?.title}\n\n` +
        `Compartido desde RespiCare\n\n` +
        `${shareUrl || ''}`
      )

      // Intentar abrir WhatsApp
      const whatsappUrl = `https://wa.me/?text=${message}`
      window.open(whatsappUrl, '_blank')
      
      toast.success("WhatsApp abierto")
    } catch (error: any) {
      toast.error("Error al compartir por WhatsApp", {
        description: error.message || "No se pudo abrir WhatsApp"
      })
    } finally {
      setSharing(null)
    }
  }

  const handleShareEmail = async () => {
    try {
      setSharing('email')
      
      // Primero obtener el enlace compartible
      if (!shareUrl) {
        const result = await reportService.getShareableLink(reportId)
        setShareUrl(result.shareUrl)
      }

      const subject = encodeURIComponent(`Reporte Médico - ${report?.title}`)
      const body = encodeURIComponent(
        `Hola,\n\n` +
        `Te comparto mi reporte médico de RespiCare:\n\n` +
        `Título: ${report?.title}\n` +
        `Fecha: ${report?.createdAt ? format(new Date(report.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A'}\n\n` +
        `Puedes ver el reporte completo en:\n${shareUrl || ''}\n\n` +
        `Saludos`
      )

      const mailtoUrl = `mailto:?subject=${subject}&body=${body}`
      window.location.href = mailtoUrl
      
      toast.success("Cliente de email abierto")
    } catch (error: any) {
      toast.error("Error al compartir por email", {
        description: error.message || "No se pudo abrir el cliente de email"
      })
    } finally {
      setSharing(null)
    }
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
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        {onBack && (
          <ModernButton
            onClick={onBack}
            variant="ghost"
            className="mb-4"
          >
            ← Volver
          </ModernButton>
        )}
        <h1 className="text-2xl font-bold mb-2">Compartir Reporte</h1>
        <p className="text-muted-foreground">
          Comparte tu reporte médico de forma segura
        </p>
      </div>

      <ModernCard className="mb-6">
        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg mb-1">{report.title}</h2>
              <p className="text-sm text-muted-foreground mb-2">
                {report.patientName}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(report.createdAt), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
              </p>
              {report.signedAt && (
                <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  <span>Firmado digitalmente</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </ModernCard>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Opciones de Compartir</h3>

        {/* Generar y descargar PDF */}
        <ModernCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Descargar PDF</h4>
                  <p className="text-sm text-muted-foreground">
                    Genera y descarga el reporte en formato PDF
                  </p>
                </div>
              </div>
              <ModernButton
                onClick={handleGeneratePDF}
                disabled={sharing === 'pdf'}
                variant="outline"
              >
                {sharing === 'pdf' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </>
                )}
              </ModernButton>
            </div>
          </div>
        </ModernCard>

        {/* Compartir por WhatsApp */}
        <ModernCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold">Compartir por WhatsApp</h4>
                  <p className="text-sm text-muted-foreground">
                    Comparte el enlace del reporte vía WhatsApp
                  </p>
                </div>
              </div>
              <ModernButton
                onClick={handleShareWhatsApp}
                disabled={sharing === 'whatsapp'}
                variant="outline"
              >
                {sharing === 'whatsapp' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </>
                )}
              </ModernButton>
            </div>
          </div>
        </ModernCard>

        {/* Compartir por Email */}
        <ModernCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold">Compartir por Email</h4>
                  <p className="text-sm text-muted-foreground">
                    Envía el reporte por correo electrónico
                  </p>
                </div>
              </div>
              <ModernButton
                onClick={handleShareEmail}
                disabled={sharing === 'email'}
                variant="outline"
              >
                {sharing === 'email' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </>
                )}
              </ModernButton>
            </div>
          </div>
        </ModernCard>

        {/* Generar enlace compartible */}
        <ModernCard>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <LinkIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold">Enlace Compartible</h4>
                  <p className="text-sm text-muted-foreground">
                    Genera un enlace seguro para compartir
                  </p>
                </div>
              </div>
              <ModernButton
                onClick={handleGetShareLink}
                disabled={sharing === 'link' || !!shareUrl}
                variant="outline"
              >
                {sharing === 'link' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : shareUrl ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Generar
                  </>
                )}
              </ModernButton>
            </div>
            
            {shareUrl && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-background border rounded-md text-sm"
                  />
                  <ModernButton
                    onClick={handleCopyLink}
                    variant="outline"
                    size="sm"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </ModernButton>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  El enlace expirará en 7 días
                </p>
              </div>
            )}
          </div>
        </ModernCard>
      </div>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground text-center">
          🔒 Los reportes compartidos están protegidos y solo pueden ser accedidos por personas autorizadas
        </p>
      </div>
    </div>
  )
}

