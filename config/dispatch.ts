import fs from 'node:fs';
import path from 'path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import fetcher from '../lib/fetcher';
import { ChangeSet } from '../types';
import { moveTriples } from '../support';
import dispatchQuad from './dispatch-quad';
import { SYNC_FILESHARE_ENDPOINT } from '../cfg';

export default async function dispatch(changesets: ChangeSet[]) {
  for (const changeset of changesets) {
    const triplesToDelete = changeset.deletes.flatMap(dispatchQuad);
    const triplesToInsert = changeset.inserts.flatMap(dispatchQuad);

    if (process.env.DOWNLOAD_SHARE_LINKS)
      await downloadShareLinks(triplesToInsert);

    await moveTriples([{
      inserts: triplesToInsert,
      deletes: triplesToDelete
    }]);
  }
}

// Private

async function downloadShareLinks(inserts: Quad[]) {
  const shareLinks = new Set<string>();

  const isShareUri = (uri: String) => uri.startsWith("share://")

  inserts
    .map((i) => i.subject.value)
    .filter(isShareUri)
    .forEach((i) => shareLinks.add(i));

  inserts
    .filter((i) => i.object.type === "uri")
    .map((i) => i.object.value)
    .filter(isShareUri)
    .forEach((i) => shareLinks.add(i));

  for (const shareLink of shareLinks)
    await downloadFile(shareLink);
}

async function downloadFile(uri: string) {
  const downloadUrl = `${SYNC_FILESHARE_ENDPOINT}?uri=${uri}`;
  const filePath = uri.replace('share://', '/share/');

  console.log(`Downloading file ${uri} from ${downloadUrl}`);
  const response = await fetcher(downloadUrl);
  if (response.ok) {
    const writeStream = fs.createWriteStream(filePath);
    await finished(Readable.fromWeb(response.body).pipe(writeStream));
  } else {
    console.error(`Failed to download file ${uri} (${response.status} ${response.statusText})`);
  }
}
