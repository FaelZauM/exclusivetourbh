interface SectionHeadingProps {
  title: string
  subtitle?: string
  center?: boolean
  light?: boolean
}

export function SectionHeading({ title, subtitle, center, light }: SectionHeadingProps) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : ""}>
      <h2
        className={`text-balance text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl ${
          light ? "text-canvas" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-lg ${light ? "text-silver" : "text-ink/60"}`}>{subtitle}</p>
      )}
    </div>
  )
}
