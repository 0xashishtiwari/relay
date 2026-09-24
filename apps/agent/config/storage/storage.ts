import {
    BlobServiceClient,
    BlobSASPermissions,
    generateBlobSASQueryParameters,
    StorageSharedKeyCredential,
} from "@azure/storage-blob";

const connectionString =
    process.env.AZURE_STORAGE_CONNECTION_STRING || "";

const containerName =
    process.env.AZURE_STORAGE_CONTAINER_NAME || "";

if (!connectionString) {
    throw new Error(
        "AZURE_STORAGE_CONNECTION_STRING environment variable is not set."
    );
}

if (!containerName) {
    throw new Error(
        "AZURE_STORAGE_CONTAINER_NAME environment variable is not set."
    );
}

export const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);

export const containerClient =
    blobServiceClient.getContainerClient(containerName);

export async function initializeStorage() {
    await containerClient.createIfNotExists();

    console.log(
        `Connected to Azure Blob Storage container: ${containerName}`
    );
}

function getStorageCredentials() {
    const accountNameMatch =
        connectionString.match(/AccountName=([^;]+)/);

    const accountKeyMatch =
        connectionString.match(/AccountKey=([^;]+)/);

    const accountName = accountNameMatch?.[1];
    const accountKey = accountKeyMatch?.[1];

    if (!accountName || !accountKey) {
        throw new Error(
            "Invalid Azure Storage connection string."
        );
    }

    return {
        accountName,
        accountKey,
    };
}

export function generateSasUrl(
    blobName: string,
    expiresInMinutes = 60
): string {
    const { accountName, accountKey } =
        getStorageCredentials();

    const credential =
        new StorageSharedKeyCredential(
            accountName,
            accountKey
        );

    const blobClient =
        containerClient.getBlobClient(blobName);

    // Allow for small clock differences between the app and Azure.
    const startsOn = new Date(Date.now() - 5 * 60 * 1000);

    const expiresOn = new Date(
        Date.now() +
            expiresInMinutes * 60 * 1000
    );

    const sasToken =
        generateBlobSASQueryParameters(
            {
                containerName,
                blobName,
                permissions:
                    BlobSASPermissions.parse("r"),
                startsOn,
                expiresOn,
            },
            credential
        ).toString();

    return `${blobClient.url}?${sasToken}`;
}