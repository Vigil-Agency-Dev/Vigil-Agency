export type BaseContent = {
  id: string;
  title: string;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Release = BaseContent & {
  artist: string;
  year: number;
  genre: string;
  artworkUrl?: string;
  artworkPath?: string;
  streamUrl?: string;
  purchaseUrl?: string;
};

export type Visual = BaseContent & {
  videoId?: string;
  videoUrl?: string;
  description?: string;
};

export type CampaignEvent = BaseContent & {
  date: string;
  description: string;
};

export type TourDate = BaseContent & {
  date: string;
  city: string;
  venue: string;
  status: 'Tickets' | 'Sold Out';
  ticketUrl?: string;
};

export type Product = BaseContent & {
  type: 'music' | 'merch' | 'ticket' | 'bundle';
  price: number;
  currency: 'AUD';
  description?: string;
  imageUrl?: string;
  imagePath?: string;
  stockStatus?: 'in_stock' | 'sold_out' | 'preorder';
};
