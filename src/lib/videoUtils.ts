/**
 * Extracts YouTube video ID and returns proper embed URL
 */
export function getYouTubeEmbedUrl(url: string): string {
  // Regex to extract video ID from various YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  
  return url; // Return original URL if unable to extract
}

/**
 * Checks if a URL is a YouTube video
 */
export function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * Extracts iframe src attribute from HTML string
 */
export function extractIframeSrc(htmlString: string): string | null {
  const srcMatch = htmlString.match(/src=["']([^"']+)["']/);
  return srcMatch ? srcMatch[1] : null;
}

/**
 * Checks if a URL is a Google Drive video
 */
export function isGoogleDriveUrl(url: string): boolean {
  return url.includes('drive.google.com') || url.includes('<iframe');
}

/**
 * Extracts Google Drive file ID and returns proper embed URL
 * Supports:
 * - Full iframes: <iframe src="https://drive.google.com/file/d/FILE_ID/preview"...
 * - Direct URLs: https://drive.google.com/file/d/FILE_ID/view
 * - Embed URLs: https://drive.google.com/file/d/FILE_ID/preview
 */
export function getGoogleDriveEmbedUrl(url: string): string {
  // If it's an iframe string, extract the src
  if (url.includes('<iframe')) {
    const src = extractIframeSrc(url);
    if (src) {
      url = src;
    }
  }
  
  // Extract file ID from various Google Drive URL formats
  const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  
  if (fileIdMatch && fileIdMatch[1]) {
    return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
  }
  
  return url; // Return original URL if unable to extract
}
