import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { PlaylistItem } from '@/types/media'; // Assuming File is stored directly

const DB_NAME = 'AudiusVisualHubDB';
const DB_VERSION = 1;
const STORE_NAME = 'playlistItems';

interface MyDB extends DBSchema {
    [STORE_NAME]: {
        key: string; // Use PlaylistItem['id'] as the key
        value: File; // Store the actual File object
    };
}

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

function getDB(): Promise<IDBPDatabase<MyDB>> {
    if (!dbPromise) {
        dbPromise = openDB<MyDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME); // Key is provided separately
                    console.log(`Object store "${STORE_NAME}" created.`);
                }
                // Handle future upgrades here if needed
            },
        });
    }
    return dbPromise;
}

export async function savePlaylistItem(id: string, file: File): Promise<void> {
    try {
        const db = await getDB();
        await db.put(STORE_NAME, file, id);
        console.log(`Saved item ${id} to IndexedDB`);
    } catch (error) {
        console.error(`Failed to save item ${id} to IndexedDB:`, error);
        // Optionally show a toast error
    }
}

export async function getPlaylistItem(id: string): Promise<File | undefined> {
    try {
        const db = await getDB();
        return await db.get(STORE_NAME, id);
    } catch (error) {
        console.error(`Failed to get item ${id} from IndexedDB:`, error);
        return undefined;
    }
}

export async function getAllPlaylistItems(): Promise<{ id: string; file: File }[]> {
    try {
        const db = await getDB();
        const keys = await db.getAllKeys(STORE_NAME);
        const files = await db.getAll(STORE_NAME);
        // Combine keys and files, assuming order matches (usually does)
        return keys.map((key, index) => ({ id: key, file: files[index] }));
    } catch (error) {
        console.error('Failed to get all items from IndexedDB:', error);
        return [];
    }
}

export async function deletePlaylistItem(id: string): Promise<void> {
    try {
        const db = await getDB();
        await db.delete(STORE_NAME, id);
        console.log(`Deleted item ${id} from IndexedDB`);
    } catch (error) {
        console.error(`Failed to delete item ${id} from IndexedDB:`, error);
    }
}

export async function clearPlaylistItems(): Promise<void> {
    try {
        const db = await getDB();
        await db.clear(STORE_NAME);
        console.log(`Cleared all items from "${STORE_NAME}" store.`);
    } catch (error) {
        console.error('Failed to clear IndexedDB store:', error);
    }
}