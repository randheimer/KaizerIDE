import { useState, useEffect } from 'react';
import { Download, X, RefreshCw } from 'lucide-react';

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Listen for update available
    const unsubAvailable = window.electron.update.onAvailable((data) => {
      setUpdateInfo(data);
      setIsDismissed(false);
    });

    // Listen for download progress
    const unsubProgress = window.electron.update.onDownloadProgress((data) => {
      setDownloadProgress(data);
    });

    // Listen for download complete
    const unsubDownloaded = window.electron.update.onDownloaded((data) => {
      setIsDownloaded(true);
      setIsDownloading(false);
      setDownloadProgress(null);
    });

    return () => {
      unsubAvailable();
      unsubProgress();
      unsubDownloaded();
    };
  }, []);

  const handleDownload = async () => {
    setIsDownloading(true);
    const result = await window.electron.update.downloadUpdate();
    if (!result.success) {
      console.error('Download failed:', result.error);
      setIsDownloading(false);
    }
  };

  const handleInstall = () => {
    window.electron.update.installUpdate();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (!updateInfo || isDismissed) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-96 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Download className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Update Available</h3>
              <p className="text-xs text-gray-400">Version {updateInfo.version}</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isDownloaded ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-300">
              Update downloaded and ready to install.
            </p>
            <button
              onClick={handleInstall}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Install & Restart
            </button>
          </div>
        ) : isDownloading ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Downloading...</span>
              <span>{downloadProgress ? Math.round(downloadProgress.percent) : 0}%</span>
            </div>
            <div className="w-full h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${downloadProgress ? downloadProgress.percent : 0}%` }}
              />
            </div>
            {downloadProgress && (
              <p className="text-xs text-gray-500">
                {(downloadProgress.transferred / 1024 / 1024).toFixed(1)} MB / {(downloadProgress.total / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-300">
              A new version is available. Download now to get the latest features and improvements.
            </p>
            <button
              onClick={handleDownload}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Update
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
