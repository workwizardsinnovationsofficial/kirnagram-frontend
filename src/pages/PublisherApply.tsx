import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useNavigate } from "react-router-dom";
import { publisherApi } from "@/lib/publisherApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const audienceOptions = ["Students", "Office Workers", "Business Owners", "Families", "Senior Citizens", "General Public"];
const regionOptions = ["North Zone", "South Zone", "East Zone", "West Zone", "Central", "Urban", "Rural"];

const PublisherApply = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [govtId, setGovtId] = useState("");
  const [govtIdFile, setGovtIdFile] = useState<File | null>(null);
  const [isUploadingGovtId, setIsUploadingGovtId] = useState(false);
  const [registrationType, setRegistrationType] = useState<"registered" | "unregistered">("unregistered");
  const [gst, setGst] = useState("");
  const [cin, setCin] = useState("");
  const [legalName, setLegalName] = useState("");
  const [msme, setMsme] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [targetRegion, setTargetRegion] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const app = await publisherApi.getMyApplication();
        if (app?.exists && app?.status === "approved") {
          navigate("/publisher/dashboard");
        }
      } catch {
        // no-op
      }
    };
    run();
  }, [navigate]);

  const toggleRegion = (value: string) => {
    setTargetRegion((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
  };

  const validate = () => {
    if (!fullName.trim() || !businessName.trim() || !businessType || !targetAudience || targetRegion.length === 0) {
      return "Please fill all required fields.";
    }

    if (registrationType === "registered") {
      if (![gst, cin, legalName, msme].some((v) => v.trim())) {
        return "For registered business, enter at least one detail: GST, CIN, Legal Name or MSME.";
      }
    }

    return null;
  };

  const submitApplication = async () => {
    setSubmitError(null);
    setSubmitMessage(null);

    const err = validate();
    if (err) {
      setSubmitError(err);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Upload govt_id file if provided
      let govtIdUrl: string | undefined;
      if (govtIdFile) {
        setIsUploadingGovtId(true);
        try {
          const uploadResult = await publisherApi.uploadGovtId(govtIdFile);
          govtIdUrl = uploadResult.govt_id_url;
        } catch (uploadErr) {
          throw new Error(`Failed to upload government ID: ${uploadErr instanceof Error ? uploadErr.message : "Unknown error"}`);
        } finally {
          setIsUploadingGovtId(false);
        }
      }

      await publisherApi.submitApplication({
        full_name: fullName.trim(),
        business_name: businessName.trim(),
        business_type: businessType,
        govt_id: govtIdUrl || undefined,
        registration_type: registrationType,
        gst: gst.trim() || undefined,
        cin: cin.trim() || undefined,
        legal_name: legalName.trim() || undefined,
        msme: msme.trim() || undefined,
        target_audience: targetAudience,
        target_region: targetRegion,
      });
      setSubmitMessage("Application submitted successfully. Admin will review it soon.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-4xl mx-auto pb-24 md:pb-10 px-4 md:px-6 pt-4">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <button onClick={() => navigate("/become-publisher")} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-semibold">Overview</button>
          <button onClick={() => navigate("/become-publisher/packages")} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-semibold">Packages</button>
          <button onClick={() => navigate("/become-publisher/apply")} className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold">Apply</button>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-2">Publisher Application</h1>
          <p className="text-muted-foreground text-sm md:text-base">Step 1: Basic details. Step 2: Audience and target region.</p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-5 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-5">
            <div>
              <label className="block text-foreground font-semibold mb-2">Full Name</label>
              <input type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-foreground font-semibold mb-2">Business Name</label>
              <input type="text" placeholder="Acme Corp" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-5">
            <div>
              <label className="block text-foreground font-semibold mb-2">Business Category</label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger className="w-full h-[50px] rounded-xl border-border bg-muted/40 text-foreground focus:ring-primary/40"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-foreground font-semibold mb-2">Government ID (for verification)</label>
              <div className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-center gap-2">
                <input 
                  type="file" 
                  accept=".pdf,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setGovtIdFile(file);
                      setGovtId(file.name); // Show filename as confirmation
                    }
                  }}
                  className="hidden"
                  id="govt-id-upload"
                />
                <label htmlFor="govt-id-upload" className="cursor-pointer flex-1 text-foreground">
                  {govtIdFile ? (
                    <span className="text-sm">{govtIdFile.name}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Click to upload file (PDF/JPG/PNG)</span>
                  )}
                </label>
                {govtIdFile && (
                  <button
                    onClick={() => {
                      setGovtIdFile(null);
                      setGovtId("");
                    }}
                    className="text-xs px-2 py-1 rounded bg-destructive/20 text-destructive"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-foreground font-semibold mb-2">Business Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setRegistrationType("registered")} className={registrationType === "registered" ? "rounded-xl px-3 py-2 bg-primary text-primary-foreground" : "rounded-xl px-3 py-2 border border-border bg-muted/40 text-foreground"}>Registered</button>
                <button onClick={() => setRegistrationType("unregistered")} className={registrationType === "unregistered" ? "rounded-xl px-3 py-2 bg-primary text-primary-foreground" : "rounded-xl px-3 py-2 border border-border bg-muted/40 text-foreground"}>Unregistered</button>
              </div>
            </div>
          </div>

          {registrationType === "registered" && (
            <div className="mb-6 rounded-2xl border border-border p-4">
              <p className="text-sm text-muted-foreground mb-3">Registered details (optional individually, but at least one is required):</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={gst} onChange={(e) => setGst(e.target.value)} placeholder="GST" className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3" />
                <input type="text" value={cin} onChange={(e) => setCin(e.target.value)} placeholder="CIN" className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3" />
                <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Legal Name" className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3" />
                <input type="text" value={msme} onChange={(e) => setMsme(e.target.value)} placeholder="MSME" className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3" />
              </div>
            </div>
          )}

          <div className="mb-5">
            <p className="block text-foreground font-semibold mb-3">Target Audience</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4">
              {audienceOptions.map((item) => (
                <label key={item} className="flex items-center gap-2 text-foreground">
                  <input type="radio" name="targetAudience" className="accent-primary" value={item} checked={targetAudience === item} onChange={(e) => setTargetAudience(e.target.value)} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <p className="block text-foreground font-semibold mb-3">Target Region (where people should watch your ads)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4">
              {regionOptions.map((item) => (
                <label key={item} className="flex items-center gap-2 text-foreground">
                  <input type="checkbox" className="accent-primary" checked={targetRegion.includes(item)} onChange={() => toggleRegion(item)} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          {submitError && <p className="text-sm text-red-500 mb-3">{submitError}</p>}
          {submitMessage && <p className="text-sm text-green-500 mb-3">{submitMessage}</p>}

          <button onClick={submitApplication} disabled={isSubmitting || isUploadingGovtId} className="w-full rounded-xl py-3.5 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:opacity-95 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
            {isUploadingGovtId ? "Uploading ID..." : isSubmitting ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

export default PublisherApply;
