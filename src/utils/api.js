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
      
      if (response.status === 429) {
        RATE_LIMIT.backoffTime *= 2;
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.backoffTime));
        return this.executeRequest(request);
      }
      
      RATE_LIMIT.backoffTime = 1000;
      return response.json();
    } catch (error) {
      throw error;
    }
  }
}

const apiQueue = new APIQueue();

export const fetchCodeforcesSubmissions = async (handle) => {
  const cacheKey = `codeforces-${handle}`;
  const now = Date.now();
  const cachedData = API_CACHE.data.get(cacheKey);
  const cachedTimestamp = API_CACHE.timestamps.get(cacheKey);

  if (cachedData && cachedTimestamp && now - cachedTimestamp < 300000) {
    return cachedData;
  }

  try {
    const data = await apiQueue.add({
      url: `https://codeforces.com/api/user.status?handle=${handle}`
    });

    API_CACHE.data.set(cacheKey, data);
    API_CACHE.timestamps.set(cacheKey, now);

    return data;
  } catch (error) {
    console.error(`Error fetching Codeforces data for ${handle}:`, error);
    return cachedData || { result: [] };
  }
};
