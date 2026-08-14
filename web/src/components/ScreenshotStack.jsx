import DeviceFrame from './DeviceFrame'

export default function ScreenshotStack({ src, alt }) {
  return (
    <DeviceFrame>
      <img src={src} alt={alt} className="block w-full h-auto" loading="lazy" />
    </DeviceFrame>
  )
}
