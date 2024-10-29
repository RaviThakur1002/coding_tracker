// src/utils/api.js

const API_CACHE = {
  data: new Map(),
  timestamps: new Map()
};

const RATE_LIMIT = {
  maxRequests: 100,
  timeWindow: 2000,
  requests: [],
  backoffTime: 1000,
};

class APIQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  async add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const { request, resolve, reject } = this.queue.shift();

    try {
      await this.waitForRateLimit();
      const result = await this.executeRequest(request);
      resolve(result);
    } catch (error) {
      reject(error);
    }

    this.processQueue();
  }

  async waitForRateLimit() {
    const now = Date.now();
    RATE_LIMIT.requests = RATE_LIMIT.requests.filter(time => now - time < RATE_LIMIT.timeWindow);
    
    if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequests) {
      const oldestRequest = RATE_LIMIT.requests[0];
      const waitTime = RATE_LIMIT.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    RATE_LIMIT.requests.push(now);
  }

  async executeRequest(request) {
    try {
      const response = await fetch(request.url);
      
      if (!response.ok) {
        if (response.status === 429) {
          RATE_LIMIT.backoffTime *= 2;
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.backoffTime));
          return this.executeRequest(request);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      RATE_LIMIT.backoffTime = 1000;
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}

const apiQueue = new APIQueue();

export const fetchCodeforcesSubmissions = async (handle) => {
  if (!handle) {
    throw new Error('Codeforces handle is required');
  }

  const cacheKey = `codeforces-${handle}`;
  const now = Date.now();
  const cachedData = API_CACHE.data.get(cacheKey);
  const cachedTimestamp = API_CACHE.timestamps.get(cacheKey);

  if (cachedData && cachedTimestamp && now - cachedTimestamp < 300000) {
    return cachedData;
  }

  try {
    const data = await apiQueue.add({
      url: `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`
    });

    if (data.status === 'FAILED') {
      throw new Error(data.comment || 'Codeforces API request failed');
    }

    API_CACHE.data.set(cacheKey, data);
    API_CACHE.timestamps.set(cacheKey, now);

    return data;
  } catch (error) {
    console.error(`Error fetching Codeforces data for ${handle}:`, error);
    if (cachedData) {
      return cachedData;
    }
    return { result: [] };
  }
};

export const fetchLeetCodeSubmissions = async (handle) => {
  if (!handle) {
    throw new Error('LeetCode handle is required');
  }

  const cacheKey = `leetcode-${handle}`;
  const now = Date.now();
  const cachedData = API_CACHE.data.get(cacheKey);
  const cachedTimestamp = API_CACHE.timestamps.get(cacheKey);

  if (cachedData && cachedTimestamp && now - cachedTimestamp < 300000) {
    return cachedData;
  }

  try {
    const data = await apiQueue.add({
      url: `https://leetcode-api-faisalshohag.vercel.app/${encodeURIComponent(handle)}`
    });

    // Validate the response has the expected structure
    if (!data || !Array.isArray(data.recentSubmissions)) {
      throw new Error('Invalid LeetCode API response format');
    }

    API_CACHE.data.set(cacheKey, data);
    API_CACHE.timestamps.set(cacheKey, now);

    return data;
  } catch (error) {
    console.error(`Error fetching LeetCode data for ${handle}:`, error);
    if (cachedData) {
      return cachedData;
    }
    return { recentSubmissions: [] };
  }
};

// Helper function to get today's submissions count
export const getSubmissionsCount = (submissions, platform = 'codeforces') => {
  const today = new Date().setHours(0, 0, 0, 0);

  if (platform === 'codeforces') {
    return submissions.filter(sub => {
      const submissionDate = new Date(sub.creationTimeSeconds * 1000).setHours(0, 0, 0, 0);
      return sub.verdict === 'OK' && submissionDate === today;
    }).length;
  } else if (platform === 'leetcode') {
    return submissions.filter(sub => {
      const timestamp = sub.timestamp.length <= 10 ? sub.timestamp * 1000 : sub.timestamp;
      const submissionDate = new Date(parseInt(timestamp)).setHours(0, 0, 0, 0);
      return sub.statusDisplay === 'Accepted' && submissionDate === today;
    }).length;
  }

  return 0;
};