import {containerClient} from './storage';

export async function deleteFile(blobName : string) {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    
    return await blockBlobClient.deleteIfExists();
}