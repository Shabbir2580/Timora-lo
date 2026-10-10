
import Link from "next/link"
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  LockKeyhole,
} from "lucide-react"

type LegalSection = {
  title: string
  paragraphs: string[]
}

type LegalPageProps = {
  type: "terms" | "privacy"
}

const content: Record<
  LegalPageProps["type"],
  {
    eyebrow: string
    title: string
    description: string
    icon: typeof FileText
    sections: LegalSection[]
  }
> = {
  terms: {
    eyebrow: "Terms of Service",
    title: "Clear terms. Better shopping.",
    description:
      "These draft terms explain the basic rules for using Timora. Review and customize them before launching the store.",
    icon: FileText,
    sections: [
      {
        title: "1. Using Timora",
        paragraphs: [
          "By accessing or using Timora, you agree to follow the terms applicable to our shopping platform. You must use the service lawfully and provide accurate information when creating an account.",
          "You are responsible for maintaining the confidentiality of your account credentials and for activity carried out through your account, subject to applicable law.",
        ],
      },
      {
        title: "2. Products and pricing",
        paragraphs: [
          "Product descriptions, images, prices, availability, and offers should be reviewed before an order is placed. Product images may differ slightly from the item delivered.",
          "Prices, taxes, delivery charges, discounts, and the final payable amount should be displayed clearly during checkout. Any changes to an order must comply with applicable consumer protection laws.",
        ],
      },
      {
        title: "3. Orders and payments",
        paragraphs: [
          "Submitting an order is a request to purchase the selected products. Order confirmation, cancellation, payment processing, and refunds will be governed by the policies shown during checkout and applicable law.",
          "Timora must clearly disclose its payment provider, order acceptance process, and any applicable restrictions before accepting payments.",
        ],
      },
      {
        title: "4. Delivery, returns, and refunds",
        paragraphs: [
          "Delivery estimates are not guarantees unless explicitly stated. Customers should be able to review the applicable shipping, cancellation, return, replacement, and refund policies before purchasing.",
          "Nothing in these draft terms is intended to remove rights that consumers have under applicable law.",
        ],
      },
      {
        title: "5. Acceptable use",
        paragraphs: [
          "Do not misuse the platform, interfere with its operation, attempt unauthorized access, submit fraudulent orders, or upload unlawful or harmful content.",
          "Account restrictions must be applied fairly and consistently with applicable law and any published platform policies.",
        ],
      },
      {
        title: "6. Changes and contact",
        paragraphs: [
          "Timora may update its terms as the platform develops. Material changes should be communicated appropriately, with an updated effective date.",
          "For questions about these terms, contact the official customer support address published on the Timora website.",
        ],
      },
    ],
  },
  privacy: {
    eyebrow: "Privacy Policy",
    title: "Your privacy matters.",
    description:
      "This draft explains the privacy topics Timora should disclose. It must be aligned with the data the live website actually collects and processes.",
    icon: LockKeyhole,
    sections: [
      {
        title: "1. Information we collect",
        paragraphs: [
          "Depending on the features enabled, Timora may process information such as your name, email address, delivery address, order details, and customer support messages.",
          "Technical information such as device details, diagnostic logs, and website usage data may also be processed where necessary and legally permitted.",
        ],
      },
      {
        title: "2. How information is used",
        paragraphs: [
          "Personal information may be used to manage accounts, process orders, arrange delivery, provide customer support, prevent fraud, and maintain website security.",
          "Marketing messages should be sent only under the appropriate permissions or other lawful basis, with a practical way to opt out where required.",
        ],
      },
      {
        title: "3. Payments and third parties",
        paragraphs: [
          "If payment providers, delivery partners, authentication services, or hosting providers are used, relevant information may be shared with them to provide the requested service.",
          "Timora should identify the actual providers it uses and explain their roles. Do not claim that payment information is never stored unless the real implementation supports that statement.",
        ],
      },
      {
        title: "4. Cookies and similar technologies",
        paragraphs: [
          "The website may use cookies or similar technologies for essential functionality, account sessions, preferences, analytics, or advertising, depending on its configuration.",
          "The final policy should describe the technologies actually used and explain any consent or preference controls that apply.",
        ],
      },
      {
        title: "5. Data security and retention",
        paragraphs: [
          "Timora should use appropriate technical and organizational safeguards to protect personal information, restrict access, and manage security incidents.",
          "Information should be retained only as long as necessary for the disclosed purposes, legal obligations, dispute resolution, and other legitimate requirements.",
        ],
      },
      {
        title: "6. Your choices and rights",
        paragraphs: [
          "Depending on applicable law, you may have rights to access, correct, erase, or obtain information about the processing of your personal data, and to withdraw consent where processing relies on consent.",
          "Publish a working contact method for privacy requests and explain the process and any applicable limitations.",
        ],
      },
      {
        title: "7. Contact and updates",
        paragraphs: [
          "For privacy questions or requests, contact the official privacy contact published by Timora.",
          "This draft does not identify Timora's legal entity, actual data practices, retention periods, or service providers. Those details must be confirmed before publication.",
        ],
      },
    ],
  },
}

export function LegalPage({ type }: LegalPageProps) {
  const page = content[type]
  const Icon = page.icon

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#171713]">
      <header className="border-b border-[#e5e2d9] bg-[#f7f6f2]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#171a16] text-sm font-bold tracking-widest text-[#e0c58f]">
              T
            </span>
            <span className="text-lg font-semibold tracking-[0.2em]">
              TIMORA
            </span>
          </Link>

          <Link
            href="/register"
            className="text-sm font-medium text-[#7e6333] transition hover:text-[#3c3020]"
          >
            Create account
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#171a16] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full border border-[#c5a66a]/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-16 h-64 w-64 rounded-full border border-[#c5a66a]/15"
        />

        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Link
            href="/register"
            className="mb-10 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to registration
          </Link>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c5a66a]/35 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e0c58f]">
            <Icon className="h-3.5 w-3.5" />
            {page.eyebrow}
          </div>

          <h1 className="max-w-3xl font-serif text-4xl font-normal leading-tight tracking-tight sm:text-6xl">
            {page.title}
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
            {page.description}
          </p>

          <p className="mt-6 text-xs text-[#d8bd85]">
            Draft for review · Confirm the effective date before publishing
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[250px_1fr] lg:gap-16">
        <aside className="h-fit rounded-2xl border border-[#e5e2d9] bg-white p-5 lg:sticky lg:top-8">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b7c43]">
            On this page
          </p>

          <nav aria-label="Page sections" className="space-y-1">
            {page.sections.map((section, index) => (
              <a
                key={section.title}
                href={`#section-${index + 1}`}
                className="block rounded-lg px-3 py-2.5 text-sm text-[#65645d] transition hover:bg-[#f7f6f2] hover:text-[#171713]"
              >
                {section.title}
              </a>
            ))}
          </nav>

          <div className="mt-5 border-t border-[#e5e2d9] pt-5">
            <p className="text-xs leading-6 text-[#85847b]">
              Need help? Visit the store or use the official support contact
              published by Timora.
            </p>
            <Link
              href="/"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#876a35] hover:underline"
            >
              Visit Timora
            </Link>
          </div>
        </aside>

        <article className="min-w-0">
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-[#dfd5bd] bg-[#f0ece2] p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#876a35]" />
            <p className="text-xs leading-6 text-[#62543a]">
              This is a starter draft, not a reviewed legal policy. Confirm
              the actual business details, platform features, and applicable
              Indian legal requirements before making it publicly binding.
            </p>
          </div>

          <div className="divide-y divide-[#e5e2d9] rounded-2xl border border-[#e5e2d9] bg-white px-5 sm:px-8">
            {page.sections.map((section, index) => (
              <section
                key={section.title}
                id={`section-${index + 1}`}
                className="scroll-mt-8 py-8 first:pt-8"
              >
                <h2 className="font-serif text-xl font-normal tracking-tight sm:text-2xl">
                  {section.title}
                </h2>

                <div className="mt-4 space-y-4">
                  {section.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-sm leading-7 text-[#68675f]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <Link
              href={type === "terms" ? "/privacy" : "/terms"}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#876a35] hover:underline"
            >
              {type === "terms" ? "Read the Privacy Policy" : "Read the Terms of Service"}
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1b1d18] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#34372d]"
            >
              Return to registration
            </Link>
          </div>
        </article>
      </div>

      <footer className="border-t border-[#e5e2d9] px-5 py-7 text-center text-xs text-[#89887f]">
        Timora © 2026 · Style · Technology · Living
      </footer>
    </main>
  )
}
