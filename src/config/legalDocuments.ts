export interface LegalDocumentItem {
  title: string;
  pdfUrl: string;
}

export const legalDocuments: Record<string, LegalDocumentItem> = {
  about: {
    title: "About Kirnagram",
    pdfUrl: "https://pub-c7720ab23a5745a09cadfeedfa3199d3.r2.dev/privacy-policy/1.%20About%20Us.pdf",
  },
  careers: {
    title: "Careers",
    pdfUrl: "https://pub-c7720ab23a5745a09cadfeedfa3199d3.r2.dev/privacy-policy/3.%20Careers.pdf",
  },
  helpCenter: {
    title: "Help Center",
    pdfUrl: "https://pub-c7720ab23a5745a09cadfeedfa3199d3.r2.dev/privacy-policy/4.%20Creator%20%26%20User%20Support%20FAQ.pdf",
  },
  contact: {
    title: "Contact Us",
    pdfUrl: "https://pub-c7720ab23a5745a09cadfeedfa3199d3.r2.dev/privacy-policy/2.%20Contact%20Us.pdf",
  },
  terms: {
    title: "Terms of Service",
    pdfUrl: "https://pub-c7720ab23a5745a09cadfeedfa3199d3.r2.dev/privacy-policy/2.%20Terms%20of%20Service.pdf",
  },
  privacy: {
    title: "Privacy Policy",
    pdfUrl: "https://pub-c7720ab23a5745a09cadfeedfa3199d3.r2.dev/privacy-policy/1.%20Privacy%20Policy.pdf",
  },
  community: {
    title: "Community Guidelines",
    pdfUrl: "https://pub-c7720ab23a5745a09cadfeedfa3199d3.r2.dev/privacy-policy/4.%20Community%20Guidelines.pdf",
  },
  aiCreator: {
    title: "AI Creator Agreement",
    pdfUrl: "https://pub-c7720ab23a5745a09cadfeedfa3199d3.r2.dev/privacy-policy/3.%20AI%20Creator%20Agreement.pdf",
  },
  creatorRewards: {
    title: "Creator Rewards & Payout Policy",
    pdfUrl: "https://pub-c7720ab23a5745a09cadfeedfa3199d3.r2.dev/privacy-policy/5.%20Creator%20Rewards%20%26%20Payout%20Policy.pdf",
  },
  refundsCredits: {
    title: "Refund & Credits Policy",
    pdfUrl: "https://pub-c7720ab23a5745a09cadfeedfa3199d3.r2.dev/privacy-policy/6.%20Refund%20%26%20Credits%20Policy.pdf",
  },
  dmca: {
    title: "Copyright & DMCA Policy",
    pdfUrl: "https://pub-c7720ab23a5745a09cadfeedfa3199d3.r2.dev/privacy-policy/7.%20Copyright%20%26%20DMCA%20Policy.pdf",
  },
  brandGuidelines: {
    title: "Brand Guidelines",
    pdfUrl: "https://pub-c7720ab23a5745a09cadfeedfa3199d3.r2.dev/privacy-policy/9.%20Brand%20Guidelines.pdf",
  },
  cookies: {
    title: "Cookie Policy",
    pdfUrl: "https://pub-c7720ab23a5745a09cadfeedfa3199d3.r2.dev/privacy-policy/10.%20Cookie%20Policy.pdf",
  },
};
