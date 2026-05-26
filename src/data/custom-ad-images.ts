export type ServiceKey =
  | "loose-rug"
  | "fitted-carpet"
  | "upholstery"
  | "mattress"
  | "home"
  | "office";

export type ImageType =
  | "before-after"
  | "process"
  | "result"
  | "team"
  | "facility"
  | "collage";

export interface CustomImageMeta {
  id: string;
  path: string;
  services: ServiceKey[];
  type: ImageType;
  subject: string;
  /** What the ad copy should emphasise when this photo is used */
  copyAngle: string;
  tags: string[];
}

/** West Coast Cleaners photos — served from `/ad-images/`. Edit tags here as you add photos. */
export const CUSTOM_AD_IMAGE_CATALOG: CustomImageMeta[] = [
  {
    id: "rug-shag-before-after",
    path: "/ad-images/530235472_1355414549924214_7890449469560826913_n.jpg",
    services: ["loose-rug"],
    type: "before-after",
    subject: "Shaggy rug split down the middle — dirty brown left, clean white right",
    copyAngle: "Dramatic before/after; emphasise visible transformation and FREE collection & drop-off",
    tags: ["before-after", "shaggy-rug", "transformation"],
  },
  {
    id: "rug-oriental-process",
    path: "/ad-images/559533285_1416797240452611_612094740767137994_n.jpg",
    services: ["loose-rug"],
    type: "process",
    subject: "Rotary machine with suds on traditional oriental/persian-style rug",
    copyAngle: "Professional deep-clean in action; trust the equipment and expertise",
    tags: ["process", "oriental-rug", "deep-clean"],
  },
  {
    id: "carpet-pet-hair-before-after",
    path: "/ad-images/480665489_1201099665355704_7917688247454069371_n.jpg",
    services: ["fitted-carpet"],
    type: "before-after",
    subject: "Grey fitted carpet before/after — pet hair and dust bunnies vs pristine clean",
    copyAngle: "Perfect for pet owners; steam clean removes what vacuuming leaves behind",
    tags: ["before-after", "pet-hair", "fitted-carpet"],
  },
  {
    id: "carpet-extraction-contrast",
    path: "/ad-images/559582085_1416797217119280_5064264478144236449_n.jpg",
    services: ["fitted-carpet"],
    type: "before-after",
    subject: "Half dirty brown carpet patch vs clean grey — extraction wand on the job",
    copyAngle: "Hot water extraction removes deep grime — show the contrast in the room",
    tags: ["before-after", "fitted-carpet", "extraction"],
  },
  {
    id: "mattress-stain-before-after",
    path: "/ad-images/565084223_1416797223785946_3903219621038216529_n.jpg",
    services: ["mattress"],
    type: "before-after",
    subject: "Mattress split — yellow/brown stains vs bright white clean half",
    copyAngle: "Healthier sleep; shocking stain removal — invite them to book a mattress clean",
    tags: ["before-after", "mattress", "stain-removal"],
  },
  {
    id: "upholstery-bed-before-after",
    path: "/ad-images/530618286_1355414489924220_5570027121110349863_n.jpg",
    services: ["upholstery", "mattress"],
    type: "before-after",
    subject: "White quilted bed base — dark smudges vs spotless white corner",
    copyAngle: "Upholstery stain removal with visible before/after on the photo",
    tags: ["before-after", "upholstery", "stain-removal"],
  },
  {
    id: "home-glass-cleaning",
    path: "/ad-images/564229977_1416797193785949_845993984976813712_n.jpg",
    services: ["home"],
    type: "process",
    subject: "Cleaner polishing glass stair railing wearing shoe covers",
    copyAngle: "Premium home clean — attention to detail, respectful of your home",
    tags: ["home-cleaning", "process", "detail"],
  },
  {
    id: "home-chandelier",
    path: "/ad-images/467123028_1084918486432234_7088305394632791783_n.jpg",
    services: ["home"],
    type: "process",
    subject: "Team member on ladder cleaning crystal chandelier in luxury home",
    copyAngle: "No job too delicate — specialist home cleaning",
    tags: ["home-cleaning", "specialist", "chandelier"],
  },
  {
    id: "home-pergola-before-after",
    path: "/ad-images/467500522_1085580063032743_4278609705333517588_n.jpg",
    services: ["home"],
    type: "before-after",
    subject: "White louvered pergola — mould spots vs pristine white (split view)",
    copyAngle: "Outdoor mould removal; restore your patio for summer entertaining",
    tags: ["before-after", "exterior", "mould-removal"],
  },
  {
    id: "rugs-drying-rack",
    path: "/ad-images/540263034_1377064411092561_5931403057769252917_n.jpg",
    services: ["loose-rug"],
    type: "result",
    subject: "Multiple area rugs on professional drying rack in workshop",
    copyAngle: "Proper wash & dry — rugs cared for properly off-site",
    tags: ["result", "drying", "workshop"],
  },
  {
    id: "facility-warehouse",
    path: "/ad-images/warehose.jpg",
    services: ["loose-rug", "office"],
    type: "facility",
    subject: "Owner at Unit 1 — West Coast Cleaners workshop on the West Coast",
    copyAngle: "Local business you can trust; our Melkbosstrand facility",
    tags: ["facility", "local-business", "melkbosstrand"],
  },
  {
    id: "team-melkbos",
    path: "/ad-images/470777287_1109486020642147_5500057217628371014_n.jpg",
    services: ["home", "office"],
    type: "team",
    subject: "West Coast Cleaners team in white polos at Melkbosstrand community event",
    copyAngle: "Friendly local team — neighbours, not a faceless company",
    tags: ["team", "community", "melkbosstrand"],
  },
  {
    id: "brand-collage",
    path: "/ad-images/687033626_1602009118598088_8842178424455731131_n.jpg",
    services: ["loose-rug", "fitted-carpet", "home"],
    type: "collage",
    subject: "Brand collage — logo, LEAVE IT WE'LL CLEAN IT, rug cleaning, facility, drying",
    copyAngle: "Full-service overview; use the tagline naturally",
    tags: ["brand", "collage", "multi-service"],
  },
  {
    id: "carpet-process-1",
    path: "/ad-images/493556710_1261878275944509_5000504379417514216_n.jpg",
    services: ["fitted-carpet"],
    type: "process",
    subject: "Professional carpet cleaning equipment on residential carpet",
    copyAngle: "In-home fitted carpet deep clean",
    tags: ["fitted-carpet", "process"],
  },
  {
    id: "living-room-result",
    path: "/ad-images/494846781_1265357155596621_2352830980162079953_n.jpg",
    services: ["upholstery", "home"],
    type: "result",
    subject: "Immaculate beachfront living room — fresh rug and upholstery",
    copyAngle: "Guest-ready coastal home; everything fresh for the season",
    tags: ["result", "living-room", "home"],
  },
  {
    id: "rug-result-1",
    path: "/ad-images/496542232_1273752634757073_8484210140144454447_n.jpg",
    services: ["loose-rug"],
    type: "result",
    subject: "Freshly cleaned rug — finished result",
    copyAngle: "Rug returned looking new; FREE collection & drop-off",
    tags: ["result", "rug"],
  },
  {
    id: "cleaning-detail-1",
    path: "/ad-images/531009117_1355414443257558_3246393249479872429_n.jpg",
    services: ["fitted-carpet", "loose-rug"],
    type: "process",
    subject: "Close-up professional cleaning in progress",
    copyAngle: "Meticulous care on every job",
    tags: ["process", "detail"],
  },
  {
    id: "result-detail-1",
    path: "/ad-images/542212200_1377050351093967_1994016920467228440_n.jpg",
    services: ["loose-rug", "upholstery"],
    type: "result",
    subject: "Close-up cleaning result",
    copyAngle: "See the difference up close",
    tags: ["result", "detail"],
  },
  {
    id: "workshop-rugs",
    path: "/ad-images/560450141_1416797253785943_397318980013784147_n.jpg",
    services: ["loose-rug"],
    type: "facility",
    subject: "Rugs and equipment in the cleaning workshop",
    copyAngle: "Your rugs are in safe hands at our facility",
    tags: ["facility", "workshop", "rug"],
  },
  {
    id: "carpet-process-2",
    path: "/ad-images/562325177_1416797180452617_3234566186559506728_n.jpg",
    services: ["fitted-carpet"],
    type: "process",
    subject: "Carpet cleaning in progress with professional equipment",
    copyAngle: "Deep steam clean in your home",
    tags: ["process", "fitted-carpet"],
  },
];

export interface CustomImageCatalogItem extends CustomImageMeta {
  url: string;
}

/** Resolve catalog paths to absolute URLs, including Vite `base` (e.g. `/wcc`). */
export function resolveCustomImageCatalog(origin?: string): CustomImageCatalogItem[] {
  const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const base =
    origin?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? `${window.location.origin}${basePath}` : "");
  return CUSTOM_AD_IMAGE_CATALOG.map((img) => ({
    ...img,
    url: `${base}${img.path}`,
  }));
}
