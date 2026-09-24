import {containerClient} from './storage';

export async function downloadFile(blobName: string) {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const response = await blockBlobClient.download();

    if(!response.readableStreamBody){
        throw new Error(`Failed to download blob: ${blobName}`);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of response.readableStreamBody) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
}