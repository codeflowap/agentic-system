export interface BrandKit {
  aboutTheBrand: string;
  idealCustomerProfile: string;
  brandPointOfView: string;
  toneOfVoice: string;
  authorPersona: string;
}

export interface Competitor {
  name: string;
  url: string;
  reason: string;
}

export interface CompetitorAnalysis {
  competitors: Competitor[];
}

export interface ScrapedData {
  url: string;
  title?: string;
  content: string;
  metadata?: {
    description?: string;
    keywords?: string;
    [key: string]: any;
  };
  scrapedAt: Date;
}

export interface BrandKitResult {
  id: string;
  url: string;
  brandKit: BrandKit;
  competitors: CompetitorAnalysis;
  scrapedData: ScrapedData;
  createdAt: Date;
}