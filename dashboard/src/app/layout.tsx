import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// ── Google Font Configurations ───────────────────────────────────────────────
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = "https://districtdx.sourabhpradhan.in";
const OG_IMAGE = `${SITE_URL}/icon.png`;
const AUTHOR_URL = "https://www.sourabhpradhan.in";

// ── Viewport ─────────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  themeColor: "#0a0908",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// ── SEO & GEO Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DistrictDx — Pharmaceutical Market Attractiveness Index (MAI) for 785 Indian Districts",
    template: "%s | DistrictDx",
  },
  description:
    "DistrictDx is an open, reproducible Pharmaceutical Market Attractiveness Index (MAI) scoring 785 Indian districts across Overall, Chronic & Acute portfolios. Demand × Realizability (geometric mean), AHP-weighted, within-state quadrants, future trajectory (β=0.3). Built for Sun Pharma strategy by Sourabh Pradhan.",
  keywords: [
    "DistrictDx",
    "Pharmaceutical Market Attractiveness Index",
    "MAI",
    "India district pharma market",
    "Sun Pharma",
    "pharmaceutical territory planning India",
    "district level healthcare index India",
    "chronic acute market attractiveness",
    "NFHS-5 district health data",
    "demand realizability index",
    "pharma market sizing India",
    "healthcare access India districts",
    "AHP weighted composite index",
    "Census 2011 district data",
    "VIIRS nightlights income proxy",
    "pharmaceutical market research India",
    "Trilytics IIM Calcutta",
    "Sourabh Pradhan",
    "India district map pharma",
    "healthcare infrastructure India",
  ],
  authors: [{ name: "Sourabh Pradhan", url: AUTHOR_URL }],
  creator: "Sourabh Pradhan",
  publisher: "DistrictDx",
  category: "Healthcare Analytics",
  classification: "Pharmaceutical Market Intelligence",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "DistrictDx",
    title: "DistrictDx — Pharmaceutical Market Attractiveness Index for 785 Indian Districts",
    description:
      "Open, reproducible MAI scoring every Indian district (785) on Demand × Realizability. Explore choropleth map, Demand-Realizability scatter, rankings & methodology. Free public data, AHP-weighted, future projection.",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "DistrictDx — Pharmaceutical Market Attractiveness Index choropleth map of 785 Indian districts",
      },
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "DistrictDx icon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DistrictDx — Pharmaceutical Market Attractiveness Index (785 Districts)",
    description:
      "Reproducible pharma MAI for 785 Indian districts — Demand × Realizability, AHP-weighted, therapy-specific. Interactive map, scatter & rankings.",
    images: [OG_IMAGE],
    creator: "@sourabhpradhan",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
    shortcut: "/icon.png",
  },
  manifest: "/manifest.webmanifest",
  // Verification placeholders — add real codes if available via Search Console
  // verification: {
  //   google: "google-site-verification-code",
  //   other: { "msvalidate.01": "bing-code" },
  // },
  other: {
    "geo.region": "IN",
    "geo.placename": "India",
    author: "Sourabh Pradhan",
    "article:author": AUTHOR_URL,
  },
};

// ── JSON-LD Structured Data (GEO + SEO) ─────────────────────────────────────
function JsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "DistrictDx",
        alternateName: "Pharmaceutical Market Attractiveness Index",
        description:
          "Open reproducible Pharmaceutical Market Attractiveness Index scoring 785 Indian districts on Demand × Realizability for Sun Pharma portfolio planning.",
        inLanguage: "en-IN",
        publisher: { "@id": `${SITE_URL}/#organization` },
        author: { "@id": `${AUTHOR_URL}/#person` },
        isAccessibleForFree: true,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/rankings?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "DistrictDx",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/icon.png`,
        },
        sameAs: [AUTHOR_URL, "https://github.com/karbburn/DistrictDx"],
        founder: { "@id": `${AUTHOR_URL}/#person` },
      },
      {
        "@type": "Person",
        "@id": `${AUTHOR_URL}/#person`,
        name: "Sourabh Pradhan",
        url: AUTHOR_URL,
        sameAs: [
          AUTHOR_URL,
          "https://www.linkedin.com/in/sourabh-pradhan07/",
          "https://github.com/karbburn",
        ],
        jobTitle: "Researcher & Builder — DistrictDx",
        affiliation: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Dataset",
        "@id": `${SITE_URL}/#dataset`,
        name: "DistrictDx — District-Level Pharmaceutical Market Attractiveness Index (785 districts)",
        description:
          "Composite index (MAI_Overall, MAI_Chronic, MAI_Acute) with Demand, Realizability, quadrants, confidence scores, historical & future projections for 785 LGD districts. Built from Census 2011, NFHS-5/4, VIIRS nightlights, Rural Health Statistics, PMGSY & NVBDCP data.",
        url: SITE_URL,
        keywords: [
          "pharmaceutical market",
          "India districts",
          "healthcare access",
          "market attractiveness",
          "NFHS-5",
          "Census 2011",
          "VIIRS nightlights",
        ],
        creator: { "@id": `${AUTHOR_URL}/#person` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        license: "https://creativecommons.org/licenses/by/4.0/",
        isAccessibleForFree: true,
        temporalCoverage: "2001/2021",
        spatialCoverage: {
          "@type": "Place",
          name: "India",
          geo: { "@type": "GeoShape", addressCountry: "IN" },
        },
        distribution: [
          {
            "@type": "DataDownload",
            encodingFormat: "text/csv",
            contentUrl: `${SITE_URL}/data/district_index_final.csv`,
          },
          {
            "@type": "DataDownload",
            encodingFormat: "application/geo+json",
            contentUrl: `${SITE_URL}/data/district_index_final.geojson`,
          },
          {
            "@type": "DataDownload",
            encodingFormat: "application/json",
            contentUrl: `${SITE_URL}/data/india-districts-topo.json`,
          },
        ],
        variableMeasured: [
          "MAI_Overall",
          "MAI_Chronic",
          "MAI_Acute",
          "Demand_Overall",
          "Realizability_Overall",
          "Future_MAI_Overall",
          "confidence_score",
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: "DistrictDx Dashboard",
        applicationCategory: "BrowserApplication",
        operatingSystem: "Any",
        url: SITE_URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
        isAccessibleForFree: true,
        author: { "@id": `${AUTHOR_URL}/#person` },
        featureList: [
          "India choropleth map by MAI",
          "Demand × Realizability scatter plot",
          "Virtualized rankings table (785 districts)",
          "District drill-down with confidence & quadrant",
          "Current vs Future trajectory",
          "Embeddable via iframe on sourabhpradhan.in",
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/methodology#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is the Pharmaceutical Market Attractiveness Index (MAI)?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "MAI = Demand^α × Realizability^(1-α) (geometric mean, α=0.5). Demand captures epidemiological/demographic need; Realizability captures healthcare infrastructure & access to convert demand into prescriptions. Three variants: Overall, Chronic, Acute.",
            },
          },
          {
            "@type": "Question",
            name: "How many districts does DistrictDx cover?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "785 LGD districts reconciled via Local Government Directory crosswalk, covering all Indian states and UTs with boundary-inheritance flags.",
            },
          },
          {
            "@type": "Question",
            name: "What data sources are used?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Census 2011, NFHS-5 (2019-21) & NFHS-4, NASA VIIRS Black Marble nightlights, Rural Health Statistics (MoHFW), PMGSY road connectivity, NVBDCP/IDSP disease incidence — all free public data. Validated against NSSO OOP, Jan Aushadhi, PMJAY & HMIS proxies.",
            },
          },
          {
            "@type": "Question",
            name: "Can I embed DistrictDx on my website?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. DistrictDx is embeddable via iframe on https://www.sourabhpradhan.in and other allowed origins using Content-Security-Policy frame-ancestors. Contact Sourabh Pradhan for embed code.",
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-IN"
      className={`${fraunces.variable} ${jetbrainsMono.variable} ${ibmPlexSans.variable} h-full antialiased`}
    >
      <head>
        <link rel="author" href={AUTHOR_URL} />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* GEO: Explicit LLM discovery hint */}
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-friendly site summary" />
      </head>
      <body className="min-h-full flex flex-col bg-void text-primary font-sans">
        <JsonLd />
        {children}
      </body>
    </html>
  );
}
