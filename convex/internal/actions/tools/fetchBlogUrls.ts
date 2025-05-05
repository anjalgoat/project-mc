import { internalAction } from '../_generated/server';
import { v } from 'convex/values';
import { z } from 'zod';
import fetch from 'node-fetch';
import cheerio from 'cheerio';

// Input validation schema
const QuerySchema = z.string().min(1, 'Query must not be empty');

// Output validation schema
const UrlListSchema = z.array(z.string().url());

// Configuration constants
const SEARCH_ENGINE = 'google';
const MAX_RESULTS = 5;
const SEARCH_URLS = {
  google: 'https://www.google.com/search?q={}',
  bing: 'https://www.bing.com/search?q={}',
};

// Helper function to encode query with filters
function encodeQuery(query: string): string {
  const filters = ' site:*.edu | site:*.org | site:*.com -inurl:(signup | login | shop)';
  return encodeURIComponent(`${query}${filters}`);
}

// Main action to fetch blog URLs
export const fetchBlogUrls = internalAction({
  args: {
    query: v.string(),
  },
  handler: async (_ctx, args) => {
    // Validate input
    try {
      QuerySchema.parse(args.query);
    } catch (error) {
      console.error('Invalid query:', error);
      return [];
    }

    console.log(`Fetching blog URLs for query: ${args.query}`);

    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY;
    if (!scrapflyApiKey) {
      console.error('SCRAPFLY_API_KEY is not set');
      return [];
    }

    const baseUrl = SEARCH_URLS[SEARCH_ENGINE];
    const encodedQuery = encodeQuery(args.query);
    const url = baseUrl.replace('{}', encodedQuery);

    const configs = [
      { renderJs: true, asp: true },
      { renderJs: false, asp: true },
      { renderJs: false, asp: false },
    ];

    let results: string[] = [];

    for (let attempt = 0; attempt < configs.length; attempt++) {
      const config = configs[attempt];
      console.log(`Attempt ${attempt + 1} with config:`, config);

      try {
        const scrapflyUrl = `https://api.scrapfly.io/scrape?key=${scrapflyApiKey}&url=${encodeURIComponent(url)}&render_js=${config.renderJs}&asp=${config.asp}&country=US&cache=true`;
        const response = await fetch(scrapflyUrl);

        if (!response.ok) {
          console.warn(`Scrapfly request failed with status: ${response.status}`);
          continue;
        }

        const data = await response.json();
        console.log(`Scrapfly response status: ${data.result.status_code}`);

        const $ = cheerio.load(data.result.content);

        const linkElements: { href: string; title: string }[] = [];
        const selectors = [
          'div[data-ved] a[href^="http"]',
          'div.g a[href^="http"]',
          'li.b_algo a[href^="http"]',
        ];

        selectors.forEach((selector) => {
          $(selector).each((_, elem) => {
            const href = $(elem).attr('href') || '';
            let title = '';
            const titleElem = $(elem).find('h3, h2').first();
            if (titleElem.length) {
              title = titleElem.text().trim();
            } else {
              const parent = $(elem).parent().find('h3, h2').first();
              title = parent.length ? parent.text().trim() : $(elem).text().trim();
            }
            if (title.length > 200) {
              title = title.slice(0, 200) + '...';
            }
            linkElements.push({ href, title });
          });
        });

        console.log(`Found ${linkElements.length} potential links`);

        for (const link of linkElements) {
          let cleanUrl = link.href;
          if (cleanUrl.includes('/url?q=')) {
            cleanUrl = decodeURIComponent(cleanUrl.split('/url?q=')[1].split('&')[0]);
          }

          if (
            cleanUrl.startsWith('http://') ||
            cleanUrl.startsWith('https://') &&
            !cleanUrl.toLowerCase().includes('google.com') &&
            !cleanUrl.toLowerCase().includes('bing.com') &&
            !cleanUrl.toLowerCase().includes('/signup') &&
            !cleanUrl.toLowerCase().includes('/login') &&
            !cleanUrl.toLowerCase().includes('/shop/') &&
            !cleanUrl.toLowerCase().includes('/product') &&
            link.title
          ) {
            results.push(cleanUrl);
          }

          if (results.length >= MAX_RESULTS) {
            break;
          }
        }

        if (results.length > 0) {
          break;
        }

      } catch (error) {
        console.error(`Error in attempt ${attempt + 1}:`, error);
        if (attempt === configs.length - 1) {
          console.warn('All attempts failed');
        }
      }
    }

    // Validate output
    try {
      const validatedResults = UrlListSchema.parse(results.slice(0, MAX_RESULTS));
      console.log('Final validated results:', validatedResults);
      return validatedResults;
    } catch (error) {
      console.error('Output validation failed:', error);
      return [];
    }
  },
});