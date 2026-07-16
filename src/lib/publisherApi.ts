import { auth } from "@/firebase";

const API_BASE = "https://api.kirnagram.com";

export type PublisherApplicationPayload = {
  full_name: string;
  business_name: string;
  business_type: string;
  registration_type: "registered" | "unregistered";
  govt_id?: string;
  gst?: string;
  cin?: string;
  legal_name?: string;
  msme?: string;
  target_audience: string;
  target_region: string[];
};

export type CampaignPayload = {
  ad_name: string;
  business_name: string;
  description?: string;
  logo_url?: string;
  photo_preview_url?: string;
  video_preview_url?: string;
  video_duration_seconds?: number;
  website_url?: string;
  target_audience: string;
  target_region: string[];
  budget_mode: "custom" | "package";
  ad_type: "standard" | "full";
  custom_budget?: number;
  package_name?: string;
  package_duration_days?: number;
  package_total_budget?: number;
};

const authHeaders = async (withJson = true) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Please log in again and try.");
  }

  const token = await user.getIdToken();
  return {
    ...(withJson ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${token}`,
  };
};

const readJson = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || "Request failed");
  }
  return data;
};

export const publisherApi = {
  async getAccess() {
    const res = await fetch(`${API_BASE}/ads/publisher-access`, {
      headers: await authHeaders(false),
    });
    return readJson(res);
  },

  async getMyApplication() {
    const res = await fetch(`${API_BASE}/ads/publisher-applications/me`, {
      headers: await authHeaders(false),
    });
    return readJson(res);
  },

  async submitApplication(payload: PublisherApplicationPayload) {
    const res = await fetch(`${API_BASE}/ads/publisher-applications`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    return readJson(res);
  },

  async getDashboardSummary() {
    const res = await fetch(`${API_BASE}/ads/dashboard/summary`, {
      headers: await authHeaders(false),
    });
    return readJson(res);
  },

  async listMyCampaigns() {
    const res = await fetch(`${API_BASE}/ads/campaigns/mine`, {
      headers: await authHeaders(false),
    });
    return readJson(res);
  },

  async createCampaign(payload: CampaignPayload) {
    const res = await fetch(`${API_BASE}/ads/campaigns`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    return readJson(res);
  },

  async getMyBusinessProfile() {
    const res = await fetch(`${API_BASE}/ads/business-profile`, {
      headers: await authHeaders(false),
    });
    return readJson(res);
  },

  async updateMyBusinessProfile(payload: {
    business_name: string;
    about?: string;
    whatsapp?: string;
    website?: string;
    address?: string;
    headquarters?: string;
  }) {
    const res = await fetch(`${API_BASE}/ads/business-profile`, {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    return readJson(res);
  },

  async getPublisherProfile(publisherId: string) {
    const user = auth.currentUser;
    const headers = user
      ? { Authorization: `Bearer ${await user.getIdToken()}` }
      : undefined;
    const res = await fetch(`${API_BASE}/ads/publisher-profile/${publisherId}`, { headers });
    return readJson(res);
  },

  async trackDetailClick(campaignId: string) {
    const res = await fetch(`${API_BASE}/ads/campaigns/${campaignId}/track-detail-click`, {
      method: "POST",
    });
    return readJson(res);
  },

  // File upload methods
  async uploadGovtId(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const user = auth.currentUser;
    if (!user) throw new Error("Please log in again");

    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/upload/publisher/govt-id`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return readJson(res);
  },

  async uploadAdLogo(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const user = auth.currentUser;
    if (!user) throw new Error("Please log in again");

    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/upload/publisher/ad-logo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return readJson(res);
  },

  async uploadAdPhoto(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const user = auth.currentUser;
    if (!user) throw new Error("Please log in again");

    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/upload/publisher/ad-photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return readJson(res);
  },

  async uploadAdVideo(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const user = auth.currentUser;
    if (!user) throw new Error("Please log in again");

    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/upload/publisher/ad-video`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return readJson(res);
  },

  // Payment methods
  async createPaymentOrder(payload: {
    ad_name: string;
    business_name: string;
    total_amount: number;
    duration_days: number;
    budget_mode: "custom" | "package";
  }) {
    const res = await fetch(`${API_BASE}/ads/payment/create-order`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    return readJson(res);
  },

  async verifyPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    const res = await fetch(`${API_BASE}/ads/payment/verify`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    return readJson(res);
  },
};
