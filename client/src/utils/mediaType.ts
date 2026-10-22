import { frontendConfig } from '@config/frontend.config';

export type MediaKind = 'image' | 'gif' | 'video';

/**
 * Determines media type from filename
 * @param {string} filename - Name of the media file
 * @returns {MediaKind} Media type
 */
export const getMediaType = (filename: string): MediaKind => {
  if (!filename) return 'image';
  const extension = filename.toLowerCase().split('.').pop() || '';
  if (extension === 'gif') return 'gif';
  if (frontendConfig.mediaTypes.videoTypes.some((type: string) => type.includes(extension))) return 'video';
  return 'image';
};
