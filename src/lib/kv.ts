import { kv } from "@vercel/kv";
import type { Edition, EditionSummary } from "@/types/edition";
import { getEditionKey, getTodayDateString } from "@/types/edition";

const EDITIONS_INDEX_KEY = "editions:index";
const LATEST_EDITION_KEY = "edition:latest";

// Check if KV is configured
const isKVConfigured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// In-memory fallback for local development
const localStore: Map<string, unknown> = new Map();

// Wrapper for KV operations with local fallback
const storage = {
  async get<T>(key: string): Promise<T | null> {
    if (isKVConfigured) {
      return kv.get<T>(key);
    }
    return (localStore.get(key) as T) ?? null;
  },
  async set<T>(key: string, value: T): Promise<void> {
    if (isKVConfigured) {
      await kv.set(key, value);
    } else {
      localStore.set(key, value);
    }
  },
  async del(key: string): Promise<void> {
    if (isKVConfigured) {
      await kv.del(key);
    } else {
      localStore.delete(key);
    }
  },
  async exists(key: string): Promise<number> {
    if (isKVConfigured) {
      return kv.exists(key);
    }
    return localStore.has(key) ? 1 : 0;
  },
};

/**
 * Get an edition by date
 */
export async function getEdition(date: string): Promise<Edition | null> {
  try {
    const edition = await storage.get<Edition>(getEditionKey(date));
    return edition;
  } catch (error) {
    console.error(`Error fetching edition for ${date}:`, error);
    return null;
  }
}

/**
 * Get today's edition, or fallback to the latest available
 */
export async function getTodayEdition(): Promise<Edition | null> {
  const today = getTodayDateString();
  
  // Try to get today's edition
  const todayEdition = await getEdition(today);
  if (todayEdition) {
    return todayEdition;
  }
  
  // Fallback to latest edition
  return getLatestEdition();
}

/**
 * Get the most recent edition
 */
export async function getLatestEdition(): Promise<Edition | null> {
  try {
    const latestDate = await storage.get<string>(LATEST_EDITION_KEY);
    if (!latestDate) {
      return null;
    }
    return getEdition(latestDate);
  } catch (error) {
    console.error("Error fetching latest edition:", error);
    return null;
  }
}

/**
 * Save a new edition
 */
export async function saveEdition(edition: Edition): Promise<boolean> {
  try {
    const key = getEditionKey(edition.date);
    
    // Save the edition
    await storage.set(key, edition);
    
    // Update the latest edition pointer
    await storage.set(LATEST_EDITION_KEY, edition.date);
    
    // Add to the editions index
    await addToEditionsIndex(edition);
    
    console.log(`Edition saved${isKVConfigured ? " to KV" : " to local memory (dev mode)"}`);
    return true;
  } catch (error) {
    console.error("Error saving edition:", error);
    return false;
  }
}

/**
 * Add edition to the searchable index
 */
async function addToEditionsIndex(edition: Edition): Promise<void> {
  const summary: EditionSummary = {
    date: edition.date,
    articleCount: edition.articles.length,
    leadHeadline:
      edition.articles.find((a) => a.isLeadStory)?.headline ||
      edition.articles[0]?.headline ||
      "No headline",
  };
  
  // Get existing index
  const existingIndex = await storage.get<EditionSummary[]>(EDITIONS_INDEX_KEY);
  const index = existingIndex || [];
  
  // Check if this date already exists
  const existingIdx = index.findIndex((e) => e.date === edition.date);
  if (existingIdx >= 0) {
    index[existingIdx] = summary;
  } else {
    index.unshift(summary); // Add to beginning (most recent first)
  }
  
  // Keep only last 365 days
  const trimmedIndex = index.slice(0, 365);
  
  await storage.set(EDITIONS_INDEX_KEY, trimmedIndex);
}

/**
 * Get all edition summaries for archives
 */
export async function getEditionsSummary(): Promise<EditionSummary[]> {
  try {
    const index = await storage.get<EditionSummary[]>(EDITIONS_INDEX_KEY);
    return index || [];
  } catch (error) {
    console.error("Error fetching editions index:", error);
    return [];
  }
}

/**
 * Check if an edition exists for a given date
 */
export async function editionExists(date: string): Promise<boolean> {
  try {
    const exists = await storage.exists(getEditionKey(date));
    return exists > 0;
  } catch (error) {
    console.error(`Error checking edition existence for ${date}:`, error);
    return false;
  }
}

/**
 * Delete an entire edition
 */
export async function deleteEdition(date: string): Promise<boolean> {
  try {
    const key = getEditionKey(date);
    await storage.del(key);
    
    // Remove from index
    const index = await storage.get<EditionSummary[]>(EDITIONS_INDEX_KEY);
    if (index) {
      const filtered = index.filter((e) => e.date !== date);
      await storage.set(EDITIONS_INDEX_KEY, filtered);
    }
    
    // If this was the latest, find the new latest
    const latestDate = await storage.get<string>(LATEST_EDITION_KEY);
    if (latestDate === date) {
      const newIndex = await storage.get<EditionSummary[]>(EDITIONS_INDEX_KEY);
      if (newIndex && newIndex.length > 0) {
        await storage.set(LATEST_EDITION_KEY, newIndex[0].date);
      }
    }
    
    console.log(`Edition ${date} deleted`);
    return true;
  } catch (error) {
    console.error(`Error deleting edition ${date}:`, error);
    return false;
  }
}

/**
 * Delete a single article from an edition
 */
export async function deleteArticle(date: string, articleId: string): Promise<boolean> {
  try {
    const edition = await getEdition(date);
    if (!edition) {
      return false;
    }
    
    const originalCount = edition.articles.length;
    edition.articles = edition.articles.filter((a) => a.id !== articleId);
    
    if (edition.articles.length === originalCount) {
      return false; // Article not found
    }
    
    // If we deleted the lead story, promote the first article
    if (!edition.articles.some((a) => a.isLeadStory) && edition.articles.length > 0) {
      edition.articles[0].isLeadStory = true;
    }
    
    await saveEdition(edition);
    console.log(`Article ${articleId} deleted from edition ${date}`);
    return true;
  } catch (error) {
    console.error(`Error deleting article ${articleId} from ${date}:`, error);
    return false;
  }
}
