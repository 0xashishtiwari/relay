import {containerClient} from './storage';

interface UploadFileParams {
    buffer : Buffer;
    blobName : string;
    contentType : string;
}

export async function uploadFile({ buffer, blobName, contentType } : UploadFileParams) {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined
    });
    
    return {
        blobName: blobName,
        url: blockBlobClient.url
    }
}