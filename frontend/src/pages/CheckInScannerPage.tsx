import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser'
import { QrCode, Search, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { bookingsApi } from '@/api/bookings'
import type { CheckInInfo } from '@/types'

type ScanResult =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'found'; info: CheckInInfo }
  | { state: 'alreadyIn'; info: CheckInInfo }
  | { state: 'error'; message: string }

export function CheckInScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [scanning, setScanning] = useState(false)
  const [manualToken, setManualToken] = useState('')
  const [result, setResult] = useState<ScanResult>({ state: 'idle' })
  const processedRef = useRef(false)

  async function processToken(token: string) {
    if (processedRef.current) return
    processedRef.current = true
    stopScanner()
    setResult({ state: 'loading' })
    try {
      const info = await bookingsApi.lookupToken(token)
      if (info.isCheckedIn) {
        setResult({ state: 'alreadyIn', info })
        return
      }
      await bookingsApi.checkinByToken(token)
      setResult({ state: 'found', info: { ...info, isCheckedIn: true } })
    } catch {
      setResult({ state: 'error', message: 'Token not found or check-in failed.' })
    }
  }

  function stopScanner() {
    controlsRef.current?.stop()
    controlsRef.current = null
    setScanning(false)
  }

  async function startScanner() {
    processedRef.current = false
    setResult({ state: 'idle' })
    setScanning(true)
    const codeReader = new BrowserQRCodeReader()
    try {
      const devices = await BrowserQRCodeReader.listVideoInputDevices()
      const deviceId = devices[devices.length - 1]?.deviceId
      const controls = await codeReader.decodeFromVideoDevice(
        deviceId ?? undefined,
        videoRef.current!,
        (res, err) => {
          if (res) processToken(res.getText())
          if (err && !(err instanceof Error)) setResult({ state: 'error', message: 'Camera error.' })
        },
      )
      controlsRef.current = controls
    } catch {
      setResult({ state: 'error', message: 'Could not access camera.' })
      setScanning(false)
    }
  }

  useEffect(() => () => stopScanner(), [])

  async function handleManualLookup() {
    if (!manualToken.trim()) return
    processedRef.current = false
    await processToken(manualToken.trim())
  }

  function reset() {
    processedRef.current = false
    setResult({ state: 'idle' })
    setManualToken('')
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <QrCode className="h-6 w-6 text-amber-600" />
        Check-In Scanner
      </h1>

      {/* Scanner area */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Scan QR Code</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          {scanning ? (
            <>
              <video ref={videoRef} className="w-full rounded-lg border" />
              <Button variant="outline" onClick={stopScanner}>Stop Camera</Button>
            </>
          ) : (
            <Button onClick={startScanner} className="w-full">
              <QrCode className="mr-2 h-4 w-4" />
              Start Camera
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Manual token input */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Manual Token Entry</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Paste check-in token..."
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
          />
          <Button onClick={handleManualLookup} disabled={!manualToken.trim()}>
            <Search className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Result panel */}
      {result.state !== 'idle' && (
        <Card>
          <CardContent className="pt-6">
            {result.state === 'loading' && (
              <div className="flex items-center gap-2 text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                Looking up token…
              </div>
            )}
            {result.state === 'found' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-6 w-6" />
                  <span className="text-lg font-semibold">Checked In!</span>
                </div>
                <p className="font-medium">{result.info.attendeeName}</p>
                <p className="text-sm text-slate-500">{result.info.eventTitle}</p>
                <Button variant="outline" size="sm" onClick={reset}>Scan Another</Button>
              </div>
            )}
            {result.state === 'alreadyIn' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-amber-600">
                  <CheckCircle className="h-6 w-6" />
                  <span className="text-lg font-semibold">Already Checked In</span>
                </div>
                <p className="font-medium">{result.info.attendeeName}</p>
                <p className="text-sm text-slate-500">{result.info.eventTitle}</p>
                <Badge variant="secondary">Already checked in</Badge>
                <Button variant="outline" size="sm" onClick={reset}>Scan Another</Button>
              </div>
            )}
            {result.state === 'error' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-6 w-6" />
                  <span className="text-lg font-semibold">Error</span>
                </div>
                <p className="text-sm text-slate-600">{result.message}</p>
                <Button variant="outline" size="sm" onClick={reset}>Try Again</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
