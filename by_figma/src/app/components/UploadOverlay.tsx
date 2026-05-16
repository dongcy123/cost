interface UploadOverlayProps {
  isVisible: boolean;
  status: "idle" | "uploading" | "parsing" | "success" | "error";
}

export function UploadOverlay({ isVisible, status }: UploadOverlayProps) {
  if (!isVisible) return null;
  if (status === "success") return null;

  const getMessage = () => {
    switch (status) {
      case "uploading":
        return "[System] 正在上传图片...";
      case "parsing":
        return "[System] AI 正在识别票据信息...";
      case "error":
        return "[System] 识别失败，请重试";
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
      <div
        className={`text-sm animate-pulse ${
          status === "error" ? "text-[#FF3B30]" : "text-[#8E8E93]"
        }`}
      >
        {getMessage()}
      </div>
    </div>
  );
}
