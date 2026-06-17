import { Youtube, Facebook, Instagram, Linkedin } from "lucide-react"

export const Icons = {
    youtube: Youtube,
    facebook: Facebook,
    instagram: Instagram,
    linkedin: Linkedin,
    tiktok: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16.38 7.43a3.54 3.54 0 1 0-3.54 3.54V16a3.5 3.5 0 0 1-7 0" />
      <path d="M12.84 16.07a3.54 3.54 0 0 0 3.54-3.54" />
    </svg>
  ),
}
