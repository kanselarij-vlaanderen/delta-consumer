import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import path from 'path';
import {
    DELTA_FILE_FOLDER, DOWNLOAD_FILE_ENDPOINT, KEEP_DELTA_FILES
} from '../cfg';
import fetcher from './fetcher';
import changesetTransformer from '../config/changeset-transformer';

fs.mkdirSync(DELTA_FILE_FOLDER, { recursive: true });

export default class DeltaFile {

  constructor(data) {
    /** Id of the delta file */
    this.id = data.id;
    /** Creation datetime of the delta file */
    this.created = data.attributes.created;
    /** Name of the delta file */
    this.name = data.attributes.name;
  }

  /**
   * Public endpoint to download the delta file from based on its id
   */
  get downloadUrl() {
    return DOWNLOAD_FILE_ENDPOINT.replace(':id', this.id);
  }

  /**
   * Location to store the delta file during processing
   */
  get filePath() {
    return path.join(DELTA_FILE_FOLDER,`${this.created}-${this.id}.json`);
  }

  /**
   * Downloads the delta file from the producer.
   *
   * @return Resulting json object.
   */
  async download() {
    try {
      const res = await fetcher(this.downloadUrl);

      if (res.ok) {
        let json;
        if (KEEP_DELTA_FILES) {
          const writeStream = fs.createWriteStream(this.filePath);
          await finished(Readable.fromWeb(res.body).pipe(writeStream));
          json = JSON.parse(await readFile(this.filePath));
        } else {
          json = await res.json();
        }
        return json.map(changesetTransformer);
      } else {
        throw `Producer did not yield successful response code: ${res.status} ${res.statusText}`;
      }
    } catch(e) {
      console.log(`Something went wrong while downloading file from ${this.downloadUrl}`);
      console.log(e);
      throw e;
    }
  }
}
