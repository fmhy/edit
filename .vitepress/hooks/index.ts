/**
 * This file serves as a barrel for exporting various modules related to metadata generation.
 * It utilizes the `@taskylizard/tasker` tool for barrel generation.
 *
 * The following modules are re-exported from their respective files:
 * - meta: Contains functions for generating metadata relevant to the entire website.
 * - opengraph: Contains functions for generating Open Graph metadata for individual pages.
 * - rss: Contains functions for generating RSS feed metadata.
 * - satoriConfig: Contains configuration settings for the Satori metadata generation tool.
 */

export * from './meta'
export * from './opengraph'
export * from './rss'
export * from './satoriConfig'

