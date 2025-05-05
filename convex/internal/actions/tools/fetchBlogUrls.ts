import { internalAction } from '../../../_generated/server'; // Corrected path
import { v } from 'convex/values';
import { z } from 'zod';
import fetch from 'node-fetch'; // Using node-fetch
import * as cheerio from 'cheerio'; // Using cheerio

// Input validation schema
const QuerySchema = z.string().min(1, 'Query must not be empty');

// Output validation schema
const UrlListSchema = z.array(z.string().url());

// Configuration constants
const SEARCH_ENGINE = 'google'; // Can be 'google' or 'bing'
const MAX_RESULTS = 5;
const SEARCH_URLS = {
  google: 'https://www.google.com/search?q={}',
  bing: 'https://www.bing.com/search?q={}',
};

// Helper function to encode query with filters
function encodeQuery(query: string): string {
  // Example filters: prioritize .edu/.org, exclude common non-content pages
  const filters = ' site:*.edu | site:*.org | site:*.com -inurl:(signup|login|shop|product|cart)';
  return encodeURIComponent(`${query}${filters}`);
}

// Main action to fetch blog URLs
export const fetchBlogUrls = internalAction({
  args: {
    query: v.string(),
  },
  handler: async (_ctx, args): Promise<string[]> => { // Return type is string[]
    // Validate input
    try {
      QuerySchema.parse(args.query);
    } catch (error) {
      const message = error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : 'Unknown validation error';
      console.error('Invalid query:', message);
      throw new Error(`Invalid query: ${message}`); // Throw for workflow handling
    }

    console.log(`Workspaceing blog URLs for query: "${args.query}"`);

    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY;
    if (!scrapflyApiKey) {
      console.error('SCRAPFLY_API_KEY is not set');
      throw new Error('Configuration error: Missing SCRAPFLY_API_KEY'); // Throw for workflow handling
    }

    const baseUrl = SEARCH_URLS[SEARCH_ENGINE];
    const encodedQuery = encodeQuery(args.query);
    const searchUrl = baseUrl.replace('{}', encodedQuery);

    // Define Scrapfly configurations to try
    const configs = [
      { renderJs: true, asp: true, country: 'US' }, // JS rendering, ASP enabled
      { renderJs: false, asp: true, country: 'US' }, // No JS, ASP enabled
      { renderJs: false, asp: false, country: 'US' }, // Basic scrape
    ];

    let results: string[] = [];

    for (let attempt = 0; attempt < configs.length; attempt++) {
      const config = configs[attempt];
      console.log(`Attempt ${attempt + 1}/${configs.length} using config: ${JSON.stringify(config)}`);

      try {
        // Construct Scrapfly API URL for this attempt
        const scrapflyUrl = `https://api.scrapfly.io/scrape?key=${scrapflyApiKey}&url=${encodeURIComponent(searchUrl)}&render_js=${config.renderJs}&asp=${config.asp}&country=${config.country}&cache=true`;

        const response = await fetch(scrapflyUrl);

        if (!response.ok) {
          console.warn(`Scrapfly request failed (Attempt ${attempt + 1}) with status: ${response.status}`);
          continue; // Try next configuration
        }

        const data = await response.json() as any; // Use 'any' carefully or define a ScrapflyResponse type

        // Basic check on Scrapfly response structure
        if (!data?.result?.content) {
            console.warn(`Scrapfly response (Attempt ${attempt + 1}) missing result.content`);
            continue;
        }

        console.log(`Scrapfly response status (Attempt ${attempt + 1}): ${data.result.status_code || 'N/A'}`);
        const htmlContent = data.result.content;
        const $ = cheerio.load(htmlContent);

        const linkElements: { href: string; title: string }[] = [];

        // Common selectors for Google/Bing search results
        const selectors = [
          'div[data-ved] a[href^="http"]', // Google specific structure
          'div.g a[href^="http"]',         // General Google structure
          'li.b_algo a[href^="http"]',     // Bing specific structure
          'a[href][ping]',                 // Links with tracking pings
        ];

        selectors.forEach((selector) => {
          $(selector).each((_, elem) => {
            const href = $(elem).attr('href') || '';
            let title = '';

            // Try finding title within common heading tags inside or near the link
            const titleElem = $(elem).find('h3, h2').first();
            if (titleElem.length) {
              title = titleElem.text().trim();
            } else {
              // Look broader if title not directly inside
              const parentHeadings = $(elem).closest('div, li').find('h3, h2').first();
              title = parentHeadings.length ? parentHeadings.text().trim() : $(elem).text().trim();
            }

            // Truncate long titles
            if (title.length > 200) {
              title = title.slice(0, 200) + '...';
            }
            linkElements.push({ href, title });
          });
        });

        console.log(`Found ${linkElements.length} potential links in attempt ${attempt + 1}`);

        const seenUrls = new Set<string>();
        for (const link of linkElements) {
          let cleanUrl = link.href;

          // Clean Google redirect URLs
          if (cleanUrl.includes('/url?q=')) {
            try {
                const urlParams = new URLSearchParams(cleanUrl.split('?')[1]);
                const targetUrl = urlParams.get('q');
                if (targetUrl) {
                    cleanUrl = targetUrl;
                }
            } catch (e) {
                // Ignore invalid URL parameters
            }
          }
          // Decode URL just in case
          cleanUrl = decodeURIComponent(cleanUrl);

          // Validate and filter URL
          if (
            (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) &&
            !seenUrls.has(cleanUrl) &&
            !cleanUrl.toLowerCase().includes('google.com') &&
            !cleanUrl.toLowerCase().includes('bing.com') &&
            !cleanUrl.toLowerCase().includes('microsoft.com') &&
            !cleanUrl.toLowerCase().includes('/search?') && // Exclude search result pages
            !cleanUrl.toLowerCase().includes('/signup') &&
            !cleanUrl.toLowerCase().includes('/login') &&
            !cleanUrl.toLowerCase().includes('/shop') &&
            !cleanUrl.toLowerCase().includes('/product') &&
            !cleanUrl.toLowerCase().includes('/cart') &&
            link.title // Require some extracted title text
          ) {
            results.push(cleanUrl);
            seenUrls.add(cleanUrl);
          }

          if (results.length >= MAX_RESULTS) {
            break; // Stop once we have enough results
          }
        }

        if (results.length >= MAX_RESULTS) {
          console.log(`Reached MAX_RESULTS (${MAX_RESULTS}) in attempt ${attempt + 1}.`);
          break; // Exit the loop if enough results are found
        }

      } catch (error) {
        console.error(`Error during Scrapfly request or parsing (Attempt ${attempt + 1}):`, error);
        // Continue to next attempt
      }
    }

    if (results.length === 0) {
        console.warn('All scraping attempts failed or yielded no valid URLs.');
    }

    // Validate output before returning
    try {
      const validatedResults = UrlListSchema.parse(results.slice(0, MAX_RESULTS));
      console.log(`Final validated URLs (${validatedResults.length}):`, validatedResults);
      return validatedResults;
    } catch (error) {
      console.error('Output validation failed:', error);
      // Return empty array or throw, depending on desired workflow behavior
      return [];
    }
  },
});