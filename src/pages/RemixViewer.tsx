import { useLocation, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { auth } from "@/firebase";

type RemixItem = {
  id: string;
  image_url: string;
  caption?: string;
};

export default function RemixViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { remixes = [], startIndex = 0, fromProfile = false } = location.state || {};

  const [remixItems, setRemixItems] = useState<RemixItem[]>(remixes);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [addPostAnim, setAddPostAnim] = useState(false);
  const [loadingAddPost, setLoadingAddPost] = useState(false);

  if (!remixItems.length) {
    return (
      <MainLayout showRightSidebar={true} fromProfile={fromProfile}>
        <div className="text-center py-20">No remixes found</div>
      </MainLayout>
    );
  }

  const current = remixItems[currentIndex];

  const handleDownload = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/remix/download/${current.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `kirnagram-remix-${current.id}.png`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error(err);
      alert("Failed to download image.");
    }
  };

  return (
    <MainLayout showRightSidebar={true} fromProfile={fromProfile}>
      <div className="flex flex-col items-center justify-center min-h-[80vh] pb-10">
        <div className="w-full flex items-center mb-4 px-4">
          <Button
            variant="ghost"
            onClick={() => {
              navigate("/profile", { state: { tab: "remixes" } });
            }}
          >
            ← Back
          </Button>
        </div>

        {loadingAddPost ? (
          <div className="flex flex-col items-center justify-center h-[60vh] w-full">
            <img
              src={current.image_url}
              alt="Remix"
              className="max-h-[40vh] max-w-full object-contain rounded-xl mb-6"
            />
            <div className="animate-spin h-10 w-10 border-4 border-t-transparent border-primary rounded-full mb-2" />
            <p className="text-primary mt-2">Loading post...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center w-full h-[60vh] bg-black rounded-xl mb-6">
              <img
                src={current.image_url}
                alt="Remix"
                className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>

            <div className="flex flex-wrap gap-4 justify-center mb-6">
              <Button
                className={addPostAnim ? "animate-bounce" : ""}
                onClick={() => {
                  setAddPostAnim(true);
                  setLoadingAddPost(true);
                  setTimeout(() => {
                    setAddPostAnim(false);
                    setLoadingAddPost(false);
                    navigate("/create", {
                      state: { imageUrl: current.image_url, crop: true },
                    });
                  }, 1200);
                }}
              >
                Add Post
              </Button>

              <Button
                onClick={() =>
                  navigate("/story/upload", {
                    state: { imageUrl: current.image_url },
                  })
                }
              >
                Add Story
              </Button>

              <Button onClick={handleDownload}>Download</Button>
            </div>

            <div className="flex gap-4 justify-center">
              <Button
                variant="secondary"
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                disabled={currentIndex === remixItems.length - 1}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
