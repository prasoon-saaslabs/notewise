/** Open-source imagery (Unsplash License) — mapped to PRD personas & MVP features */

export type AppImage = {
  src: string;
  alt: string;
};

function unsplash(id: string, w = 1200) {
  return `https://images.unsplash.com/${id}?w=${w}&q=85&auto=format&fit=crop`;
}

/** P1 Meera · P2 Arjun · P3 Sana — hero edge photos */
export const IMAGES = {
  heroLeft: {
    src: unsplash("photo-1522071820081-009f0129c71c", 600),
    alt: "Startup founder leading a morning stand-up before a day of back-to-back calls",
  },
  heroRight: {
    src: unsplash("photo-1573497019940-1c28c88b4f3e", 600),
    alt: "Account executive on a sales discovery call with headphones and laptop",
  },

  /** F5/F8 — relationship memory + voice Q&A */
  heroCenter: {
    src: unsplash("photo-1560472354-b33ff0c44a43", 1400),
    alt: "Founder walking between meetings, preparing for a spoken cross-meeting question",
  },

  /** F6 pre-call brief */
  phaseBefore: {
    src: unsplash("photo-1497366216548-37526070297c", 900),
    alt: "Minimal Mac desk with calendar and pre-call brief before an Acme security review",
  },
  /** F7 live copilot */
  phaseDuring: {
    src: unsplash("photo-1588196749597-9ff075ee6b5b", 900),
    alt: "Professional on a live client video call with a quiet copilot beside the screen",
  },
  /** F2 notes with receipts */
  phaseAfter: {
    src: unsplash("photo-1516321318423-f06f85e504b3", 900),
    alt: "MacBook Pro showing cited meeting notes and action items after a call ends",
  },

  /** Persona gallery — matches GALLERY.captions order in constants.ts */
  gallery: [
    {
      src: unsplash("photo-1556761175-5973dc0f32e7", 800),
      alt: "Meera's startup team in a founder stand-up around a whiteboard",
    },
    {
      src: unsplash("photo-1553877522-43269d4ea984", 800),
      alt: "Founder on an investor call pitching from a bright office",
    },
    {
      src: unsplash("photo-1600880292089-90a7e086ee0c", 800),
      alt: "Arjun running a remote sales discovery demo from a home office",
    },
    {
      src: unsplash("photo-1523240795612-9a054b0db644", 800),
      alt: "Sana facilitating a confidential client workshop at a café table",
    },
    {
      src: unsplash("photo-1521737711867-e3b97375f902", 800),
      alt: "Founder in a hiring 1:1 with a candidate over video",
    },
    {
      src: unsplash("photo-1542744173-8e7e53415bb0", 800),
      alt: "Account executive reviewing an open deal pipeline on a remote call",
    },
  ] satisfies AppImage[],

  /** F1–F9 feature cards — order matches FEATURES in constants.ts */
  features: [
    {
      src: unsplash("photo-1611224923853-80b023f02d71", 700),
      alt: "macOS menu-bar capture during a Zoom call — bot-free, two audio channels",
    },
    {
      src: unsplash("photo-1551836022-deb4988cc6c0", 700),
      alt: "Meeting notes with timestamp chips linking every claim to the transcript",
    },
    {
      src: unsplash("photo-1517245386807-bb43f82c33c4", 700),
      alt: "Sales discovery call using a structured meeting mode template",
    },
    {
      src: unsplash("photo-1460925895917-afdab827c52f", 700),
      alt: "Searching across all past meetings on a local relationship timeline",
    },
    {
      src: unsplash("photo-1600880292203-757bb62b4baf", 700),
      alt: "Relationship page for a company with open commitments and meeting history",
    },
    {
      src: unsplash("photo-1555949963-aa79dcee981c", 700),
      alt: "Developer auditing open-source code and local data-flow transparency",
    },
  ] satisfies AppImage[],

  /** F2 showcase — transcript card */
  showcaseTranscript: {
    src: unsplash("photo-1573497019940-1c28c88b4f3e", 800),
    alt: "Live transcript streaming during a client pricing objection on video",
  },
  /** F5 showcase — relationship memory card */
  showcaseMemory: {
    src: unsplash("photo-1557804506-669a67965ba0", 800),
    alt: "Cross-meeting memory synthesizing six months of Acme Corp conversations",
  },

  /** F9 trust layer — P3 Sana compliance story */
  privacyBg: {
    src: unsplash("photo-1454165804606-c3d57bc86b40", 1600),
    alt: "Consultant reviewing a data-flow audit page before sharing with a banking client",
  },

  /** Hackathon CTA — clone & run in five minutes */
  ctaBg: {
    src: unsplash("photo-1552581234-26160f608093", 1600),
    alt: "Mac developer workspace ready to git clone NoteWise and capture a first transcript",
  },

  /** Case study portraits — Meera, Arjun, Sana */
  testimonials: [
    {
      src: unsplash("photo-1494790108377-be9c29b29330", 800),
      alt: "Meera, early-stage startup founder, between investor calls",
    },
    {
      src: unsplash("photo-1560250097-0b93528c311a", 800),
      alt: "Arjun, account executive, preparing for a back-to-back sales demo",
    },
    {
      src: unsplash("photo-1580489944761-15a19d654956", 800),
      alt: "Sana, independent consultant, working on confidential client follow-ups",
    },
  ] satisfies AppImage[],
} as const;

export const PHASE_IMAGES: Record<"before" | "during" | "after", AppImage> = {
  before: IMAGES.phaseBefore,
  during: IMAGES.phaseDuring,
  after: IMAGES.phaseAfter,
};

export const FEATURE_IMAGES = IMAGES.features;
export const TESTIMONIAL_IMAGES = IMAGES.testimonials;
