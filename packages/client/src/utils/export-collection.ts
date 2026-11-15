import { exportPostmanCollection } from '@internalapi/shared';
import type { Collection } from '@internalapi/shared';

/**
 * Generates a Postman Collection v2.1.0 JSON file and triggers
 * an automatic browser download for the user.
 */
export function downloadCollectionAsJson(collection: Collection): void {
  try {
    const postmanJson = exportPostmanCollection(collection);
    const jsonString = JSON.stringify(postmanJson, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const cleanName = (collection.name || 'collection').trim().replace(/[/\\?%*:|"<>]/g, '_');

    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanName}.postman_collection.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export collection:', err);
    alert('Failed to export collection. Check console for details.');
  }
}
